import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm'
import { Game } from './Game'
import { User } from './User'

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  nickname!: string

  @Column({ nullable: true })
  avatarEmoji!: string

  @Column({ default: 0 })
  score!: number

  @Column({ default: false })
  isConnected!: boolean

  @ManyToOne(() => Game, (game) => game.players)
  @JoinColumn()
  game!: Game

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  user!: User

  @CreateDateColumn()
  joinedAt!: Date
}