import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementEntity } from './entities/settlement.entity';
import { SettlementService } from './settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([SettlementEntity])],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
