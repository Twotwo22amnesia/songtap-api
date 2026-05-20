import axios from 'axios'
import { redis } from '../config/redis'

const SPOTIFY_API = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const DEEZER_API = 'https://api.deezer.com'

// ── Token con Client Credentials (no necesita usuario) ──────────────────────
const getClientToken = async (): Promise<string> => {
  const cacheKey = 'spotify:client_token1111'

  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) return cached
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const response = await axios.post(
    SPOTIFY_TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  const { access_token, expires_in } = response.data

  if (redis) {
    await redis.set(cacheKey, access_token, 'EX', expires_in - 60)
  }

  return access_token
}

// ── Buscar en Deezer ─────────────────────────────────────────────────────────
export const searchDeezer = async (query: string, limit: number = 10) => {
  const response = await axios.get(`${DEEZER_API}/search`, {
    params: { q: query, limit },
  })

  return response.data.data.map((track: any) => ({
    deezerId: track.id,
    title: track.title,
    artist: track.artist.name,
    album: track.album.title,
    previewUrl: track.preview,      // siempre disponible, 30s MP3
    albumArt: track.album.cover_xl,
    duration: track.duration,
  }))
}

export const getPreviewUrl = async (
  title: string,
  artist: string
): Promise<string | null> => {
  const cacheKey = `deezer:preview:${title}:${artist}`.toLowerCase().replace(/\s/g, '_')

  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) return cached
  }

  const results = await searchDeezer(`${title} ${artist}`, 1)
  const previewUrl = results[0]?.previewUrl || null

  if (previewUrl && redis) {
    await redis.set(cacheKey, previewUrl, 'EX', 86400) // 24h
  }

  return previewUrl
}

// ── Top tracks por género en Deezer ─────────────────────────────────────────
export const getDeezerTopByGenre = async (
  genre: string,
  limit: number = 20
) => {
  const cacheKey = `deezer:top:${genre}:${limit}`

  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
  }

  const response = await axios.get(`${DEEZER_API}/search`, {
    params: {
      q: genre,
      limit,
      order: 'RANKING',
    },
  })

  const tracks = response.data.data
    .filter((t: any) => t.preview)
    .map((track: any) => ({
      deezerId: track.id,
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      previewUrl: track.preview,
      albumArt: track.album.cover_xl,
      duration: track.duration,
      rank: track.rank,
    }))

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(tracks), 'EX', 3600)
  }

  return tracks
}

// ── Buscar canciones ─────────────────────────────────────────────────────────
export const searchTracks = async (query: string, limit: number = 10) => {
  const token = await getClientToken()

  const response = await axios.get(`${SPOTIFY_API}/search`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      type: 'track',
      limit,
      market: 'PE',
    },
  })

  const tracks = response.data.tracks.items.map((track: any) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.map((a: any) => a.name).join(', '),
    album: track.album.name,
    year: track.album.release_date?.split('-')[0],
    previewUrl: track.preview_url,
    albumArt: track.album.images[0]?.url,
    durationMs: track.duration_ms,
    popularity: track.popularity,
  }))

  return tracks
}

// ── Obtener track por ID ─────────────────────────────────────────────────────
export const getTrackById = async (trackId: string) => {
  const token = await getClientToken()

  const response = await axios.get(`${SPOTIFY_API}/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { market: 'PE' },
  })

  const track = response.data
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((a: any) => a.name).join(', '),
    album: track.album.name,
    year: track.album.release_date?.split('-')[0],
    previewUrl: track.preview_url,
    albumArt: track.album.images[0]?.url,
    durationMs: track.duration_ms,
    popularity: track.popularity,
  }
}

// ── Top tracks por región ─────────────────────────────────────────────────────
export const getTopTracksByRegion = async (
  region: string = 'PE',
  genres: string[] = [],
  limit: number = 20
) => {
  try {
    const token = await getClientToken()
    console.log('token ok:', token.substring(0, 20) + '...')

    const genreQuery = genres.length > 0 ? genres[0] : 'latin hits'

    console.log('spotify params:', { q: genreQuery, type: 'track', limit: 10 })

    const response = await axios.get(`${SPOTIFY_API}/search`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: genreQuery,
        type: 'track',
        limit: 10,
      },
    })

    console.log('spotify response items:', response.data.tracks.items.length)
    console.log('primer track:', response.data.tracks.items[0]?.name, '| preview:', response.data.tracks.items[0]?.preview_url)

    const tracks = response.data.tracks.items.map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      year: track.album.release_date?.split('-')[0],
      previewUrl: track.preview_url,
      albumArt: track.album.images[0]?.url,
      popularity: track.popularity,
    }))

    return tracks
  } catch (err: any) {
    console.error('error detallado:', err.response?.data || err.message)
    throw err
  }
}