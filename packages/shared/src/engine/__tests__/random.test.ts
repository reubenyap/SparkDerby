import {
  generateServerSecret,
  hashServerSecret,
  deriveTickSeed,
  deriveRacerRandom,
  deriveChaosRoll,
  deriveShuffleOrder,
  deriveStormValues,
} from '../random';

describe('random', () => {
  const SECRET = 'a'.repeat(64);
  const RACE_ID = 'race-001';
  const ENTROPY = 'b'.repeat(64);

  describe('generateServerSecret', () => {
    it('generates a 64-char hex string', () => {
      const secret = generateServerSecret();
      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates unique secrets', () => {
      const a = generateServerSecret();
      const b = generateServerSecret();
      expect(a).not.toEqual(b);
    });
  });

  describe('hashServerSecret', () => {
    it('produces a 64-char hex SHA-256 hash', () => {
      const hash = hashServerSecret(SECRET);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', () => {
      expect(hashServerSecret(SECRET)).toEqual(hashServerSecret(SECRET));
    });

    it('differs for different inputs', () => {
      expect(hashServerSecret('a'.repeat(64))).not.toEqual(
        hashServerSecret('b'.repeat(64)),
      );
    });
  });

  describe('deriveTickSeed', () => {
    it('is deterministic for same inputs', () => {
      const a = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      const b = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      expect(a).toEqual(b);
    });

    it('differs for different ticks', () => {
      const a = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      const b = deriveTickSeed(SECRET, RACE_ID, 2, ENTROPY);
      expect(a).not.toEqual(b);
    });

    it('differs for different entropy', () => {
      const a = deriveTickSeed(SECRET, RACE_ID, 1, 'c'.repeat(64));
      const b = deriveTickSeed(SECRET, RACE_ID, 1, 'd'.repeat(64));
      expect(a).not.toEqual(b);
    });

    it('returns a 32-byte Buffer', () => {
      const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      expect(Buffer.isBuffer(seed)).toBe(true);
      expect(seed.length).toBe(32);
    });
  });

  describe('deriveRacerRandom', () => {
    const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);

    it('is deterministic', () => {
      const a = deriveRacerRandom(seed, 0, 0.5);
      const b = deriveRacerRandom(seed, 0, 0.5);
      expect(a).toEqual(b);
    });

    it('falls within [-variance, variance]', () => {
      for (let lane = 0; lane < 6; lane++) {
        const val = deriveRacerRandom(seed, lane, 0.5);
        expect(val).toBeGreaterThanOrEqual(-0.5);
        expect(val).toBeLessThanOrEqual(0.5);
      }
    });

    it('differs per lane', () => {
      const vals = Array.from({ length: 6 }, (_, i) =>
        deriveRacerRandom(seed, i, 0.5),
      );
      const unique = new Set(vals);
      expect(unique.size).toBe(6);
    });

    it('scales with variance', () => {
      const small = deriveRacerRandom(seed, 0, 0.1);
      expect(Math.abs(small)).toBeLessThanOrEqual(0.1);

      const large = deriveRacerRandom(seed, 0, 2.0);
      expect(Math.abs(large)).toBeLessThanOrEqual(2.0);
    });
  });

  describe('deriveChaosRoll', () => {
    it('returns a number 0-99', () => {
      const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      const roll = deriveChaosRoll(seed);
      expect(roll).toBeGreaterThanOrEqual(0);
      expect(roll).toBeLessThan(100);
    });

    it('is deterministic', () => {
      const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      expect(deriveChaosRoll(seed)).toEqual(deriveChaosRoll(seed));
    });
  });

  describe('deriveShuffleOrder', () => {
    it('returns a permutation of indices', () => {
      const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      const order = deriveShuffleOrder(seed, 6);
      expect(order).toHaveLength(6);
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('is deterministic', () => {
      const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      expect(deriveShuffleOrder(seed, 6)).toEqual(deriveShuffleOrder(seed, 6));
    });
  });

  describe('deriveStormValues', () => {
    it('returns values within [-3, 3]', () => {
      const seed = deriveTickSeed(SECRET, RACE_ID, 1, ENTROPY);
      const values = deriveStormValues(seed, 6);
      expect(values).toHaveLength(6);
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(-3);
        expect(v).toBeLessThanOrEqual(3);
      }
    });
  });
});
