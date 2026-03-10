import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { RacerEntity } from './racer.entity';
import { RaceAddressEntity } from './race-address.entity';

@Entity('races')
export class RaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'race_date', type: 'date' })
  raceDate!: string;

  @Column({ type: 'enum', enum: ['A', 'B'] })
  slot!: 'A' | 'B';

  @Column({
    type: 'enum',
    enum: ['scheduled', 'active', 'settling', 'settled', 'cancelled'],
    default: 'scheduled',
  })
  status!: string;

  @Column({ name: 'current_tick', type: 'int', default: 0 })
  currentTick!: number;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'randomness_commit', type: 'varchar', length: 64, nullable: true })
  randomnessCommit!: string | null;

  @Column({ name: 'randomness_reveal', type: 'varchar', length: 64, nullable: true })
  randomnessReveal!: string | null;

  @Column({ name: 'total_prize_pool', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalPrizePool!: string;

  @Column({ name: 'total_action_pool', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalActionPool!: string;

  @Column({ name: 'total_treasury', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalTreasury!: string;

  @Column({ name: 'total_reserve', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalReserve!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => RacerEntity, (racer) => racer.race)
  racers!: RacerEntity[];

  @OneToMany(() => RaceAddressEntity, (addr) => addr.race)
  addresses!: RaceAddressEntity[];
}
