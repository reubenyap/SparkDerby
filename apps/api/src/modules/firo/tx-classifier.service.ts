import { Injectable, Logger } from '@nestjs/common';
import {
  TxClassification,
  SparkMintInfo,
  AddressIntent,
} from '@sparkderby/shared';
import { AddressManagerService } from './address-manager.service';

/**
 * TxClassifierService – inspects inbound Spark transactions and classifies
 * them into race actions (backing, boost, emp, etc.), payouts, treasury,
 * or reserve transfers.
 *
 * Classification is driven entirely by address-encoded intent: each race
 * address maps to a (raceId, racerId, intentType) triple stored in Redis.
 */
@Injectable()
export class TxClassifierService {
  private readonly logger = new Logger(TxClassifierService.name);

  constructor(private readonly addressManager: AddressManagerService) {}

  /**
   * Classify a single incoming Spark mint.
   *
   * Resolution order:
   * 1. Address lookup in Redis/DB → race intent (backing or action)
   * 2. Memo-based fallback for treasury / reserve labels
   * 3. Unknown
   */
  async classify(mint: SparkMintInfo): Promise<TxClassification> {
    // 1. Try address-encoded intent resolution
    const intent = await this.addressManager.resolveAddress(mint.sparkAddress);
    if (intent) {
      return this.intentToClassification(intent, mint.amount);
    }

    // 2. Memo-based classification for system addresses
    const memoClass = this.classifyByMemo(mint);
    if (memoClass) return memoClass;

    // 3. Unknown transaction
    this.logger.warn(`Unknown tx ${mint.txid} to ${mint.sparkAddress} (${mint.amount} FIRO)`);
    return { kind: 'unknown', txid: mint.txid };
  }

  /**
   * Classify a batch of mints. Returns classifications in the same order.
   */
  async classifyBatch(mints: SparkMintInfo[]): Promise<TxClassification[]> {
    return Promise.all(mints.map(m => this.classify(m)));
  }

  private intentToClassification(
    intent: AddressIntent,
    amount: number,
  ): TxClassification {
    if (intent.intent === 'back') {
      return {
        kind: 'backing',
        raceId: intent.raceId,
        racerId: intent.racerId,
        amount,
      };
    }
    return {
      kind: 'action',
      raceId: intent.raceId,
      racerId: intent.racerId,
      actionType: intent.intent,
      amount,
    };
  }

  private classifyByMemo(mint: SparkMintInfo): TxClassification | null {
    const memo = (mint.memo || '').toLowerCase().trim();
    if (memo.startsWith('treasury')) {
      return { kind: 'treasury', amount: mint.amount };
    }
    if (memo.startsWith('reserve')) {
      return { kind: 'reserve', amount: mint.amount };
    }
    if (memo.startsWith('payout:')) {
      // payout:<raceId>:<playerId>
      const parts = memo.split(':');
      if (parts.length >= 3) {
        return {
          kind: 'payout',
          raceId: parts[1],
          playerId: parts[2],
          amount: mint.amount,
        };
      }
    }
    return null;
  }
}
