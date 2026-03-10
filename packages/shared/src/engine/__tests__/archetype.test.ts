import {
  getPhase,
  getBaseSpeed,
  getVariance,
  expectedDistance,
} from '../archetype';
import { Archetype } from '../../types/race';

describe('archetype', () => {
  describe('getPhase', () => {
    it('returns early for ticks 1-8', () => {
      for (let t = 1; t <= 8; t++) expect(getPhase(t)).toBe('early');
    });

    it('returns mid for ticks 9-16', () => {
      for (let t = 9; t <= 16; t++) expect(getPhase(t)).toBe('mid');
    });

    it('returns late for ticks 17-24', () => {
      for (let t = 17; t <= 24; t++) expect(getPhase(t)).toBe('late');
    });
  });

  describe('getBaseSpeed', () => {
    it('returns correct phase speed for balanced', () => {
      expect(getBaseSpeed('balanced', 1)).toBe(4.0);
      expect(getBaseSpeed('balanced', 12)).toBe(4.0);
      expect(getBaseSpeed('balanced', 24)).toBe(4.0);
    });

    it('sprinter is faster early, slower late', () => {
      expect(getBaseSpeed('sprinter', 1)).toBeGreaterThan(
        getBaseSpeed('sprinter', 24),
      );
    });

    it('closer is slower early, faster late', () => {
      expect(getBaseSpeed('closer', 1)).toBeLessThan(
        getBaseSpeed('closer', 24),
      );
    });
  });

  describe('equal expected value', () => {
    const archetypes: Archetype[] = [
      'balanced',
      'sprinter',
      'closer',
      'tank',
      'wildcard',
      'technician',
    ];

    it('all archetypes have expected distance near 96', () => {
      for (const a of archetypes) {
        const d = expectedDistance(a);
        expect(d).toBeGreaterThanOrEqual(95);
        expect(d).toBeLessThanOrEqual(99);
      }
    });

    it('balanced, wildcard expected distance is exactly 96', () => {
      expect(expectedDistance('balanced')).toBeCloseTo(96.0, 5);
      expect(expectedDistance('wildcard')).toBeCloseTo(96.0, 5);
    });

    it('sprinter and closer are symmetric', () => {
      expect(expectedDistance('sprinter')).toBeCloseTo(
        expectedDistance('closer'),
        5,
      );
    });
  });

  describe('variance differentiation', () => {
    it('tank has lowest variance', () => {
      const archetypes: Archetype[] = [
        'balanced',
        'sprinter',
        'closer',
        'tank',
        'wildcard',
        'technician',
      ];
      for (const a of archetypes) {
        expect(getVariance('tank')).toBeLessThanOrEqual(getVariance(a));
      }
    });

    it('wildcard has highest variance', () => {
      const archetypes: Archetype[] = [
        'balanced',
        'sprinter',
        'closer',
        'tank',
        'wildcard',
        'technician',
      ];
      for (const a of archetypes) {
        expect(getVariance('wildcard')).toBeGreaterThanOrEqual(getVariance(a));
      }
    });
  });
});
