import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

let _openai: OpenAI | null = null

const getOpenAI = () => {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      // si no hay key, retornar null sin crashear
      return null
    }
    _openai = new OpenAI({ apiKey: key })
  }
  return _openai
}

export const transcribeAudio = async (audioBuffer: Buffer, filename: string): Promise<string> => {
  const openai = getOpenAI()
  if (!openai) return '' // sin OpenAI, retornar vacío

  const tempPath = path.join(__dirname, '../../temp', filename)
  
  if (!fs.existsSync(path.join(__dirname, '../../temp'))) {
    fs.mkdirSync(path.join(__dirname, '../../temp'), { recursive: true })
  }

  fs.writeFileSync(tempPath, audioBuffer)

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'es',
      prompt: 'El usuario está cantando, tarareando o diciendo el nombre de una canción.',
    })
    return transcription.text
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }
}

export const validateResponseWithText = (
  transcription: string,
  songTitle: string,
  songArtist: string,
  lyrics?: string
): { score: number; matched: string } => {
  const normalize = (str: string) =>
    str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()

  const trans = normalize(transcription)
  const title = normalize(songTitle)
  const artist = normalize(songArtist)

  if (trans.includes(title) || title.includes(trans)) {
    return { score: 100, matched: 'title_exact' }
  }
  if (trans.includes(artist) || artist.includes(trans)) {
    return { score: 80, matched: 'artist' }
  }
  const titleWords = title.split(' ').filter(w => w.length > 3)
  const matchedWords = titleWords.filter(w => trans.includes(w))
  if (matchedWords.length > 0) {
    const score = Math.round((matchedWords.length / titleWords.length) * 90)
    return { score, matched: 'partial_title' }
  }
  if (lyrics) {
    const lyricsNorm = normalize(lyrics)
    const transWords = trans.split(' ').filter(w => w.length > 3)
    const lyricsMatches = transWords.filter(w => lyricsNorm.includes(w))
    if (lyricsMatches.length >= 2) {
      return { score: 70, matched: 'lyrics' }
    }
  }
  return { score: 0, matched: 'none' }
}