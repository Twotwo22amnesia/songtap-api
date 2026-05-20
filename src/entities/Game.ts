import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, OneToMany, JoinColumn
} from 'typeorm'
import { User } from './User'
import { Player } from './Player'

export type GameMode = 'presencial' | 'remoto' | 'ai_dj'
export type GameStatus = 'waiting' | 'playing' | 'finished'

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ unique: true, length: 6 })
  roomCode!: string

  @Column({ type: 'varchar', default: 'waiting' })
  status!: GameStatus

  @Column({ type: 'varchar', default: 'presencial' })
  mode!: GameMode

  @Column({ default: 1 })
  currentRound!: number

  @Column({ default: 10 })
  totalRounds!: number

  @Column({ default: 10 })
  hintSeconds!: number

  @Column({ nullable: true })
  region!: string

  @Column({ nullable: true, type: 'jsonb' })
  aiConfig!: {
    genres: string[]
    decades: string[]
    artists: string[]
    difficulty: 'easy' | 'normal' | 'hard'
    localMixPercent: number
  }

  @ManyToOne(() => User, (user) => user.hostedGames)
  @JoinColumn()
  host!: User

  @OneToMany(() => Player, (player) => player.game)
  players!: Player[]

  @CreateDateColumn()
  createdAt!: Date
}