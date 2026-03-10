import { Injectable, Logger } from '@nestjs/common';
import { RaceGateway } from '../race/race.gateway';
import { TelegramService } from '../telegram/telegram.service';

/**
 * BroadcastService — fan-out layer that routes game events
 * to both WebSocket clients and the Telegram channel.
 */
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly gateway: RaceGateway,
    private readonly telegram: TelegramService,
  ) {}

  emitToRace(raceId: string, event: string, data: unknown): void {
    this.gateway.emitToRace(raceId, event, data);
    this.logger.debug(`WS emit ${event} to race ${raceId}`);
  }

  emitToAll(event: string, data: unknown): void {
    this.gateway.emitToAll(event, data);
    this.logger.debug(`WS emit ${event} to all`);
  }

  async broadcastRaceOpen(raceSlot: string, raceDate: string, racerNames: string[]): Promise<void> {
    await this.telegram.broadcastRaceOpen(raceSlot, raceDate, racerNames);
  }

  async broadcastStandings(
    raceSlot: string, tick: number,
    standings: Array<{ name: string; position: number; totalBacked: number }>,
  ): Promise<void> {
    await this.telegram.broadcastStandings(raceSlot, tick, standings);
  }

  async broadcastPodium(
    raceSlot: string,
    podium: Array<{ place: number; name: string; prizePool: number }>,
    totalPrizePool: number,
  ): Promise<void> {
    await this.telegram.broadcastPodium(raceSlot, podium, totalPrizePool);
  }

  async broadcastChaosEvent(raceSlot: string, description: string): Promise<void> {
    await this.telegram.broadcastChaosEvent(raceSlot, description);
  }
}
