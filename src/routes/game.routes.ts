import { Router } from 'express'
import { createGame, joinGame, getGame } from '../controllers/game.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as RealtimeService from '../services/realtime.service'

const router = Router()

router.post('/create', authMiddleware, createGame)
router.post('/join', joinGame)
router.get('/:roomCode', getGame)
router.post('/track', authMiddleware, async (req, res) => {
  try {
    const { gameId, roomCode, previewUrl, hintSeconds } = req.body
    
    const startAt = Date.now() + 3000

    await RealtimeService.emitTrackSelected(roomCode, {
      mode: 'remoto',
      hintSeconds: hintSeconds || 10,
      previewUrl: previewUrl || null,
      startAt,
    })
    res.json({ success: true, startAt })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/reveal', authMiddleware, async (req, res) => {
  try {
    const { roomCode, title, artist, albumArt, year } = req.body
    await RealtimeService.emitTrackRevealed(roomCode, {
      title, artist, albumArt, year
    })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/audio-control', authMiddleware, async (req, res) => {
  try {
    const { roomCode, action } = req.body
    await RealtimeService.publish(roomCode, 'AUDIO_CONTROL', { action })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/close', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.body
    // emitir evento a todos los jugadores
    await RealtimeService.publish(roomCode, 'ROOM_CLOSED', { reason: 'DJ cerró la sala' })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/answer', async (req, res) => {
  try {
    const { roomCode, playerId, nickname, answer, round } = req.body
    await RealtimeService.publish(roomCode, 'PLAYER_ANSWER', {
      playerId,
      nickname,
      answer,
      round,
    })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/enable-player', authMiddleware, async (req, res) => {
  try {
    const { roomCode, playerId, nickname } = req.body
    await RealtimeService.publish(roomCode, 'PLAYER_ENABLED', { playerId, nickname })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/round-result', authMiddleware, async (req, res) => {
  try {
    const { roomCode, winnerId, winnerNickname } = req.body
    await RealtimeService.publish(roomCode, 'ROUND_RESULT', { winnerId, winnerNickname })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/open-chat', authMiddleware, async (req, res) => {
  try {
    const { roomCode, mode } = req.body
    // mode: 'single' (un jugador) | 'all' (todos)
    await RealtimeService.publish(roomCode, 'CHAT_OPENED', { mode })
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router