import Ably from 'ably'

const client = new Ably.Rest(process.env.ABLY_API_KEY!)

// ── Publicar evento a un canal de sala ───────────────────────────────────────
export const publish = async (roomCode: string, event: string, data: any) => {
  const channel = client.channels.get(`room:${roomCode}`)
  await channel.publish(event, data)
}

// ── Generar token para el cliente (frontend) ─────────────────────────────────
export const createToken = async (clientId: string) => {
  const tokenRequest = await client.auth.createTokenRequest({
    clientId,
    capability: { '*': ['subscribe', 'publish', 'presence'] },
    ttl: 3600000, // 1 hora
  })
  return tokenRequest
}

// ── Eventos del juego ────────────────────────────────────────────────────────
export const emitPlayerJoined = async (roomCode: string, player: {
  id: number
  nickname: string
  avatarEmoji: string
}) => {
  await publish(roomCode, 'PLAYER_JOINED', player)
}

export const emitPlayerLeft = async (roomCode: string, playerId: number) => {
  await publish(roomCode, 'PLAYER_LEFT', { playerId })
}

export const emitBuzzerPressed = async (roomCode: string, data: {
  playerId: number
  nickname: string
  position: number
  timestamp: number
}) => {
  await publish(roomCode, 'BUZZER_PRESSED', data)
}

export const emitPointsAssigned = async (roomCode: string, data: {
  playerId: number
  nickname: string
  points: number
  totalScore: number
}) => {
  await publish(roomCode, 'POINTS_ASSIGNED', data)
}

export const emitRoundAdvanced = async (roomCode: string, data: {
  currentRound: number
  totalRounds: number
  status: string
}) => {
  await publish(roomCode, 'ROUND_ADVANCED', data)
}

export const emitTrackSelected = async (roomCode: string, data: {
  mode: 'presencial' | 'remoto' | 'ai_dj'
  hintSeconds: number
  previewUrl?: string
  startAt?: number
}) => {
  await publish(roomCode, 'TRACK_SELECTED', data)
}

export const emitTrackRevealed = async (roomCode: string, data: {
  title: string
  artist: string
  albumArt: string
  year: string
}) => {
  await publish(roomCode, 'TRACK_REVEALED', data)
}

export const emitGameFinished = async (roomCode: string, players: {
  id: number
  nickname: string
  score: number
  position: number
}[]) => {
  await publish(roomCode, 'GAME_FINISHED', { players })
}