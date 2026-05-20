import { GoogleGenerativeAI } from '@google/generative-ai'
import { redis } from '../config/redis'
import { searchDeezer } from './media.service'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export interface AIPlaylistTrack {
  title: string
  artist: string
  year?: string
  genre?: string
  previewUrl?: string
  deezerId?: string
}

export interface AIConfig {
  genres: string[]
  decades: string[]
  artists: string[]
  difficulty: 'easy' | 'normal' | 'hard'
  region: string
  localMixPercent: number
}

// ── Generar playlist para DJ IA ───────────────────────────────────────────────
export const generatePlaylist = async (
  config: AIConfig,
  totalRounds: number
): Promise<AIPlaylistTrack[]> => {
  const cacheKey = `ai:playlist:${JSON.stringify(config)}:${totalRounds}`

  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
  }

  const prompt = `Eres el DJ de un juego de trivia musical. Genera una playlist de ${totalRounds} canciones para una partida.

Configuración:
- Región: ${config.region}
- Géneros: ${config.genres.join(', ') || 'variado'}
- Décadas: ${config.decades.join(', ') || 'todas'}
- Artistas sugeridos: ${config.artists.join(', ') || 'ninguno específico'}
- Dificultad: ${config.difficulty}
- Mix local/mundial: ${config.localMixPercent}% canciones locales/regionales

Reglas según dificultad:
- easy: solo hits muy conocidos, top 10 de su época
- normal: mezcla de hits y canciones medianamente conocidas
- hard: incluye algunos temas menos obvios o versiones específicas

Responde SOLO con un JSON array, sin texto adicional, sin markdown, sin bloques de código:
[
  {
    "title": "nombre exacto de la canción",
    "artist": "nombre exacto del artista",
    "year": "año",
    "genre": "género"
  }
]

Asegúrate de que sean canciones reales y conocidas. No repitas artistas más de 2 veces.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let tracks: AIPlaylistTrack[] = []
  try {
    tracks = JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Error parseando playlist de Gemini:', text)
    tracks = []
  }

  // buscar previewUrl en Deezer para cada track
  const tracksWithPreview = await Promise.all(
    tracks.map(async (track) => {
      try {
        const results = await searchDeezer(`${track.title} ${track.artist}`, 1)
        if (results.length > 0) {
          return {
            ...track,
            previewUrl: results[0].previewUrl,
            deezerId: results[0].deezerId?.toString(),
          }
        }
      } catch {
        // si falla Deezer, incluimos la canción sin preview
      }
      return track
    })
  )

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(tracksWithPreview), 'EX', 86400)
  }

  return tracksWithPreview
}

// ── Validar respuesta del jugador ─────────────────────────────────────────────
export const validateAnswer = async (
  userResponse: string,
  songTitle: string,
  songArtist: string,
  roundType: string,
  transcriptionScore?: number
): Promise<{ valid: boolean; points: number; feedback: string }> => {
  const prompt = `Eres el validador de un juego de trivia musical. Evalúa si la respuesta del jugador es correcta.

Canción correcta:
- Título: "${songTitle}"
- Artista: "${songArtist}"
- Tipo de ronda: ${roundType}

Respuesta del jugador: "${userResponse}"
${transcriptionScore !== undefined ? `Puntuación de similitud de texto: ${transcriptionScore}/100` : ''}

Reglas:
- Acepta variaciones del nombre (mayúsculas, tildes, artículos)
- Acepta nombres parciales si son inconfundibles
- Acepta errores ortográficos menores
- Para artistas acepta apodos conocidos (ej: "Bad Bunny" = "Benito")

Responde SOLO con JSON sin texto adicional ni markdown:
{
  "valid": true,
  "points": 3,
  "feedback": "mensaje corto para mostrar al jugador"
}

Puntuación:
- 3 puntos: respuesta exacta o casi exacta
- 2 puntos: respuesta parcial pero claramente correcta
- 1 punto: respuesta aproximada, reconocible
- 0 puntos: incorrecto`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { valid: false, points: 0, feedback: 'Error al validar respuesta' }
  }
}

// ── Generar pista de texto para la canción ────────────────────────────────────
export const generateHint = async (
  songTitle: string,
  songArtist: string,
  roundType: string,
  hintNumber: number
): Promise<string> => {
  const prompt = `Eres el DJ de un juego de trivia musical. Da una pista ${hintNumber === 1 ? 'vaga' : 'más específica'} sobre esta canción SIN revelar la respuesta directamente.

Canción: "${songTitle}" de "${songArtist}"
Tipo de ronda: ${roundType}
Número de pista: ${hintNumber} de 3

${roundType === 'title' ? 'El jugador debe adivinar el TÍTULO.' : ''}
${roundType === 'artist' ? 'El jugador debe adivinar el ARTISTA.' : ''}
${roundType === 'year' ? 'El jugador debe adivinar el AÑO.' : ''}

Da una pista corta, divertida y en español. Máximo 2 oraciones. Solo el texto de la pista, sin explicaciones.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}