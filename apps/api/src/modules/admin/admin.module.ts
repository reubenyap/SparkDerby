import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RaceModule } from '../race/race.module';
import { SettlementModule } from '../settlement/settlement.module';
import { FiroModule } from '../firo/firo.module';

@Module({
  imports: [RaceModule, SettlementModule, FiroModule],
  controllers: [AdminController],
})
export class AdminModule {}
