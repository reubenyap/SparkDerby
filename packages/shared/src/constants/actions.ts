import { ActionType } from '../types/action';

export interface ActionDefinition {
  cost: number;
  type: 'buff' | 'debuff' | 'chaos';
  baseMagnitude: number;
  duration: number;
  description: string;
}

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  boost: {
    cost: 0.1,
    type: 'buff',
    baseMagnitude: 0.8,
    duration: 2,
    description: 'Speed boost on target racer',
  },
  emp: {
    cost: 0.2,
    type: 'debuff',
    baseMagnitude: 1.2,
    duration: 2,
    description: 'Slows target racer',
  },
  oil_slick: {
    cost: 0.2,
    type: 'debuff',
    baseMagnitude: 12.0,
    duration: 1,
    description: 'Drains stamina of target racer',
  },
  overclock: {
    cost: 0.5,
    type: 'buff',
    baseMagnitude: 1.5,
    duration: 3,
    description: 'Strong speed boost on target racer',
  },
  black_swan: {
    cost: 1.0,
    type: 'chaos',
    baseMagnitude: 0,
    duration: 0,
    description: 'Dramatic random effect',
  },
};

/** Rate limit: 1 action per player per 60 seconds */
export const ACTION_RATE_LIMIT_SECONDS = 60;

/** Black swan limit: 1 per player per race */
export const BLACK_SWAN_LIMIT_PER_RACE = 1;

/** Diminishing returns factor for repeated debuffs */
export const DIMINISHING_FACTOR = 0.6;
