import Ably from 'ably'

let _client: Ably.Rest | null = null

const getClient = () => {
  if (!_client) {
    const key = process.env.ABLY_API_KEY
    if (!key) throw new Error('ABLY_API_KEY no configurada')
    _client = new Ably.Rest(key)
  }
  return _client
}

export const publish = async (roomCode: string, event: string, data: any) => {
  const channel = getClient().channels.get(`room:${roomCode}`)
  await channel.publish(event, data)
}

export const createToken = async (clientId: string) => {
  const tokenRequest = await getClient().auth.createTokenRequest({
    clientId,
    capability: { '*': ['subscribe', 'publish', 'presence'] },
    ttl: 3600000,
  })
  return tokenRequest
}

// ... resto de las funciones usan getClient() en vez de client
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
  previewUrl?: string | null
  startAt?: number
}) => {
  await publish(roomCode, 'TRACK_SELECTED', data)
}

export const emitTrackRevealed = async (roomCode: string, data: {
  title: string
  artist: string
  albumArt: string
  year: string
  previewUrl?: string
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