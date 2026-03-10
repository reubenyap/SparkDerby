import { createHmac, createHash, randomBytes } from 'crypto';

export function generateServerSecret(): string {
  return randomBytes(32).toString('hex');
}

export function hashServerSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function deriveTickSeed(
  serverSecret: string,
  raceId: string,
  tick: number,
  publicEntropy: string,
): Buffer {
  return createHmac('sha256', serverSecret)
    .update(`${raceId}:${tick}:${publicEntropy}`)
    .digest();
}

export function deriveRacerRandom(
  tickSeed: Buffer,
  lane: number,
  variance: number,
): number {
  const racerBytes = createHmac('sha256', tickSeed)
    .update(`racer:${lane}`)
    .digest();
  const uint32 = racerBytes.readUInt32BE(0);
  const normalized = (uint32 / 0xFFFFFFFF) * 2 - 1;
  return normalized * variance;
}

export function deriveChaosRoll(tickSeed: Buffer): number {
  const chaosBytes = createHmac('sha256', tickSeed)
    .update('chaos')
    .digest();
  return chaosBytes.readUInt32BE(0) % 100;
}

export function deriveShuffleOrder(tickSeed: Buffer, count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const bytes = createHmac('sha256', tickSeed)
      .update(`shuffle:${i}`)
      .digest();
    const j = bytes.readUInt32BE(0) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function deriveStormValues(tickSeed: Buffer, count: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = createHmac('sha256', tickSeed)
      .update(`storm:${i}`)
      .digest();
    const uint32 = bytes.readUInt32BE(0);
    const normalized = (uint32 / 0xFFFFFFFF) * 2 - 1;
    values.push(normalized * 3.0);
  }
  return values;
}
