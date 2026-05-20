import { Router } from 'express'
import multer from 'multer'
import { generatePlaylist, validateAnswer, generateHint, transcribeAndValidate } from '../controllers/ai.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const upload = multer({ storage: multer.memoryStorage() })
const router = Router()

router.post('/playlist', authMiddleware, generatePlaylist)
router.post('/validate', validateAnswer)
router.post('/hint', generateHint)
router.post('/transcribe', upload.single('audio'), transcribeAndValidate)

export default router