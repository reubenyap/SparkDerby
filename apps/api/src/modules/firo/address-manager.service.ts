import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiroRpcService } from './firo-rpc.service';
import { RedisService } from '../../config/redis.config';
import { IntentType, AddressIntent, SparkAddress } from '@sparkderby/shared';
import { RaceAddressEntity } from '../race/entities/race-address.entity';

interface RaceAddressMap {
  [racerId: string]: Record<IntentType, string>;
}

/**
 * AddressManagerService – generates per-racer, per-intent Spark addresses
 * for each race. Each address encodes an intent triple (raceId, racerId, intentType)
 * so incoming transactions can be classified without any metadata lookup.
 *
 * Resolution order: Redis cache → DB fallback.
 */
@Injectable()
export class AddressManagerService {
  private readonly logger = new Logger(AddressManagerService.name);

  constructor(
    private readonly firoRpc: FiroRpcService,
    private readonly redis: RedisService,
    @InjectRepository(RaceAddressEntity)
    private readonly raceAddrRepo: Repository<RaceAddressEntity>,
  ) {}

  /**
   * Generate one Spark address per (racer × intent) combination.
   * Addresses are cached in Redis and persisted in the DB.
   */
  async generateRaceAddresses(
    raceId: string,
    racerIds: string[],
  ): Promise<RaceAddressMap> {
    const intents: IntentType[] = ['back', 'boost', 'emp', 'oil_slick', 'overclock', 'black_swan'];
    const addressMap: RaceAddressMap = {};

    for (const racerId of racerIds) {
      addressMap[racerId] = {} as Record<IntentType, string>;

      for (const intent of intents) {
        const memo = `${raceId}:${racerId}:${intent}`;
        const address = await this.firoRpc.getNewSparkAddress(memo);
        addressMap[racerId][intent] = address;

        // Cache in Redis with 13h TTL
        const intentData: AddressIntent = { raceId, racerId, intent };
        await this.redis.set(
          `addr:${address}`,
          JSON.stringify(intentData),
          13 * 60 * 60,
        );

        // Persist to DB
        const entity = this.raceAddrRepo.create({
          raceId,
          racerId,
          intent,
          sparkAddress: address,
        });
        await this.raceAddrRepo.save(entity);
      }
    }

    this.logger.log(
      `Generated ${racerIds.length * intents.length} addresses for race ${raceId}`,
    );
    return addressMap;
  }

  /**
   * Resolve a Spark address to its intent triple.
   * Checks Redis first, then falls back to DB.
   */
  async resolveAddress(sparkAddress: SparkAddress): Promise<AddressIntent | null> {
    // 1. Redis cache
    const cached = await this.redis.get(`addr:${sparkAddress}`);
    if (cached) {
      return JSON.parse(cached) as AddressIntent;
    }

    // 2. DB fallback
    const dbRecord = await this.raceAddrRepo.findOne({
      where: { sparkAddress },
    });
    if (dbRecord) {
      const intent: AddressIntent = {
        raceId: dbRecord.raceId,
        racerId: dbRecord.racerId,
        intent: dbRecord.intent as IntentType,
      };
      // Re-cache for future lookups
      await this.redis.set(
        `addr:${sparkAddress}`,
        JSON.stringify(intent),
        13 * 60 * 60,
      );
      return intent;
    }

    return null;
  }

  /**
   * Get all addresses for a race (from DB).
   */
  async getRaceAddresses(raceId: string): Promise<RaceAddressMap> {
    const records = await this.raceAddrRepo.find({ where: { raceId } });
    const addressMap: RaceAddressMap = {};

    for (const record of records) {
      if (!addressMap[record.racerId]) {
        addressMap[record.racerId] = {} as Record<IntentType, string>;
      }
      addressMap[record.racerId][record.intent as IntentType] = record.sparkAddress;
    }

    return addressMap;
  }

  /**
   * Validate a Spark address using the adapter.
   */
  async validateAddress(address: string): Promise<boolean> {
    return this.firoRpc.adapter.validateSparkAddress(address);
  }

  /**
   * Resolve a Spark Name (e.g., "alice.spark") to a Spark address.
   */
  async resolveSparkName(name: string): Promise<SparkAddress | null> {
    const resolution = await this.firoRpc.adapter.resolveSparkName(name);
    return resolution.resolved ? resolution.address : null;
  }
}
