import { FINISH_LINE } from '../constants/race';
import { ACTION_DEFINITIONS } from '../constants/actions';
import { ActionType } from '../types/action';
import {
  RacerState,
  EngineAction,
  ActiveEffect,
  TickResult,
  RacerTickResult,
  AppliedActionResult,
  RejectedActionResult,
  ChaosEvent,
} from './types';
import { deriveTickSeed, deriveRacerRandom } from './random';
import { getBaseSpeed, getVariance, getStaminaDecay } from './archetype';
import {
  validateAction,
  computeDiminishingFactor,
  createMultiTickEffect,
  determineChaosEvent,
} from './actions';

export interface TickInput {
  raceId: string;
  serverSecret: string;
  tick: number;
  publicEntropy: string;
  racers: RacerState[];
  pendingActions: EngineAction[];
  activeEffects: ActiveEffect[];
  priorValidActions: EngineAction[];
}

export interface TickOutput {
  result: TickResult;
  updatedRacers: RacerState[];
  updatedEffects: ActiveEffect[];
  newlyValidatedActions: EngineAction[];
}

/**
 * Process a single tick of the race engine. Deterministic given identical inputs.
 *
 * Processing order:
 * 1. Derive tick seed from server secret + public entropy
 * 2. Validate pending actions (rate limits, chaos limits)
 * 3. Apply position_shuffle chaos immediately if triggered
 * 4. For each racer: base speed + random + existing effects + instant actions + chaos modifiers
 * 5. Register new multi-tick effects (applied starting NEXT tick)
 * 6. Decrement existing effects, remove expired
 */
export function processTick(input: TickInput): TickOutput {
  const {
    raceId,
    serverSecret,
    tick,
    publicEntropy,
    racers,
    pendingActions,
    activeEffects,
    priorValidActions,
  } = input;

  const tickSeed = deriveTickSeed(serverSecret, raceId, tick, publicEntropy);

  // --- Validate actions ---
  const applied: AppliedActionResult[] = [];
  const rejected: RejectedActionResult[] = [];
  const validActions: EngineAction[] = [];
  const runningValid = [...priorValidActions];

  const sortedActions = [...pendingActions].sort(
    (a, b) => a.submittedAt - b.submittedAt,
  );

  for (const action of sortedActions) {
    const validation = validateAction(action, runningValid);
    if (!validation.valid) {
      rejected.push({
        actionId: action.id,
        actionType: action.actionType,
        reason: validation.reason!,
      });
      continue;
    }
    validActions.push(action);
    runningValid.push(action);
  }

  // --- Chaos event ---
  let chaosEvent: ChaosEvent | null = null;
  const chaosAction = validActions.find((a) => a.actionType === 'black_swan');
  if (chaosAction) {
    const positions = racers.map((r) => ({
      racerId: r.id,
      position: r.position,
    }));
    chaosEvent = determineChaosEvent(tickSeed, positions);
  }

  // Apply position_shuffle before movement
  if (chaosEvent?.type === 'position_shuffle') {
    for (const racer of racers) {
      if (racer.finishTick !== null) continue;
      const newPos = chaosEvent.effects[racer.id];
      if (newPos !== undefined) {
        racer.position = Math.max(0, Math.min(newPos, FINISH_LINE - 0.01));
      }
    }
  }

  // --- Process each racer ---
  const racerResults: RacerTickResult[] = [];

  for (const racer of racers) {
    const previousPosition = racer.position;

    if (racer.finishTick !== null) {
      racerResults.push({
        racerId: racer.id,
        position: racer.position,
        previousPosition,
        speed: 0,
        stamina: racer.stamina,
        positionDelta: 0,
      });
      continue;
    }

    // Check freeze from previous tick's chaos
    const isFrozen = activeEffects.some(
      (e) => e.source === 'black_swan' && e.targetRacerId === racer.id,
    );

    let move: number;

    if (isFrozen) {
      move = 0;
    } else {
      move = getBaseSpeed(racer.archetype, tick);
      move += deriveRacerRandom(
        tickSeed,
        racer.lane,
        getVariance(racer.archetype),
      );

      // Existing multi-tick effects (from prior ticks)
      for (const effect of activeEffects) {
        if (effect.targetRacerId !== racer.id) continue;
        if (effect.source === 'black_swan') continue;
        move += effect.magnitude;
      }

      // Instant actions: boost and emp
      for (const action of validActions) {
        if (action.targetRacerId !== racer.id) continue;
        const def = ACTION_DEFINITIONS[action.actionType];

        if (action.actionType === 'boost') {
          move += def.baseMagnitude;
          applied.push({
            actionId: action.id,
            actionType: 'boost',
            targetRacerId: racer.id,
            effectMagnitude: def.baseMagnitude,
            playerSparkAddress: action.sparkAddress,
            diminishingFactor: 1.0,
          });
        } else if (action.actionType === 'emp') {
          const diminish = computeDiminishingFactor(
            racer.id,
            action.submittedAt,
            priorValidActions,
          );
          const mag = def.baseMagnitude * diminish;
          move -= mag;
          applied.push({
            actionId: action.id,
            actionType: 'emp',
            targetRacerId: racer.id,
            effectMagnitude: -mag,
            playerSparkAddress: action.sparkAddress,
            diminishingFactor: diminish,
          });
        }
      }

      // Chaos effects applied this tick (except position_shuffle and freeze_leader)
      if (
        chaosEvent &&
        chaosEvent.type !== 'position_shuffle' &&
        chaosEvent.type !== 'freeze_leader'
      ) {
        const modifier = chaosEvent.effects[racer.id];
        if (modifier !== undefined) {
          move += modifier;
        }
      }
    }

    move = Math.max(move, 0);
    racer.position = Math.min(racer.position + move, FINISH_LINE);
    racer.stamina = Math.max(0, racer.stamina - getStaminaDecay(racer.archetype));

    if (racer.position >= FINISH_LINE && racer.finishTick === null) {
      racer.finishTick = tick;
    }

    racerResults.push({
      racerId: racer.id,
      position: racer.position,
      previousPosition,
      speed: move,
      stamina: racer.stamina,
      positionDelta: racer.position - previousPosition,
    });
  }

  // --- Record multi-tick action results ---
  for (const action of validActions) {
    if (action.actionType === 'oil_slick') {
      const diminish = computeDiminishingFactor(
        action.targetRacerId,
        action.submittedAt,
        priorValidActions,
      );
      applied.push({
        actionId: action.id,
        actionType: 'oil_slick',
        targetRacerId: action.targetRacerId,
        effectMagnitude: -(ACTION_DEFINITIONS.oil_slick.baseMagnitude * diminish),
        playerSparkAddress: action.sparkAddress,
        diminishingFactor: diminish,
      });
    } else if (action.actionType === 'overclock') {
      applied.push({
        actionId: action.id,
        actionType: 'overclock',
        targetRacerId: action.targetRacerId,
        effectMagnitude: ACTION_DEFINITIONS.overclock.baseMagnitude,
        playerSparkAddress: action.sparkAddress,
        diminishingFactor: 1.0,
      });
    } else if (action.actionType === 'black_swan') {
      applied.push({
        actionId: action.id,
        actionType: 'black_swan',
        targetRacerId: action.targetRacerId,
        effectMagnitude: 0,
        playerSparkAddress: action.sparkAddress,
        diminishingFactor: 1.0,
      });
    }
  }

  // --- Register new multi-tick effects (applied starting NEXT tick) ---
  const newEffects: ActiveEffect[] = [];

  for (const action of validActions) {
    const diminish = isDebuff(action.actionType)
      ? computeDiminishingFactor(
          action.targetRacerId,
          action.submittedAt,
          priorValidActions,
        )
      : 1.0;
    const effect = createMultiTickEffect(action, tick, diminish);
    if (effect) newEffects.push(effect);
  }

  // Freeze leader registers as a 1-tick debuff for the next tick
  if (chaosEvent?.type === 'freeze_leader' && chaosAction) {
    const leaderId = Object.keys(chaosEvent.effects)[0];
    newEffects.push({
      type: 'debuff',
      source: 'black_swan',
      targetRacerId: leaderId,
      magnitude: 0,
      ticksRemaining: 1,
      appliedAtTick: tick,
      playerId: chaosAction.playerId,
    });
  }

  // --- Decrement existing effects, remove expired ---
  const remainingOld = activeEffects
    .map((e) => ({ ...e, ticksRemaining: e.ticksRemaining - 1 }))
    .filter((e) => e.ticksRemaining > 0);

  const updatedEffects = [...remainingOld, ...newEffects];

  const commentary = generateCommentary(racerResults, applied, chaosEvent, tick);

  return {
    result: {
      tick,
      seed: tickSeed.toString('hex'),
      publicEntropy,
      racerStates: racerResults,
      actionsApplied: applied,
      actionsRejected: rejected,
      activeEffects: updatedEffects,
      chaosEvent,
      commentary,
    },
    updatedRacers: racers,
    updatedEffects,
    newlyValidatedActions: validActions,
  };
}

function isDebuff(actionType: ActionType): boolean {
  return ACTION_DEFINITIONS[actionType].type === 'debuff';
}

function generateCommentary(
  racerStates: RacerTickResult[],
  actions: AppliedActionResult[],
  chaos: ChaosEvent | null,
  tick: number,
): string {
  const parts: string[] = [];
  const sorted = [...racerStates].sort((a, b) => b.position - a.position);

  if (sorted.length > 0) {
    parts.push(
      `Tick ${tick}: ${sorted[0].racerId} leads at ${sorted[0].position.toFixed(1)}`,
    );
  }

  const bigMover = [...racerStates].sort(
    (a, b) => b.positionDelta - a.positionDelta,
  )[0];
  if (bigMover && bigMover.positionDelta > 6) {
    parts.push(`${bigMover.racerId} surges +${bigMover.positionDelta.toFixed(1)}!`);
  }

  const finishers = racerStates.filter(
    (r) => r.position >= FINISH_LINE && r.previousPosition < FINISH_LINE,
  );
  for (const f of finishers) {
    parts.push(`${f.racerId} crosses the finish line!`);
  }

  if (chaos) parts.push(chaos.description);
  if (actions.length > 0) parts.push(`${actions.length} action(s) applied`);

  return parts.join('. ') || `Tick ${tick} processed.`;
}
