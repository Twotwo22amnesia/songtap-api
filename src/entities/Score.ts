import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm'
import { Game } from './Game'
import { Player } from './Player'

export type RoundType = 'title' | 'artist' | 'year' | 'album' | 'lyrics'

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  round!: number

  @Column({ type: 'varchar' })
  roundType!: RoundType

  @Column()
  points!: number

  @Column({ nullable: true })
  buzzerPosition!: number

  @Column({ nullable: true })
  responseText!: string

  @Column({ nullable: true })
  songTitle!: string

  @Column({ nullable: true })
  songArtist!: string

  @ManyToOne(() => Game)
  @JoinColumn()
  game!: Game

  @ManyToOne(() => Player)
  @JoinColumn()
  player!: Player

  @CreateDateColumn()
  createdAt!: Date
}