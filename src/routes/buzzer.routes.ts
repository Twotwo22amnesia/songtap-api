import { Router } from 'express'
import { pressBuzzer, getBuzzerOrder, assignPoints, advanceRound } from '../controllers/buzzer.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/press', pressBuzzer)
router.get('/order/:gameId/:round', getBuzzerOrder)
router.post('/points', authMiddleware, assignPoints)
router.post('/advance', authMiddleware, advanceRound)

export default router