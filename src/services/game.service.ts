import { AppDataSource } from '../config/database'
import { Game, GameMode } from '../entities/Game'
import { Player } from '../entities/Player'
import { User } from '../entities/User'
import { redis } from '../config/redis'

const gameRepo = () => AppDataSource.getRepository(Game)
const playerRepo = () => AppDataSource.getRepository(Player)
const userRepo = () => AppDataSource.getRepository(User)

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const getUniqueRoomCode = async (): Promise<string> => {
  let code = generateRoomCode()
  let exists = await gameRepo().findOne({ where: { roomCode: code } })
  while (exists) {
    code = generateRoomCode()
    exists = await gameRepo().findOne({ where: { roomCode: code } })
  }
  return code
}

export const createGame = async (
  hostId: number,
  mode: GameMode,
  totalRounds: number = 10,
  hintSeconds: number = 10,
  region?: string
) => {
  const host = await userRepo().findOne({ where: { id: hostId } })
  if (!host) throw new Error('Usuario no encontrado')

  const roomCode = await getUniqueRoomCode()

  const game = gameRepo().create({
    roomCode,
    mode,
    totalRounds,
    hintSeconds,
    region: region || 'PE',
    host,
    status: 'waiting',
  })

  await gameRepo().save(game)

  // guardar estado inicial en Redis
  await setGameState(game.id, {
    id: game.id,
    roomCode: game.roomCode,
    status: 'waiting',
    mode: game.mode,
    currentRound: 1,
    totalRounds: game.totalRounds,
    hintSeconds: game.hintSeconds,
    hostId,
    players: [],
  })

  return game
}

export const joinGame = async (
  roomCode: string,
  nickname: string,
  avatarEmoji: string,
  userId?: number
) => {
  const game = await gameRepo().findOne({
  where: { roomCode: roomCode.toUpperCase() },
  relations: { players: true },
})

  if (!game) throw new Error('Sala no encontrada')
  if (game.status !== 'waiting') throw new Error('La partida ya comenzó')
  if (game.players.length >= 20) throw new Error('Sala llena')

  const user = userId
    ? await userRepo().findOne({ where: { id: userId } })
    : null

  const player = playerRepo().create({
    nickname,
    avatarEmoji,
    score: 0,
    isConnected: true,
    game,
    ...(user && { user }),
  })

  await playerRepo().save(player)

  // actualizar estado en Redis
  const state = await getGameState(game.id)
  if (state) {
    state.players.push({
      id: player.id,
      nickname: player.nickname,
      avatarEmoji: player.avatarEmoji,
      score: 0,
      isConnected: true,
    })
    await setGameState(game.id, state)
  }

  return { player, game }
}

export const getGameByCode = async (roomCode: string) => {
  return gameRepo().findOne({
    where: { roomCode: roomCode.toUpperCase() },
    relations: { host: true, players: true },
  })
}

export const getGameState = async (gameId: number) => {
  if (!redis) return null
  const raw = await redis.get(`game:${gameId}:state`)
  return raw ? JSON.parse(raw) : null
}

export const setGameState = async (gameId: number, state: any) => {
  if (!redis) return
  // expira en 24 horas
  await redis.set(`game:${gameId}:state`, JSON.stringify(state), 'EX', 86400)
}