import { Archetype } from '../types/race';

export type Phase = 'early' | 'mid' | 'late';

export interface ArchetypeEngine {
  speeds: { early: number; mid: number; late: number };
  variance: number;
  staminaDecay: number;
}

/**
 * Engine archetype profiles with phase-based speed curves.
 * All archetypes target ~96 expected distance over 24 ticks (no randomness).
 */
export const ENGINE_ARCHETYPES: Record<Archetype, ArchetypeEngine> = {
  balanced:   { speeds: { early: 4.00, mid: 4.00, late: 4.00 }, variance: 0.50, staminaDecay: 3.5 },
  sprinter:   { speeds: { early: 5.50, mid: 4.00, late: 2.83 }, variance: 0.50, staminaDecay: 5.0 },
  closer:     { speeds: { early: 2.83, mid: 4.00, late: 5.50 }, variance: 0.50, staminaDecay: 2.5 },
  tank:       { speeds: { early: 3.50, mid: 3.80, late: 4.70 }, variance: 0.30, staminaDecay: 2.0 },
  wildcard:   { speeds: { early: 4.00, mid: 4.00, late: 4.00 }, variance: 2.00, staminaDecay: 3.5 },
  technician: { speeds: { early: 3.80, mid: 4.50, late: 3.95 }, variance: 0.50, staminaDecay: 3.0 },
};

export function getPhase(tick: number): Phase {
  if (tick <= 8) return 'early';
  if (tick <= 16) return 'mid';
  return 'late';
}

export function getBaseSpeed(archetype: Archetype, tick: number): number {
  return ENGINE_ARCHETYPES[archetype].speeds[getPhase(tick)];
}

export function getVariance(archetype: Archetype): number {
  return ENGINE_ARCHETYPES[archetype].variance;
}

export function getStaminaDecay(archetype: Archetype): number {
  return ENGINE_ARCHETYPES[archetype].staminaDecay;
}

/** Expected total distance over 24 ticks with no randomness or effects. */
export function expectedDistance(archetype: Archetype): number {
  const p = ENGINE_ARCHETYPES[archetype].speeds;
  return p.early * 8 + p.mid * 8 + p.late * 8;
}
