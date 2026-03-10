import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from '../../race/entities/race.entity';

@Entity('settlements')
export class SettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'race_id', type: 'uuid', unique: true })
  raceId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'calculating', 'paying_out', 'completed', 'failed'],
    default: 'pending',
  })
  status!: string;

  @Column({ name: 'total_prize_pool', type: 'numeric', precision: 18, scale: 8 })
  totalPrizePool!: string;

  @Column({ name: 'total_treasury', type: 'numeric', precision: 18, scale: 8 })
  totalTreasury!: string;

  @Column({ name: 'total_reserve', type: 'numeric', precision: 18, scale: 8 })
  totalReserve!: string;

  @Column({ name: 'first_place_pool', type: 'numeric', precision: 18, scale: 8 })
  firstPlacePool!: string;

  @Column({ name: 'second_place_pool', type: 'numeric', precision: 18, scale: 8 })
  secondPlacePool!: string;

  @Column({ name: 'third_place_pool', type: 'numeric', precision: 18, scale: 8 })
  thirdPlacePool!: string;

  @Column({ type: 'jsonb', default: '[]' })
  payouts!: object[];

  @Column({ name: 'treasury_txid', type: 'varchar', length: 64, nullable: true })
  treasuryTxid!: string | null;

  @Column({ name: 'reserve_txid', type: 'varchar', length: 64, nullable: true })
  reserveTxid!: string | null;

  @Column({ name: 'error_log', type: 'text', nullable: true })
  errorLog!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => RaceEntity)
  @JoinColumn({ name: 'race_id' })
  race!: RaceEntity;
}
