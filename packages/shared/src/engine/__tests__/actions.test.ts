import {
  validateAction,
  computeDiminishingFactor,
  createMultiTickEffect,
  determineChaosEvent,
} from '../actions';
import { EngineAction } from '../types';

function makeAction(overrides: Partial<EngineAction> = {}): EngineAction {
  return {
    id: 'action-1',
    actionType: 'boost',
    targetRacerId: 'racer-1',
    playerId: 'player-1',
    sparkAddress: 'sm1player1',
    cost: 0.1,
    submittedAt: 1000000,
    tick: 1,
    ...overrides,
  };
}

describe('validateAction', () => {
  it('accepts a valid action with no prior actions', () => {
    const action = makeAction();
    expect(validateAction(action, [])).toEqual({ valid: true });
  });

  it('rejects action within 60s cooldown of same player', () => {
    const prior = makeAction({ id: 'prior', submittedAt: 950000 });
    const action = makeAction({ submittedAt: 1000000 });
    expect(validateAction(action, [prior])).toEqual({
      valid: false,
      reason: 'cooldown',
    });
  });

  it('accepts action after 60s cooldown', () => {
    const prior = makeAction({ id: 'prior', submittedAt: 930000 });
    const action = makeAction({ submittedAt: 1000000 });
    expect(validateAction(action, [prior])).toEqual({ valid: true });
  });

  it('cooldown only applies to same player', () => {
    const prior = makeAction({
      id: 'prior',
      playerId: 'player-2',
      submittedAt: 999000,
    });
    const action = makeAction({ submittedAt: 1000000 });
    expect(validateAction(action, [prior])).toEqual({ valid: true });
  });

  it('rejects second black_swan from same player', () => {
    const prior = makeAction({
      id: 'prior',
      actionType: 'black_swan',
      cost: 1.0,
      submittedAt: 0,
    });
    const action = makeAction({
      actionType: 'black_swan',
      cost: 1.0,
      submittedAt: 1000000,
    });
    expect(validateAction(action, [prior])).toEqual({
      valid: false,
      reason: 'chaos_limit',
    });
  });

  it('allows black_swan from different player', () => {
    const prior = makeAction({
      id: 'prior',
      playerId: 'player-2',
      actionType: 'black_swan',
      cost: 1.0,
      submittedAt: 0,
    });
    const action = makeAction({
      actionType: 'black_swan',
      cost: 1.0,
      submittedAt: 1000000,
    });
    expect(validateAction(action, [prior])).toEqual({ valid: true });
  });
});

describe('computeDiminishingFactor', () => {
  it('returns 1.0 with no prior debuffs', () => {
    expect(computeDiminishingFactor('racer-1', 1000000, [])).toBe(1.0);
  });

  it('returns 0.6 after one prior debuff within 5 minutes', () => {
    const prior = makeAction({
      actionType: 'emp',
      targetRacerId: 'racer-1',
      submittedAt: 900000,
    });
    expect(computeDiminishingFactor('racer-1', 1000000, [prior])).toBeCloseTo(
      0.6,
    );
  });

  it('returns 0.36 after two prior debuffs', () => {
    const priors = [
      makeAction({
        id: 'p1',
        actionType: 'emp',
        targetRacerId: 'racer-1',
        submittedAt: 800000,
      }),
      makeAction({
        id: 'p2',
        actionType: 'oil_slick',
        targetRacerId: 'racer-1',
        submittedAt: 900000,
      }),
    ];
    expect(computeDiminishingFactor('racer-1', 1000000, priors)).toBeCloseTo(
      0.36,
    );
  });

  it('ignores debuffs on other racers', () => {
    const prior = makeAction({
      actionType: 'emp',
      targetRacerId: 'racer-2',
      submittedAt: 900000,
    });
    expect(computeDiminishingFactor('racer-1', 1000000, [prior])).toBe(1.0);
  });

  it('ignores debuffs outside 5-minute window', () => {
    const prior = makeAction({
      actionType: 'emp',
      targetRacerId: 'racer-1',
      submittedAt: 600000, // 400s before, outside 300s window
    });
    expect(computeDiminishingFactor('racer-1', 1000000, [prior])).toBe(1.0);
  });
});

describe('createMultiTickEffect', () => {
  it('creates oil_slick effect with 3 ticks', () => {
    const action = makeAction({ actionType: 'oil_slick', cost: 0.2 });
    const effect = createMultiTickEffect(action, 5, 1.0);
    expect(effect).not.toBeNull();
    expect(effect!.type).toBe('debuff');
    expect(effect!.source).toBe('oil_slick');
    expect(effect!.magnitude).toBe(-1.0);
    expect(effect!.ticksRemaining).toBe(3);
    expect(effect!.appliedAtTick).toBe(5);
  });

  it('creates overclock effect with 5 ticks', () => {
    const action = makeAction({ actionType: 'overclock', cost: 0.5 });
    const effect = createMultiTickEffect(action, 3, 1.0);
    expect(effect).not.toBeNull();
    expect(effect!.type).toBe('buff');
    expect(effect!.source).toBe('overclock');
    expect(effect!.magnitude).toBe(1.0);
    expect(effect!.ticksRemaining).toBe(5);
  });

  it('applies diminishing factor to oil_slick', () => {
    const action = makeAction({ actionType: 'oil_slick', cost: 0.2 });
    const effect = createMultiTickEffect(action, 5, 0.6);
    expect(effect!.magnitude).toBeCloseTo(-0.6);
  });

  it('returns null for instant actions', () => {
    expect(createMultiTickEffect(makeAction({ actionType: 'boost' }), 1, 1.0)).toBeNull();
    expect(createMultiTickEffect(makeAction({ actionType: 'emp' }), 1, 1.0)).toBeNull();
    expect(createMultiTickEffect(makeAction({ actionType: 'black_swan' }), 1, 1.0)).toBeNull();
  });
});

describe('determineChaosEvent', () => {
  it('returns a valid chaos event', () => {
    const { deriveTickSeed } = require('../random');
    const seed = deriveTickSeed('a'.repeat(64), 'race-1', 1, 'b'.repeat(64));
    const positions = [
      { racerId: 'r1', position: 50 },
      { racerId: 'r2', position: 40 },
      { racerId: 'r3', position: 30 },
      { racerId: 'r4', position: 20 },
      { racerId: 'r5', position: 10 },
      { racerId: 'r6', position: 5 },
    ];
    const event = determineChaosEvent(seed, positions);
    expect(['position_shuffle', 'freeze_leader', 'boost_underdogs', 'speed_storm']).toContain(event.type);
    expect(event.description).toBeTruthy();
    expect(typeof event.effects).toBe('object');
  });

  it('is deterministic', () => {
    const { deriveTickSeed } = require('../random');
    const seed = deriveTickSeed('a'.repeat(64), 'race-1', 1, 'b'.repeat(64));
    const positions = [
      { racerId: 'r1', position: 50 },
      { racerId: 'r2', position: 40 },
    ];
    const a = determineChaosEvent(seed, positions);
    const b = determineChaosEvent(seed, positions);
    expect(a).toEqual(b);
  });
});
