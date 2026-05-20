import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import * as BuzzerService from '../services/buzzer.service'
import * as RealtimeService from '../services/realtime.service'
import { AppDataSource } from '../config/database'
import { Game } from '../entities/Game'
import { Player } from '../entities/Player'

export const pressBuzzer = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, playerId, round } = req.body

    if (!gameId || !playerId || !round) {
      res.status(400).json({ error: 'gameId, playerId y round son requeridos' })
      return
    }

    const result = await BuzzerService.pressBuzzer(gameId, playerId, round)

    const game = await AppDataSource.getRepository(Game).findOne({ where: { id: gameId } })
    const player = await AppDataSource.getRepository(Player).findOne({ where: { id: playerId } })

    if (game && player) {
      await RealtimeService.emitBuzzerPressed(game.roomCode, {
        playerId,
        nickname: player.nickname,
        position: result.position,
        timestamp: result.timestamp,
      })
    }

    res.json({
      position: result.position,
      timestamp: result.timestamp,
      message: result.position === 1 ? '¡Primero!' : `#${result.position}`,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const getBuzzerOrder = async (req: AuthRequest, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId as string)
    const round = parseInt(req.params.round as string)

    const order = await BuzzerService.getBuzzerOrder(gameId, round)
    res.json(order)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const assignPoints = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, playerId, round, points, roundType, songTitle, songArtist, responseText } = req.body

    if (!gameId || !playerId || round === undefined || points === undefined) {
      res.status(400).json({ error: 'gameId, playerId, round y points son requeridos' })
      return
    }

    const result = await BuzzerService.assignPoints(
      gameId, playerId, round, points,
      roundType || 'title', songTitle || '', songArtist || '', responseText
    )

    const game = await AppDataSource.getRepository(Game).findOne({ where: { id: gameId } })
    const player = await AppDataSource.getRepository(Player).findOne({ where: { id: playerId } })

    if (game && player) {
      await RealtimeService.emitPointsAssigned(game.roomCode, {
        playerId,
        nickname: player.nickname,
        points,
        totalScore: result.totalScore,
      })
    }

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const advanceRound = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.body

    if (!gameId) {
      res.status(400).json({ error: 'gameId es requerido' })
      return
    }

    const result = await BuzzerService.advanceRound(gameId)

    const game = await AppDataSource.getRepository(Game).findOne({ where: { id: gameId } })
    if (game) {
      await RealtimeService.emitRoundAdvanced(game.roomCode, {
        currentRound: result.currentRound,
        totalRounds: game.totalRounds,
        status: result.status,
      })
    }

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}