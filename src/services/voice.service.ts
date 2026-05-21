import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

const getLivekitUrl = () => process.env.LIVEKIT_URL!
const getApiKey = () => process.env.LIVEKIT_API_KEY!
const getApiSecret = () => process.env.LIVEKIT_API_SECRET!

let _roomService: RoomServiceClient | null = null

const getRoomService = () => {
  if (!_roomService) {
    _roomService = new RoomServiceClient(
      getLivekitUrl().replace('wss://', 'https://'),
      getApiKey(),
      getApiSecret()
    )
  }
  return _roomService
}

export type VoiceRole = 'dj' | 'player' | 'spectator'

// ── Generar token para unirse a sala de voz ──────────────────────────────────
export const createVoiceToken = async (
  roomCode: string,
  participantId: string,
  nickname: string,
  role: VoiceRole
) => {
  const token = new AccessToken(getApiKey(), getApiSecret(), {
    identity: participantId,
    name: nickname,
    ttl: 3600, // 1 hora
  })

  token.addGrant({
    room: `voice:${roomCode}`,
    roomJoin: true,
    canPublish: role === 'dj' || role === 'player', // spectator solo escucha
    canSubscribe: true,
    canPublishData: true,
  })

  return {
    token: await token.toJwt(),
    url: getLivekitUrl(),
    room: `voice:${roomCode}`,
  }
}

// ── Crear sala de voz ────────────────────────────────────────────────────────
export const createVoiceRoom = async (roomCode: string) => {
  try {
    const room = await getRoomService().createRoom({
      name: `voice:${roomCode}`,
      emptyTimeout: 300,    // se elimina a los 5 min sin participantes
      maxParticipants: 25,
    })
    return room
  } catch (error: any) {
    console.error('Error creando sala de voz:', error.message)
    throw error
  }
}

// ── Mutear/desmutear participante (DJ controla quién habla) ──────────────────
export const muteParticipant = async (
  roomCode: string,
  participantId: string,
  muted: boolean
) => {
  try {
    const participants = await getRoomService().listParticipants(`voice:${roomCode}`)
    const participant = participants.find(p => p.identity === participantId)

    if (!participant) return

    // mutear todas las tracks de audio del participante
    for (const track of participant.tracks) {
      if (track.type === 0) { // 0 = audio
        await getRoomService().mutePublishedTrack(
          `voice:${roomCode}`,
          participantId,
          track.sid,
          muted
        )
      }
    }
  } catch (error: any) {
    console.error('Error muteando participante:', error.message)
  }
}

// ── Abrir voz para todos (entre rondas) ─────────────────────────────────────
export const openVoiceForAll = async (roomCode: string) => {
  try {
    const participants = await getRoomService().listParticipants(`voice:${roomCode}`)
    for (const participant of participants) {
      for (const track of participant.tracks) {
        if (track.type === 0) {
          await getRoomService().mutePublishedTrack(
            `voice:${roomCode}`,
            participant.identity,
            track.sid,
            false // desmutear
          )
        }
      }
    }
  } catch (error: any) {
    console.error('Error abriendo voz:', error.message)
  }
}

// ── Cerrar voz excepto jugador activo (durante ronda) ───────────────────────
export const openVoiceForPlayer = async (
  roomCode: string,
  activeParticipantId: string
) => {
  try {
    const participants = await getRoomService().listParticipants(`voice:${roomCode}`)
    for (const participant of participants) {
      const shouldMute = participant.identity !== activeParticipantId
      for (const track of participant.tracks) {
        if (track.type === 0) {
          await getRoomService().mutePublishedTrack(
            `voice:${roomCode}`,
            participant.identity,
            track.sid,
            shouldMute
          )
        }
      }
    }
  } catch (error: any) {
    console.error('Error controlando voz:', error.message)
  }
}

// ── Listar participantes en sala de voz ──────────────────────────────────────
export const listVoiceParticipants = async (roomCode: string) => {
  try {
    const participants = await getRoomService().listParticipants(`voice:${roomCode}`)
    return participants.map(p => ({
      identity: p.identity,
      name: p.name,
      joinedAt: p.joinedAt,
    }))
  } catch {
    return []
  }
}