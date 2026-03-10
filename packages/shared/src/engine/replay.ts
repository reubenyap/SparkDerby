import {
  ReplayLog,
  RaceConfig,
  EngineAction,
  TickResult,
  FinishEntry,
} from './types';
import { hashServerSecret } from './random';
import { runRace } from './race';

export function generateReplayLog(
  config: RaceConfig,
  serverSecret: string,
  serverSecretHash: string,
  publicEntropies: Record<number, string>,
  actions: EngineAction[],
  ticks: TickResult[],
  finishOrder: FinishEntry[],
): ReplayLog {
  return {
    version: '1.0',
    raceId: config.raceId,
    serverSecretHash,
    serverSecret,
    racers: config.racers,
    publicEntropies,
    actions,
    ticks,
    finishOrder,
  };
}

/**
 * Verify a replay log by re-running the race and comparing results.
 * Returns { valid: true } if the replay is consistent, or { valid: false, reason } if not.
 */
export function verifyReplayLog(
  log: ReplayLog,
): { valid: boolean; reason?: string } {
  // Step 1: Verify server secret hash
  if (hashServerSecret(log.serverSecret) !== log.serverSecretHash) {
    return { valid: false, reason: 'Server secret hash mismatch' };
  }

  // Step 2: Re-run the race
  const result = runRace({
    config: {
      raceId: log.raceId,
      serverSecret: log.serverSecret,
      racers: log.racers,
    },
    publicEntropies: log.publicEntropies,
    actions: log.actions,
  });

  // Step 3: Compare tick seeds
  for (let i = 0; i < result.ticks.length; i++) {
    if (result.ticks[i].seed !== log.ticks[i].seed) {
      return { valid: false, reason: `Tick ${i + 1} seed mismatch` };
    }
  }

  // Step 4: Compare finish order
  for (let i = 0; i < result.finishOrder.length; i++) {
    if (result.finishOrder[i].racerId !== log.finishOrder[i].racerId) {
      return {
        valid: false,
        reason: `Finish order mismatch at place ${i + 1}`,
      };
    }
  }

  return { valid: true };
}
