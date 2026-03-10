import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from './race.entity';

@Entity('tick_snapshots')
export class TickSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'race_id', type: 'uuid' })
  raceId!: string;

  @Column({ type: 'smallint' })
  tick!: number;

  @Column({ name: 'block_hash', type: 'varchar', length: 64 })
  blockHash!: string;

  @Column({ name: 'random_seed', type: 'varchar', length: 64 })
  randomSeed!: string;

  @Column({ name: 'racer_states', type: 'jsonb' })
  racerStates!: object[];

  @Column({ name: 'actions_applied', type: 'jsonb', default: '[]' })
  actionsApplied!: object[];

  @Column({ type: 'text', nullable: true })
  commentary!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => RaceEntity)
  @JoinColumn({ name: 'race_id' })
  race!: RaceEntity;
}
