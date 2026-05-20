import { Router } from 'express'
import { register, login, me } from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { createToken } from '../services/realtime.service'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authMiddleware, me)
router.get('/ably-token', authMiddleware, async (req, res) => {
  const token = await createToken(`user-${(req as any).userId}`)
  res.json(token)
})

export default router