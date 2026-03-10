import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementEntity } from './entities/settlement.entity';
import { SettlementService } from './settlement.service';
import { RaceEntity } from '../race/entities/race.entity';
import { RacerEntity } from '../race/entities/racer.entity';
import { BackingEntity } from '../backing/entities/backing.entity';
import { FiroModule } from '../firo/firo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementEntity, RaceEntity, RacerEntity, BackingEntity]),
    FiroModule,
  ],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
