import { Router } from 'express'
import { getVoiceToken, createRoom, controlVoice, getParticipants } from '../controllers/voice.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/token', getVoiceToken)
router.post('/room', authMiddleware, createRoom)
router.post('/control', authMiddleware, controlVoice)
router.get('/participants/:roomCode', getParticipants)

export default router