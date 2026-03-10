import { ActionType } from '../types/action';
import {
  ACTION_DEFINITIONS,
  DIMINISHING_FACTOR,
  ACTION_RATE_LIMIT_SECONDS,
  BLACK_SWAN_LIMIT_PER_RACE,
} from '../constants/actions';
import {
  EngineAction,
  ActiveEffect,
  ActionValidation,
  ChaosEvent,
} from './types';
import {
  deriveChaosRoll,
  deriveShuffleOrder,
  deriveStormValues,
} from './random';

const DIMINISHING_WINDOW_MS = 5 * 60 * 1000;

export function validateAction(
  action: EngineAction,
  priorValidActions: EngineAction[],
): ActionValidation {
  const tooRecent = priorValidActions.some(
    (a) =>
      a.playerId === action.playerId &&
      action.submittedAt - a.submittedAt >= 0 &&
      action.submittedAt - a.submittedAt < ACTION_RATE_LIMIT_SECONDS * 1000,
  );
  if (tooRecent) {
    return { valid: false, reason: 'cooldown' };
  }

  if (action.actionType === 'black_swan') {
    const existingChaos = priorValidActions.filter(
      (a) => a.playerId === action.playerId && a.actionType === 'black_swan',
    );
    if (existingChaos.length >= BLACK_SWAN_LIMIT_PER_RACE) {
      return { valid: false, reason: 'chaos_limit' };
    }
  }

  return { valid: true };
}

export function computeDiminishingFactor(
  targetRacerId: string,
  submittedAt: number,
  priorValidActions: EngineAction[],
): number {
  const recentDebuffs = priorValidActions.filter(
    (a) =>
      a.targetRacerId === targetRacerId &&
      isDebuff(a.actionType) &&
      submittedAt - a.submittedAt < DIMINISHING_WINDOW_MS,
  );
  return Math.pow(DIMINISHING_FACTOR, recentDebuffs.length);
}

function isDebuff(actionType: ActionType): boolean {
  return ACTION_DEFINITIONS[actionType].type === 'debuff';
}

export function createMultiTickEffect(
  action: EngineAction,
  tick: number,
  diminishFactor: number,
): ActiveEffect | null {
  const def = ACTION_DEFINITIONS[action.actionType];

  if (action.actionType === 'oil_slick') {
    return {
      type: 'debuff',
      source: 'oil_slick',
      targetRacerId: action.targetRacerId,
      magnitude: -(def.baseMagnitude * diminishFactor),
      ticksRemaining: def.duration,
      appliedAtTick: tick,
      playerId: action.playerId,
    };
  }

  if (action.actionType === 'overclock') {
    return {
      type: 'buff',
      source: 'overclock',
      targetRacerId: action.targetRacerId,
      magnitude: def.baseMagnitude,
      ticksRemaining: def.duration,
      appliedAtTick: tick,
      playerId: action.playerId,
    };
  }

  return null;
}

export function determineChaosEvent(
  tickSeed: Buffer,
  racerPositions: Array<{ racerId: string; position: number }>,
): ChaosEvent {
  const roll = deriveChaosRoll(tickSeed);
  const sorted = [...racerPositions].sort((a, b) => b.position - a.position);

  if (roll < 25) return positionShuffle(tickSeed, racerPositions);
  if (roll < 50) return freezeLeader(sorted);
  if (roll < 75) return boostUnderdogs(sorted);
  return speedStorm(tickSeed, racerPositions);
}

function positionShuffle(
  tickSeed: Buffer,
  racers: Array<{ racerId: string; position: number }>,
): ChaosEvent {
  const positions = racers.map((r) => r.position);
  const order = deriveShuffleOrder(tickSeed, racers.length);
  const effects: Record<string, number> = {};
  for (let i = 0; i < racers.length; i++) {
    effects[racers[i].racerId] = positions[order[i]];
  }
  return {
    type: 'position_shuffle',
    description: 'All positions shuffled!',
    effects,
  };
}

function freezeLeader(
  sorted: Array<{ racerId: string; position: number }>,
): ChaosEvent {
  return {
    type: 'freeze_leader',
    description: 'Leader frozen for next tick!',
    effects: { [sorted[0].racerId]: 0 },
  };
}

function boostUnderdogs(
  sorted: Array<{ racerId: string; position: number }>,
): ChaosEvent {
  const bottom3 = sorted.slice(-3);
  const effects: Record<string, number> = {};
  for (const r of bottom3) effects[r.racerId] = 2.0;
  return {
    type: 'boost_underdogs',
    description: 'Bottom 3 racers surging!',
    effects,
  };
}

function speedStorm(
  tickSeed: Buffer,
  racers: Array<{ racerId: string; position: number }>,
): ChaosEvent {
  const values = deriveStormValues(tickSeed, racers.length);
  const effects: Record<string, number> = {};
  racers.forEach((r, i) => {
    effects[r.racerId] = values[i];
  });
  return {
    type: 'speed_storm',
    description: 'Speed storm hits all racers!',
    effects,
  };
}
