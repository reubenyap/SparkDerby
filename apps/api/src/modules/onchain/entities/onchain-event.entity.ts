import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from '../../race/entities/race.entity';
import { PlayerEntity } from '../../player/entities/player.entity';

@Entity('onchain_events')
export class OnchainEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  txid!: string;

  @Column({ name: 'vout_index', type: 'int', nullable: true })
  voutIndex!: number | null;

  @Column({ name: 'spark_address', type: 'varchar', length: 160 })
  sparkAddress!: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount!: string;

  @Column({ type: 'varchar', length: 3 })
  direction!: 'in' | 'out';

  @Column({ type: 'enum', enum: ['backing', 'action', 'payout', 'treasury', 'reserve'], nullable: true })
  purpose!: string | null;

  @Column({ name: 'race_id', type: 'uuid', nullable: true })
  raceId!: string | null;

  @Column({ name: 'player_id', type: 'uuid', nullable: true })
  playerId!: string | null;

  @Column({
    type: 'enum',
    enum: ['detected', 'instant_locked', 'confirmed', 'failed'],
    default: 'detected',
  })
  status!: string;

  @Column({ name: 'instant_locked', type: 'boolean', default: false })
  instantLocked!: boolean;

  @Column({ name: 'block_hash', type: 'varchar', length: 64, nullable: true })
  blockHash!: string | null;

  @Column({ name: 'block_height', type: 'int', nullable: true })
  blockHeight!: number | null;

  @Column({ name: 'raw_tx', type: 'jsonb', nullable: true })
  rawTx!: object | null;

  @Column({ name: 'detected_at', type: 'timestamptz', default: () => 'NOW()' })
  detectedAt!: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => RaceEntity, { nullable: true })
  @JoinColumn({ name: 'race_id' })
  race!: RaceEntity | null;

  @ManyToOne(() => PlayerEntity, { nullable: true })
  @JoinColumn({ name: 'player_id' })
  player!: PlayerEntity | null;
}
