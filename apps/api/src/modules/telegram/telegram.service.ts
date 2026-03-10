import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CHAIN_TX_CLASSIFIED, ChainTxClassifiedEvent } from '../firo/chain-watcher.service';
import {
  SETTLEMENT_COMPLETED,
  SETTLEMENT_FAILED,
  SettlementEvent,
} from '../settlement/settlement.service';

/**
 * TelegramService — public channel broadcast worker.
 *
 * Rules:
 * - Public channel feed ONLY — no per-user messaging
 * - Broadcasts: race open, standings updates, major actions,
 *   chaos events, final podium, prize pool summary
 *
 * Uses the Telegram Bot API (sendMessage to a channel).
 * When TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is empty,
 * runs in log-only mode (no actual HTTP calls).
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private botToken = '';
  private channelId = '';
  private enabled = false;

  private static readonly API_BASE = 'https://api.telegram.org/bot';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.channelId = this.configService.get<string>('TELEGRAM_CHANNEL_ID', '');
    this.enabled = !!this.botToken && !!this.channelId;

    if (this.enabled) {
      this.logger.log(`Telegram broadcast enabled → channel ${this.channelId}`);
    } else {
      this.logger.warn('Telegram broadcast disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID)');
    }
  }

  /* ── Public broadcast methods ──────────────────────────────────────── */

  async broadcastRaceOpen(raceSlot: string, raceDate: string, racerNames: string[]): Promise<void> {
    const racerList = racerNames.map((n, i) => `  ${i + 1}. ${n}`).join('\n');
    await this.send(
      `🏁 *RACE ${raceSlot} OPEN*\n` +
      `📅 ${raceDate}\n\n` +
      `Racers:\n${racerList}\n\n` +
      `Back your racer now! Send FIRO to their Spark address.`,
    );
  }

  async broadcastStandings(raceSlot: string, tick: number, standings: Array<{ name: string; position: number; totalBacked: number }>): Promise<void> {
    const lines = standings.map((s, i) =>
      `  ${i + 1}. ${s.name} — ${s.position.toFixed(1)}% (${s.totalBacked.toFixed(1)} F)`,
    ).join('\n');
    await this.send(
      `📊 *RACE ${raceSlot} — Tick ${tick}*\n\n${lines}`,
    );
  }

  async broadcastAction(raceSlot: string, actionType: string, racerName: string, amount: number): Promise<void> {
    const icons: Record<string, string> = {
      boost: '⚡', emp: '💥', oil_slick: '🛢', overclock: '⚙️', black_swan: '🦆',
    };
    const icon = icons[actionType] || '🎯';
    await this.send(
      `${icon} *${actionType.replace('_', ' ').toUpperCase()}* on ${racerName}\n` +
      `Race ${raceSlot} — ${amount} FIRO`,
    );
  }

  async broadcastChaosEvent(raceSlot: string, description: string): Promise<void> {
    await this.send(`🌪 *CHAOS EVENT* — Race ${raceSlot}\n${description}`);
  }

  async broadcastPodium(
    raceSlot: string,
    podium: Array<{ place: number; name: string; prizePool: number }>,
    totalPrizePool: number,
  ): Promise<void> {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = podium.map(p =>
      `${medals[p.place - 1] || ''} ${p.place}. ${p.name} — ${p.prizePool.toFixed(2)} FIRO`,
    ).join('\n');
    await this.send(
      `🏆 *RACE ${raceSlot} FINISHED*\n\n${lines}\n\n` +
      `💰 Total prize pool: ${totalPrizePool.toFixed(2)} FIRO\n` +
      `Payouts sent via Spark!`,
    );
  }

  async broadcastPrizePoolUpdate(raceSlot: string, totalPool: number): Promise<void> {
    await this.send(`💰 Race ${raceSlot} prize pool: *${totalPool.toFixed(2)} FIRO*`);
  }

  /* ── Event listeners ───────────────────────────────────────────────── */

  @OnEvent(CHAIN_TX_CLASSIFIED)
  async onTxClassified(event: ChainTxClassifiedEvent): Promise<void> {
    const { classification } = event;
    if (classification.kind === 'action') {
      // Broadcast major actions (only debuffs, chaos, and overclock — skip boost to reduce noise)
      if (classification.actionType !== 'boost') {
        await this.broadcastAction('', classification.actionType, classification.racerId, classification.amount);
      }
    }
  }

  @OnEvent(SETTLEMENT_COMPLETED)
  async onSettlementCompleted(event: SettlementEvent): Promise<void> {
    if (event.totalPrizePool) {
      await this.send(
        `✅ *Settlement complete* for race\n` +
        `💰 ${event.totalPrizePool.toFixed(2)} FIRO distributed to ${event.payoutCount} winners`,
      );
    }
  }

  @OnEvent(SETTLEMENT_FAILED)
  async onSettlementFailed(event: SettlementEvent): Promise<void> {
    await this.send(`⚠️ *Settlement failed*: ${event.error}`);
  }

  /* ── Transport ─────────────────────────────────────────────────────── */

  private async send(text: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[Telegram-dry] ${text.replace(/\n/g, ' | ')}`);
      return;
    }

    try {
      const url = `${TelegramService.API_BASE}${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.channelId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram send failed: ${res.status} ${body}`);
      }
    } catch (err) {
      this.logger.error(`Telegram send error: ${err}`);
    }
  }
}
