import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const transcribeAudio = async (audioBuffer: Buffer, filename: string): Promise<string> => {
  // guardar temporalmente el archivo
  const tempPath = path.join(__dirname, '../../temp', filename)
  
  // crear carpeta temp si no existe
  if (!fs.existsSync(path.join(__dirname, '../../temp'))) {
    fs.mkdirSync(path.join(__dirname, '../../temp'), { recursive: true })
  }

  fs.writeFileSync(tempPath, audioBuffer)

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'es',
      prompt: 'El usuario está cantando, tarareando o diciendo el nombre de una canción en español o inglés.',
    })

    return transcription.text
  } finally {
    // limpiar archivo temporal
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

  // coincidencia exacta con título
  if (trans.includes(title) || title.includes(trans)) {
    return { score: 100, matched: 'title_exact' }
  }

  // coincidencia con artista
  if (trans.includes(artist) || artist.includes(trans)) {
    return { score: 80, matched: 'artist' }
  }

  // coincidencia parcial — palabras clave del título
  const titleWords = title.split(' ').filter(w => w.length > 3)
  const matchedWords = titleWords.filter(w => trans.includes(w))
  if (matchedWords.length > 0) {
    const score = Math.round((matchedWords.length / titleWords.length) * 90)
    return { score, matched: 'partial_title' }
  }

  // coincidencia con letra si está disponible
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