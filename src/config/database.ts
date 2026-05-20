import { DataSource } from 'typeorm'
import dotenv from 'dotenv'
import { User } from '../entities/User'
import { Game } from '../entities/Game'
import { Player } from '../entities/Player'
import { Score } from '../entities/Score'

dotenv.config()

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: process.env.NODE_ENV === 'development',
  logging: false,
  entities: [User, Game, Player, Score],
  migrations: ['src/migrations/**/*.ts'],
})