import { Archetype } from '../types/race';

export type SpeedCurve = 'flat' | 'front' | 'back' | 'variable' | 'resilient' | 'technical';

export interface ArchetypeProfile {
  baseSpeed: number;
  speedCurve: SpeedCurve;
  staminaDecay: number;
  staminaThreshold: number;
  luckRange: [number, number];
  debuffResistance: number;
  buffAmplification: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeProfile> = {
  balanced: {
    baseSpeed: 4.2,
    speedCurve: 'flat',
    staminaDecay: 3.5,
    staminaThreshold: 30,
    luckRange: [-0.3, 0.3],
    debuffResistance: 0.2,
    buffAmplification: 1.0,
  },
  sprinter: {
    baseSpeed: 5.5,
    speedCurve: 'front',
    staminaDecay: 5.0,
    staminaThreshold: 40,
    luckRange: [-0.2, 0.2],
    debuffResistance: 0.0,
    buffAmplification: 0.9,
  },
  closer: {
    baseSpeed: 3.2,
    speedCurve: 'back',
    staminaDecay: 2.5,
    staminaThreshold: 20,
    luckRange: [-0.2, 0.4],
    debuffResistance: 0.1,
    buffAmplification: 1.2,
  },
  tank: {
    baseSpeed: 3.8,
    speedCurve: 'resilient',
    staminaDecay: 2.0,
    staminaThreshold: 15,
    luckRange: [-0.1, 0.1],
    debuffResistance: 0.5,
    buffAmplification: 0.7,
  },
  wildcard: {
    baseSpeed: 4.0,
    speedCurve: 'variable',
    staminaDecay: 3.5,
    staminaThreshold: 25,
    luckRange: [-1.0, 1.2],
    debuffResistance: 0.15,
    buffAmplification: 1.1,
  },
  technician: {
    baseSpeed: 4.0,
    speedCurve: 'technical',
    staminaDecay: 3.0,
    staminaThreshold: 25,
    luckRange: [-0.2, 0.3],
    debuffResistance: 0.3,
    buffAmplification: 1.4,
  },
};
