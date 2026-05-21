import { Router } from 'express'
import axios from 'axios'
import { authMiddleware } from '../middlewares/auth.middleware'
import { AppDataSource } from '../config/database'
import { User } from '../entities/User'

const router = Router()

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!

// URL de autorización
router.get('/auth-url', authMiddleware, (req, res) => {
  const origin = req.headers.origin || req.headers.referer || 'http://127.0.0.1:8081'
  
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: scopes,
    state: Buffer.from(origin).toString('base64'), // ← guardar origen en state
  })

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`
  res.json({ url })
})

// Callback — intercambiar code por tokens
router.get('/callback', async (req: any, res) => {
  try {
    const { code, error, state } = req.query

    // recuperar origen del state
    let frontUrl = 'http://127.0.0.1:8081'
    if (state) {
      try {
        const origin = Buffer.from(state as string, 'base64').toString()
        if (origin.includes('exp.direct') || origin.includes('ngrok')) {
          frontUrl = origin.replace(/\/$/, '') // quitar slash final
        }
      } catch {}
    }

    if (error || !code) {
      return res.redirect(`${frontUrl}/spotify-callback?error=denied`)
    }

    const credentials = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token, refresh_token } = response.data

    res.redirect(
      `${frontUrl}/spotify-callback?access_token=${access_token}&refresh_token=${refresh_token}`
    )
  } catch (error: any) {
    console.error('Spotify callback error:', error.response?.data || error.message)
    res.redirect('http://127.0.0.1:8081/spotify-callback?error=failed')
  }
})
// Callback GET — Spotify redirige aquí
router.get('/callback', async (req: any, res) => {
  try {
    const { code, error } = req.query

    if (error || !code) {
      return res.redirect('https://eenapmi-anonymous-8081.exp.direct/spotify-callback?error=denied')
    }

    const credentials = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { access_token, refresh_token } = response.data

    // detectar si viene del tunnel o local
    const referer = req.headers.referer || ''
    const isTunnel = referer.includes('exp.direct') || referer.includes('ngrok')
    
    const frontUrl = isTunnel
      ? 'https://eenapmi-anonymous-8081.exp.direct'
      : 'http://127.0.0.1:8081'

    res.redirect(
      `${frontUrl}/spotify-callback?access_token=${access_token}&refresh_token=${refresh_token}`
    )
  } catch (error: any) {
    console.error('Spotify callback error:', error.response?.data || error.message)
    res.redirect('http://127.0.0.1:8081/spotify-callback?error=failed')
  }
})
// Refresh token
router.post('/refresh', authMiddleware, async (req: any, res) => {
  try {
    const { refreshToken } = req.body

    const credentials = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    res.json({ accessToken: response.data.access_token })
  } catch (error: any) {
    res.status(500).json({ error: 'Error al refrescar token' })
  }
})

export default router