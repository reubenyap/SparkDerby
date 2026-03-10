import {
  Controller, Post, Get, Param, Body, HttpCode, Logger,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { RaceService } from '../race/race.service';
import { SettlementService } from '../settlement/settlement.service';
import { FiroRpcService } from '../firo/firo-rpc.service';
import { ReconciliationService } from '../firo/reconciliation.service';
import { ChainWatcherService } from '../firo/chain-watcher.service';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly raceService: RaceService,
    private readonly settlementService: SettlementService,
    private readonly firoRpc: FiroRpcService,
    private readonly reconciliation: ReconciliationService,
    private readonly chainWatcher: ChainWatcherService,
  ) {}

  /* ── System status ────────────────────────────────────────────────── */

  @Get('status')
  async getStatus() {
    const adapterName = this.firoRpc.adapter.name;
    const alive = await this.firoRpc.ping();
    let balance = { available: 0, pending: 0 };
    let blockchainInfo = { blocks: 0, bestBlockHash: '', chain: '' };

    try {
      balance = await this.firoRpc.getSparkBalance();
      blockchainInfo = await this.firoRpc.getBlockchainInfo();
    } catch { /* mock/offline mode */ }

    return {
      firoNode: alive ? (adapterName === 'mock' ? 'mock' : 'connected') : 'disconnected',
      adapter: adapterName,
      chainWatcher: this.chainWatcher.isRunning() ? 'polling' : 'idle',
      walletBalance: balance,
      blockchainInfo,
      uptime: process.uptime(),
    };
  }

  /* ── Race management ──────────────────────────────────────────────── */

  @Get('races/current')
  async getCurrentRace() {
    return this.raceService.getCurrentRace();
  }

  @Post('races/:raceId/settle')
  @HttpCode(200)
  async settleRace(@Param('raceId') raceId: string) {
    this.logger.log(`Admin triggered settlement for race ${raceId}`);
    const settlement = await this.settlementService.settleRace(raceId);
    return { settlement };
  }

  @Post('races/:raceId/cancel')
  @HttpCode(200)
  async cancelRace(@Param('raceId') raceId: string) {
    this.logger.warn(`Admin cancelled race ${raceId}`);
    await this.raceService.updateRaceStatus(raceId, 'cancelled');
    return { raceId, status: 'cancelled' };
  }

  @Post('races/:raceId/reconcile')
  @HttpCode(200)
  async reconcileRace(@Param('raceId') raceId: string) {
    this.logger.log(`Admin triggered reconciliation for race ${raceId}`);
    const report = await this.reconciliation.reconcileRace(this.firoRpc.adapter, raceId);
    return { report };
  }

  @Get('races/:raceId/settlement')
  async getSettlement(@Param('raceId') raceId: string) {
    const settlement = await this.settlementService.getSettlementByRace(raceId);
    return { settlement };
  }

  /* ── Chain watcher ────────────────────────────────────────────────── */

  @Post('watcher/poll')
  @HttpCode(200)
  async forcePoll() {
    this.logger.log('Admin triggered manual chain poll');
    await this.chainWatcher.poll();
    return { polled: true };
  }

  @Post('watcher/start')
  @HttpCode(200)
  async startWatcher() {
    this.chainWatcher.startPolling();
    return { running: true };
  }

  @Post('watcher/stop')
  @HttpCode(200)
  async stopWatcher() {
    this.chainWatcher.stopPolling();
    return { running: false };
  }

  /* ── Firo wallet ──────────────────────────────────────────────────── */

  @Get('wallet/balance')
  async getBalance() {
    return this.firoRpc.getSparkBalance();
  }

  @Get('wallet/blockchain')
  async getBlockchainInfo() {
    return this.firoRpc.getBlockchainInfo();
  }
}
