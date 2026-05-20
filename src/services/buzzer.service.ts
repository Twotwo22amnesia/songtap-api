import { redis } from '../config/redis'
import { AppDataSource } from '../config/database'
import { Score } from '../entities/Score'
import { Player } from '../entities/Player'
import { Game } from '../entities/Game'
import { getGameState, setGameState } from './game.service'

const scoreRepo = () => AppDataSource.getRepository(Score)
const playerRepo = () => AppDataSource.getRepository(Player)
const gameRepo = () => AppDataSource.getRepository(Game)

export const pressBuzzer = async (
  gameId: number,
  playerId: number,
  round: number
): Promise<{ position: number; timestamp: number }> => {
  if (!redis) throw new Error('Redis no disponible')

  const key = `game:${gameId}:round:${round}:buzzer`
  const timestamp = Date.now()

  // ZADD es atómico — registra playerId con score = timestamp
  // si ya existe el player en este round, no lo sobreescribe
  const added = await redis.zadd(key, 'NX', timestamp, playerId.toString())

  if (added === 0) {
    // ya había presionado antes, devolver su posición actual
    const position = await redis.zrank(key, playerId.toString())
    return { position: (position ?? 0) + 1, timestamp }
  }

  // expira en 1 hora
  await redis.expire(key, 3600)

  const position = await redis.zrank(key, playerId.toString())
  return { position: (position ?? 0) + 1, timestamp }
}

export const getBuzzerOrder = async (
  gameId: number,
  round: number
): Promise<{ playerId: number; position: number; timestamp: number }[]> => {
  if (!redis) return []

  const key = `game:${gameId}:round:${round}:buzzer`
  const results = await redis.zrange(key, 0, -1, 'WITHSCORES')

  const order = []
  for (let i = 0; i < results.length; i += 2) {
    order.push({
      playerId: parseInt(results[i]),
      position: i / 2 + 1,
      timestamp: parseInt(results[i + 1]),
    })
  }

  return order
}

export const assignPoints = async (
  gameId: number,
  playerId: number,
  round: number,
  points: number,
  roundType: string,
  songTitle: string,
  songArtist: string,
  responseText?: string
) => {
  const game = await gameRepo().findOne({ where: { id: gameId } })
  const player = await playerRepo().findOne({ where: { id: playerId } })

  if (!game || !player) throw new Error('Juego o jugador no encontrado')

  // guardar en PostgreSQL
  const score = scoreRepo().create({
    round,
    roundType: roundType as any,
    points,
    songTitle,
    songArtist,
    responseText,
    game,
    player,
  })
  await scoreRepo().save(score)

  // actualizar score del player en PostgreSQL
  player.score += points
  await playerRepo().save(player)

  // actualizar score en Redis
  const state = await getGameState(gameId)
  if (state) {
    const p = state.players.find((p: any) => p.id === playerId)
    if (p) p.score += points
    await setGameState(gameId, state)
  }

  return { playerId, points, totalScore: player.score }
}

export const resetBuzzer = async (gameId: number, round: number) => {
  if (!redis) return
  const key = `game:${gameId}:round:${round}:buzzer`
  await redis.del(key)
}

export const advanceRound = async (gameId: number) => {
  const game = await gameRepo().findOne({ where: { id: gameId } })
  if (!game) throw new Error('Juego no encontrado')

  if (game.currentRound >= game.totalRounds) {
    game.status = 'finished'
  } else {
    game.currentRound += 1
  }

  await gameRepo().save(game)

  // actualizar Redis
  const state = await getGameState(gameId)
  if (state) {
    state.currentRound = game.currentRound
    state.status = game.status
    await setGameState(gameId, state)
  }

  return { currentRound: game.currentRound, status: game.status }
}