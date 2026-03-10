import { TICKS_PER_RACE } from '../constants/race';
import {
  RaceConfig,
  RaceResult,
  RacerState,
  EngineAction,
  ActiveEffect,
  FinishEntry,
  TickResult,
} from './types';
import { hashServerSecret } from './random';
import { processTick } from './tick';

export interface RaceInput {
  config: RaceConfig;
  publicEntropies: Record<number, string>;
  actions: EngineAction[];
}

/**
 * Run a complete 24-tick race. Fully deterministic: identical inputs always
 * produce identical outputs, enabling post-race auditing and replay.
 */
export function runRace(input: RaceInput): RaceResult {
  const { config, publicEntropies, actions } = input;

  const racers: RacerState[] = config.racers.map((r) => ({
    ...r,
    position: 0,
    stamina: 100,
    finishTick: null,
  }));

  let activeEffects: ActiveEffect[] = [];
  let allValidActions: EngineAction[] = [];
  const ticks: TickResult[] = [];

  for (let tick = 1; tick <= TICKS_PER_RACE; tick++) {
    const entropy = publicEntropies[tick] || '0'.repeat(64);
    const tickActions = actions.filter((a) => a.tick === tick);

    const output = processTick({
      raceId: config.raceId,
      serverSecret: config.serverSecret,
      tick,
      publicEntropy: entropy,
      racers,
      pendingActions: tickActions,
      activeEffects,
      priorValidActions: allValidActions,
    });

    ticks.push(output.result);
    activeEffects = output.updatedEffects;
    allValidActions = [...allValidActions, ...output.newlyValidatedActions];
  }

  const finishOrder = determineFinishOrder(racers);

  return {
    raceId: config.raceId,
    ticks,
    finishOrder,
    serverSecret: config.serverSecret,
    serverSecretHash: hashServerSecret(config.serverSecret),
  };
}

function determineFinishOrder(racers: RacerState[]): FinishEntry[] {
  const sorted = [...racers].sort((a, b) => {
    // Primary: highest position first
    if (b.position !== a.position) return b.position - a.position;
    // Tiebreak: earlier finish tick wins
    if (a.finishTick !== null && b.finishTick !== null)
      return a.finishTick - b.finishTick;
    if (a.finishTick !== null) return -1;
    if (b.finishTick !== null) return 1;
    // Final tiebreak: lower lane number
    return a.lane - b.lane;
  });

  return sorted.map((r, i) => ({
    racerId: r.id,
    name: r.name,
    position: r.position,
    finishTick: r.finishTick,
    place: i + 1,
  }));
}
