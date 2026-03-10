import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { RaceEntity } from '../race/entities/race.entity';
import { RacerEntity } from '../race/entities/racer.entity';
import { TickSnapshotEntity } from '../race/entities/tick-snapshot.entity';
import { ActionEntity } from '../action/entities/action.entity';
import { BackingEntity } from '../backing/entities/backing.entity';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { SettlementEntity } from '../settlement/entities/settlement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RaceEntity, RacerEntity, TickSnapshotEntity,
      ActionEntity, BackingEntity, OnchainEventEntity,
      SettlementEntity,
    ]),
  ],
  controllers: [AuditController],
})
export class AuditModule {}
