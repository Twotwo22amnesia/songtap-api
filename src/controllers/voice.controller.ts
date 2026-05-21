import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import * as VoiceService from '../services/voice.service'

export const getVoiceToken = async (req: AuthRequest, res: Response) => {
  try {
    const { roomCode, playerId, nickname, role } = req.body

    if (!roomCode || !playerId === undefined || !nickname) {
      res.status(400).json({ error: 'roomCode, playerId y nickname son requeridos' })
      return
    }

    const result = await VoiceService.createVoiceToken(
      roomCode,
      playerId.toString(),
      nickname,
      role || 'player'
    )

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomCode } = req.body

    if (!roomCode) {
      res.status(400).json({ error: 'roomCode es requerido' })
      return
    }

    await VoiceService.createVoiceRoom(roomCode)
    res.json({ success: true, room: `voice:${roomCode}` })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const controlVoice = async (req: AuthRequest, res: Response) => {
  try {
    const { roomCode, mode, activePlayerId } = req.body

    if (!roomCode || !mode) {
      res.status(400).json({ error: 'roomCode y mode son requeridos' })
      return
    }

    if (mode === 'open') {
      // entre rondas — todos hablan
      await VoiceService.openVoiceForAll(roomCode)
    } else if (mode === 'player' && activePlayerId) {
      // durante ronda — solo el jugador activo
      await VoiceService.openVoiceForPlayer(roomCode, activePlayerId.toString())
    }

    res.json({ success: true, mode })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const getParticipants = async (req: AuthRequest, res: Response) => {
  try {
    const roomCode = req.params.roomCode as string
    const participants = await VoiceService.listVoiceParticipants(roomCode)
    res.json({ participants })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}