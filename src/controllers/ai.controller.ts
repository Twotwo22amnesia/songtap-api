import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import * as AIService from '../services/ai.service'
import * as WhisperService from '../services/whisper.service'
import { AppDataSource } from '../config/database'
import { Game } from '../entities/Game'

export const generatePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, config, totalRounds } = req.body

    if (!config || !totalRounds) {
      res.status(400).json({ error: 'config y totalRounds son requeridos' })
      return
    }

    const playlist = await AIService.generatePlaylist(config, totalRounds)
    res.json({ playlist, total: playlist.length })
  } catch (error: any) {
    console.error('Error generando playlist:', error.message)
    res.status(500).json({ error: error.message })
  }
}

export const validateAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { userResponse, songTitle, songArtist, roundType } = req.body

    if (!userResponse || !songTitle || !songArtist) {
      res.status(400).json({ error: 'userResponse, songTitle y songArtist son requeridos' })
      return
    }

    // validación de texto rápida primero
    const textScore = WhisperService.validateResponseWithText(
      userResponse, songTitle, songArtist
    )

    // si el score de texto es alto, no necesitamos llamar a Claude
    if (textScore.score >= 90) {
      res.json({ valid: true, points: 3, feedback: '¡Exacto! 🎵', source: 'text' })
      return
    }

    // Claude valida con contexto completo
    const result = await AIService.validateAnswer(
      userResponse, songTitle, songArtist, roundType || 'title', textScore.score
    )

    res.json({ ...result, source: 'claude' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const generateHint = async (req: AuthRequest, res: Response) => {
  try {
    const { songTitle, songArtist, roundType, hintNumber } = req.body

    if (!songTitle || !songArtist) {
      res.status(400).json({ error: 'songTitle y songArtist son requeridos' })
      return
    }

    const hint = await AIService.generateHint(
      songTitle, songArtist, roundType || 'title', hintNumber || 1
    )

    res.json({ hint })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const transcribeAndValidate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Audio requerido' })
      return
    }

    const { songTitle, songArtist, roundType } = req.body

    // transcribir con Whisper
    const transcription = await WhisperService.transcribeAudio(
      req.file.buffer,
      `audio_${Date.now()}.webm`
    )

    console.log('Transcripción Whisper:', transcription)

    // validar con texto primero
    const textScore = WhisperService.validateResponseWithText(
      transcription, songTitle, songArtist
    )

    // si score alto, respuesta directa
    if (textScore.score >= 85) {
      res.json({
        transcription,
        valid: true,
        points: 3,
        feedback: '¡Correcto! 🎵',
        score: textScore.score,
        source: 'whisper+text'
      })
      return
    }

    // Claude valida con contexto
    const result = await AIService.validateAnswer(
      transcription, songTitle, songArtist,
      roundType || 'title', textScore.score
    )

    res.json({
      transcription,
      ...result,
      score: textScore.score,
      source: 'whisper+claude'
    })
  } catch (error: any) {
    console.error('Error transcribiendo:', error.message)
    res.status(500).json({ error: error.message })
  }
}