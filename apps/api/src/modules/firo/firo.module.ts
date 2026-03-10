import { Module } from '@nestjs/common';
import { FiroRpcService } from './firo-rpc.service';
import { ChainWatcherService } from './chain-watcher.service';
import { AddressManagerService } from './address-manager.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FiroRpcService, ChainWatcherService, AddressManagerService],
  exports: [FiroRpcService, ChainWatcherService, AddressManagerService],
})
export class FiroModule {}
