import { Router } from 'express'
import { createGame, joinGame, getGame } from '../controllers/game.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/create', authMiddleware, createGame)
router.post('/join', joinGame)
router.get('/:roomCode', getGame)

export default router