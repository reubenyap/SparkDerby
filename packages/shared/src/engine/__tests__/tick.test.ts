import { processTick, TickInput } from '../tick';
import { RacerState, EngineAction } from '../types';
import { Archetype } from '../../types/race';

function makeRacers(): RacerState[] {
  const archetypes: Archetype[] = [
    'balanced',
    'sprinter',
    'closer',
    'tank',
    'wildcard',
    'technician',
  ];
  return archetypes.map((a, i) => ({
    id: `racer-${i}`,
    lane: i,
    name: `Racer ${i}`,
    archetype: a,
    position: 0,
    stamina: 100,
    finishTick: null,
  }));
}

function makeTickInput(overrides: Partial<TickInput> = {}): TickInput {
  return {
    raceId: 'race-001',
    serverSecret: 'a'.repeat(64),
    tick: 1,
    publicEntropy: 'b'.repeat(64),
    racers: makeRacers(),
    pendingActions: [],
    activeEffects: [],
    priorValidActions: [],
    ...overrides,
  };
}

describe('processTick', () => {
  describe('basic movement', () => {
    it('all racers move forward on tick 1', () => {
      const input = makeTickInput();
      const { result } = processTick(input);

      for (const state of result.racerStates) {
        expect(state.position).toBeGreaterThan(0);
        expect(state.positionDelta).toBeGreaterThan(0);
        expect(state.speed).toBeGreaterThan(0);
      }
    });

    it('is deterministic', () => {
      const a = processTick(makeTickInput());
      const b = processTick(makeTickInput());

      expect(a.result.seed).toEqual(b.result.seed);
      for (let i = 0; i < 6; i++) {
        expect(a.result.racerStates[i].position).toEqual(
          b.result.racerStates[i].position,
        );
      }
    });

    it('produces different results with different entropy', () => {
      const a = processTick(makeTickInput({ publicEntropy: 'c'.repeat(64) }));
      const b = processTick(makeTickInput({ publicEntropy: 'd'.repeat(64) }));
      expect(a.result.seed).not.toEqual(b.result.seed);
    });

    it('skips finished racers', () => {
      const racers = makeRacers();
      racers[0].position = 100;
      racers[0].finishTick = 1;

      const { result } = processTick(makeTickInput({ racers, tick: 2 }));
      const finishedState = result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;
      expect(finishedState.speed).toBe(0);
      expect(finishedState.positionDelta).toBe(0);
    });

    it('decrements stamina each tick', () => {
      const { result } = processTick(makeTickInput());
      for (const state of result.racerStates) {
        expect(state.stamina).toBeLessThan(100);
      }
    });
  });

  describe('instant actions', () => {
    it('boost increases position', () => {
      const racersWithout = makeRacers();
      const racersWith = makeRacers();
      const boostAction: EngineAction = {
        id: 'boost-1',
        actionType: 'boost',
        targetRacerId: 'racer-0',
        playerId: 'player-1',
        sparkAddress: 'sm1p1',
        cost: 0.1,
        submittedAt: 1000000,
        tick: 1,
      };

      const withoutBoost = processTick(
        makeTickInput({ racers: racersWithout }),
      );
      const withBoost = processTick(
        makeTickInput({ racers: racersWith, pendingActions: [boostAction] }),
      );

      const without = withoutBoost.result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;
      const withB = withBoost.result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;
      expect(withB.position).toBeGreaterThan(without.position);
      expect(withB.position - without.position).toBeCloseTo(1.5, 1);
    });

    it('emp decreases movement', () => {
      const racersWithout = makeRacers();
      const racersWith = makeRacers();
      const empAction: EngineAction = {
        id: 'emp-1',
        actionType: 'emp',
        targetRacerId: 'racer-0',
        playerId: 'player-2',
        sparkAddress: 'sm1p2',
        cost: 0.2,
        submittedAt: 1000000,
        tick: 1,
      };

      const withoutEmp = processTick(makeTickInput({ racers: racersWithout }));
      const withEmp = processTick(
        makeTickInput({ racers: racersWith, pendingActions: [empAction] }),
      );

      const without = withoutEmp.result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;
      const withE = withEmp.result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;
      expect(withE.position).toBeLessThan(without.position);
    });
  });

  describe('action validation', () => {
    it('rejects action during cooldown', () => {
      const actions: EngineAction[] = [
        {
          id: 'a1',
          actionType: 'boost',
          targetRacerId: 'racer-0',
          playerId: 'player-1',
          sparkAddress: 'sm1p1',
          cost: 0.1,
          submittedAt: 1000000,
          tick: 1,
        },
        {
          id: 'a2',
          actionType: 'boost',
          targetRacerId: 'racer-1',
          playerId: 'player-1',
          sparkAddress: 'sm1p1',
          cost: 0.1,
          submittedAt: 1030000, // 30s later, within 60s cooldown
          tick: 1,
        },
      ];

      const { result } = processTick(
        makeTickInput({ pendingActions: actions }),
      );
      expect(result.actionsApplied).toHaveLength(1);
      expect(result.actionsRejected).toHaveLength(1);
      expect(result.actionsRejected[0].reason).toBe('cooldown');
    });
  });

  describe('multi-tick effects', () => {
    it('registers oil_slick as active effect for next tick', () => {
      const action: EngineAction = {
        id: 'oil-1',
        actionType: 'oil_slick',
        targetRacerId: 'racer-0',
        playerId: 'player-2',
        sparkAddress: 'sm1p2',
        cost: 0.2,
        submittedAt: 1000000,
        tick: 1,
      };

      const { updatedEffects } = processTick(
        makeTickInput({ pendingActions: [action] }),
      );

      const oilEffect = updatedEffects.find((e) => e.source === 'oil_slick');
      expect(oilEffect).toBeDefined();
      expect(oilEffect!.ticksRemaining).toBe(3);
      expect(oilEffect!.magnitude).toBe(-1.0);
    });

    it('applies existing effects to movement', () => {
      const racersWithout = makeRacers();
      const racersWith = makeRacers();

      const effect = {
        type: 'buff' as const,
        source: 'overclock' as const,
        targetRacerId: 'racer-0',
        magnitude: 1.0,
        ticksRemaining: 3,
        appliedAtTick: 0,
        playerId: 'p1',
      };

      const without = processTick(makeTickInput({ racers: racersWithout }));
      const withEffect = processTick(
        makeTickInput({ racers: racersWith, activeEffects: [effect] }),
      );

      const r0Without = without.result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;
      const r0With = withEffect.result.racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!;

      expect(r0With.position - r0Without.position).toBeCloseTo(1.0, 1);
    });

    it('decrements existing effect ticks', () => {
      const effect = {
        type: 'buff' as const,
        source: 'overclock' as const,
        targetRacerId: 'racer-0',
        magnitude: 1.0,
        ticksRemaining: 2,
        appliedAtTick: 0,
        playerId: 'p1',
      };

      const { updatedEffects } = processTick(
        makeTickInput({ activeEffects: [effect] }),
      );

      const remaining = updatedEffects.find((e) => e.source === 'overclock');
      expect(remaining).toBeDefined();
      expect(remaining!.ticksRemaining).toBe(1);
    });

    it('removes expired effects', () => {
      const effect = {
        type: 'debuff' as const,
        source: 'oil_slick' as const,
        targetRacerId: 'racer-0',
        magnitude: -1.0,
        ticksRemaining: 1,
        appliedAtTick: 0,
        playerId: 'p1',
      };

      const { updatedEffects } = processTick(
        makeTickInput({ activeEffects: [effect] }),
      );

      const remaining = updatedEffects.filter((e) => e.source === 'oil_slick');
      expect(remaining).toHaveLength(0);
    });
  });

  describe('position clamping', () => {
    it('position never exceeds 100', () => {
      const racers = makeRacers();
      racers[0].position = 99;

      const { result } = processTick(makeTickInput({ racers }));
      const r0 = result.racerStates.find((r) => r.racerId === 'racer-0')!;
      expect(r0.position).toBeLessThanOrEqual(100);
    });

    it('movement is never negative', () => {
      const { result } = processTick(makeTickInput());
      for (const state of result.racerStates) {
        expect(state.speed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('commentary', () => {
    it('generates non-empty commentary', () => {
      const { result } = processTick(makeTickInput());
      expect(result.commentary).toBeTruthy();
      expect(result.commentary.length).toBeGreaterThan(0);
    });
  });
});
