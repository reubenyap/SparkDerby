import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FiroRpcService } from './firo-rpc.service';
import { ChainWatcherService } from './chain-watcher.service';
import { AddressManagerService } from './address-manager.service';
import { TxClassifierService } from './tx-classifier.service';
import { InstantLockService } from './instantlock.service';
import { PayoutService } from './payout.service';
import { ReconciliationService } from './reconciliation.service';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { RaceAddressEntity } from '../race/entities/race-address.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([OnchainEventEntity, RaceAddressEntity]),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    FiroRpcService,
    ChainWatcherService,
    AddressManagerService,
    TxClassifierService,
    InstantLockService,
    PayoutService,
    ReconciliationService,
  ],
  exports: [
    FiroRpcService,
    ChainWatcherService,
    AddressManagerService,
    TxClassifierService,
    InstantLockService,
    PayoutService,
    ReconciliationService,
  ],
})
export class FiroModule {}
