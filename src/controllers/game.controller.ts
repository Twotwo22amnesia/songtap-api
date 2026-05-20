import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import * as GameService from '../services/game.service'
import { GameMode } from '../entities/Game'
import * as RealtimeService from '../services/realtime.service'

export const createGame = async (req: AuthRequest, res: Response) => {
  try {
    const { mode, totalRounds, hintSeconds, region } = req.body
    const hostId = req.userId!

    if (!mode || !['presencial', 'remoto', 'ai_dj'].includes(mode)) {
      res.status(400).json({ error: 'Modo inválido. Usa: presencial, remoto, ai_dj' })
      return
    }

    const game = await GameService.createGame(
      hostId,
      mode as GameMode,
      totalRounds || 10,
      hintSeconds || 10,
      region
    )

    res.status(201).json({
      id: game.id,
      roomCode: game.roomCode,
      mode: game.mode,
      status: game.status,
      totalRounds: game.totalRounds,
      hintSeconds: game.hintSeconds,
      region: game.region,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const joinGame = async (req: AuthRequest, res: Response) => {
  try {
    const { roomCode, nickname, avatarEmoji } = req.body
    const userId = req.userId

    if (!roomCode || !nickname) {
      res.status(400).json({ error: 'roomCode y nickname son requeridos' })
      return
    }

    const { player, game } = await GameService.joinGame(
      roomCode,
      nickname,
      avatarEmoji || '🎵',
      userId
    )

    // emitir evento en tiempo real
    await RealtimeService.emitPlayerJoined(game.roomCode, {
      id: player.id,
      nickname: player.nickname,
      avatarEmoji: player.avatarEmoji,
    })

    res.status(201).json({
      playerId: player.id,
      nickname: player.nickname,
      avatarEmoji: player.avatarEmoji,
      gameId: game.id,
      roomCode: game.roomCode,
      mode: game.mode,
      totalRounds: game.totalRounds,
    })
  } catch (error: any) {
    const status = error.message === 'Sala no encontrada' ? 404
      : error.message === 'La partida ya comenzó' ? 409
      : error.message === 'Sala llena' ? 409
      : 500
    res.status(status).json({ error: error.message })
  }
}

export const getGame = async (req: AuthRequest, res: Response) => {
  try {
    const roomCode = req.params.roomCode as string
    const game = await GameService.getGameByCode(roomCode)

    if (!game) {
      res.status(404).json({ error: 'Sala no encontrada' })
      return
    }

    // intentar obtener estado en vivo desde Redis
    const liveState = await GameService.getGameState(game.id)

    res.json({
      id: game.id,
      roomCode: game.roomCode,
      mode: game.mode,
      status: liveState?.status || game.status,
      currentRound: liveState?.currentRound || game.currentRound,
      totalRounds: game.totalRounds,
      hintSeconds: game.hintSeconds,
      host: {
        id: game.host.id,
        username: game.host.username,
      },
      players: liveState?.players || game.players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatarEmoji: p.avatarEmoji,
        score: p.score,
        isConnected: p.isConnected,
      })),
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}