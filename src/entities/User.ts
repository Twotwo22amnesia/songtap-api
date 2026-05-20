import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm'
import { Game } from './Game'

export type UserTier = 'free' | 'pro' | 'event'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ unique: true })
  email!: string

  @Column()
  password!: string

  @Column()
  username!: string

  @Column({ nullable: true })
  avatarUrl!: string

  @Column({ type: 'varchar', default: 'free' })
  tier!: UserTier

  @Column({ default: 0 })
  gamesPlayed!: number

  @Column({ nullable: true })
  spotifyRefreshToken!: string

  @OneToMany(() => Game, (game) => game.host)
  hostedGames!: Game[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}