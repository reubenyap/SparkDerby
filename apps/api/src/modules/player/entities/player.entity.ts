import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { BrowserSessionEntity } from './browser-session.entity';

@Entity('players')
export class PlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'spark_address', type: 'varchar', length: 160, unique: true })
  sparkAddress!: string;

  @Column({ name: 'spark_name', type: 'varchar', length: 64, nullable: true })
  sparkName!: string | null;

  @Column({ name: 'first_seen_at', type: 'timestamptz', default: () => 'NOW()' })
  firstSeenAt!: Date;

  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'NOW()' })
  lastActiveAt!: Date;

  @Column({ name: 'total_races', type: 'int', default: 0 })
  totalRaces!: number;

  @Column({ name: 'total_backed', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalBacked!: string;

  @Column({ name: 'total_won', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalWon!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => BrowserSessionEntity, (session) => session.player)
  sessions!: BrowserSessionEntity[];
}
