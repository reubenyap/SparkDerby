import { Injectable, Logger } from '@nestjs/common';
import { FiroRpcService } from './firo-rpc.service';
import { RedisService } from '../../config/redis.config';
import { IntentType } from '@sparkderby/shared';

interface ResolvedIntent {
  raceId: string;
  racerId: string;
  intent: IntentType;
}

interface RaceAddressMap {
  [racerId: string]: Record<IntentType, string>;
}

@Injectable()
export class AddressManagerService {
  private readonly logger = new Logger(AddressManagerService.name);

  constructor(
    private readonly firoRpc: FiroRpcService,
    private readonly redis: RedisService,
  ) {}

  async generateRaceAddresses(
    raceId: string,
    racerIds: string[],
  ): Promise<RaceAddressMap> {
    const intents: IntentType[] = ['back', 'boost', 'emp', 'oil_slick', 'overclock', 'black_swan'];
    const addressMap: RaceAddressMap = {};

    for (const racerId of racerIds) {
      addressMap[racerId] = {} as Record<IntentType, string>;

      for (const intent of intents) {
        const address = await this.firoRpc.getNewSparkAddress(
          `${raceId}:${racerId}:${intent}`,
        );
        addressMap[racerId][intent] = address;

        // Cache in Redis with 13h TTL
        await this.redis.set(
          `addr:${address}`,
          JSON.stringify({ raceId, racerId, intent }),
          13 * 60 * 60,
        );
      }
    }

    this.logger.log(
      `Generated ${racerIds.length * intents.length} addresses for race ${raceId}`,
    );
    return addressMap;
  }

  async resolveAddress(sparkAddress: string): Promise<ResolvedIntent | null> {
    const cached = await this.redis.get(`addr:${sparkAddress}`);
    if (cached) {
      return JSON.parse(cached) as ResolvedIntent;
    }

    // TODO: Fall back to DB lookup if Redis cache miss
    return null;
  }

  async getRaceAddresses(raceId: string): Promise<RaceAddressMap> {
    // TODO: Query DB for all addresses for this race
    this.logger.warn(`getRaceAddresses not yet implemented for race ${raceId}`);
    return {};
  }
}
