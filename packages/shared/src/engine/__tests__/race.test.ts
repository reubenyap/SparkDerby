import { runRace, RaceInput } from '../race';
import { hashServerSecret } from '../random';
import { generateReplayLog, verifyReplayLog } from '../replay';
import { EngineRacer, EngineAction } from '../types';
import { TICKS_PER_RACE, FINISH_LINE } from '../../constants/race';
import { Archetype } from '../../types/race';

function makeRacers(): EngineRacer[] {
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
  }));
}

function makeEntropies(): Record<number, string> {
  const entropies: Record<number, string> = {};
  for (let t = 1; t <= TICKS_PER_RACE; t++) {
    entropies[t] = t.toString(16).padStart(64, '0');
  }
  return entropies;
}

function makeRaceInput(overrides: Partial<RaceInput> = {}): RaceInput {
  return {
    config: {
      raceId: 'race-001',
      serverSecret: 'a'.repeat(64),
      racers: makeRacers(),
    },
    publicEntropies: makeEntropies(),
    actions: [],
    ...overrides,
  };
}

describe('runRace', () => {
  it('runs 24 ticks', () => {
    const result = runRace(makeRaceInput());
    expect(result.ticks).toHaveLength(TICKS_PER_RACE);
  });

  it('is fully deterministic', () => {
    const a = runRace(makeRaceInput());
    const b = runRace(makeRaceInput());

    expect(a.serverSecretHash).toEqual(b.serverSecretHash);
    for (let i = 0; i < TICKS_PER_RACE; i++) {
      expect(a.ticks[i].seed).toEqual(b.ticks[i].seed);
      for (let j = 0; j < 6; j++) {
        expect(a.ticks[i].racerStates[j].position).toEqual(
          b.ticks[i].racerStates[j].position,
        );
      }
    }
    for (let i = 0; i < 6; i++) {
      expect(a.finishOrder[i].racerId).toEqual(b.finishOrder[i].racerId);
    }
  });

  it('different secrets produce different results', () => {
    const a = runRace(makeRaceInput());
    const b = runRace(
      makeRaceInput({
        config: {
          raceId: 'race-001',
          serverSecret: 'f'.repeat(64),
          racers: makeRacers(),
        },
      }),
    );
    expect(a.ticks[0].seed).not.toEqual(b.ticks[0].seed);
  });

  it('produces correct serverSecretHash', () => {
    const result = runRace(makeRaceInput());
    expect(result.serverSecretHash).toEqual(
      hashServerSecret('a'.repeat(64)),
    );
  });

  it('all racers have positive position after 24 ticks', () => {
    const result = runRace(makeRaceInput());
    const lastTick = result.ticks[TICKS_PER_RACE - 1];
    for (const state of lastTick.racerStates) {
      expect(state.position).toBeGreaterThan(0);
    }
  });

  it('finish order has 6 entries with places 1-6', () => {
    const result = runRace(makeRaceInput());
    expect(result.finishOrder).toHaveLength(6);
    const places = result.finishOrder.map((f) => f.place);
    expect(places).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('positions are monotonically non-decreasing per racer', () => {
    const result = runRace(makeRaceInput());
    for (let r = 0; r < 6; r++) {
      let prevPos = 0;
      for (let t = 0; t < TICKS_PER_RACE; t++) {
        const state = result.ticks[t].racerStates.find(
          (s) => s.racerId === `racer-${r}`,
        )!;
        expect(state.position).toBeGreaterThanOrEqual(prevPos);
        prevPos = state.position;
      }
    }
  });

  it('no position exceeds finish line', () => {
    const result = runRace(makeRaceInput());
    for (const tick of result.ticks) {
      for (const state of tick.racerStates) {
        expect(state.position).toBeLessThanOrEqual(FINISH_LINE);
      }
    }
  });

  describe('with actions', () => {
    it('processes boost action at specified tick', () => {
      const actions: EngineAction[] = [
        {
          id: 'boost-1',
          actionType: 'boost',
          targetRacerId: 'racer-0',
          playerId: 'player-1',
          sparkAddress: 'sm1p1',
          cost: 0.1,
          submittedAt: 1000000,
          tick: 5,
        },
      ];

      const result = runRace(makeRaceInput({ actions }));
      const tick5 = result.ticks[4]; // 0-indexed
      expect(tick5.actionsApplied).toHaveLength(1);
      expect(tick5.actionsApplied[0].actionType).toBe('boost');
    });

    it('boost on racer-0 results in better position vs no boost', () => {
      const withBoost = runRace(
        makeRaceInput({
          actions: [
            {
              id: 'boost-1',
              actionType: 'boost',
              targetRacerId: 'racer-0',
              playerId: 'player-1',
              sparkAddress: 'sm1p1',
              cost: 0.1,
              submittedAt: 1000000,
              tick: 5,
            },
          ],
        }),
      );
      const withoutBoost = runRace(makeRaceInput());

      const withPos = withBoost.ticks[TICKS_PER_RACE - 1].racerStates.find(
        (r) => r.racerId === 'racer-0',
      )!.position;
      const withoutPos = withoutBoost.ticks[
        TICKS_PER_RACE - 1
      ].racerStates.find((r) => r.racerId === 'racer-0')!.position;

      expect(withPos).toBeGreaterThan(withoutPos);
    });

    it('overclock applies for multiple ticks', () => {
      const actions: EngineAction[] = [
        {
          id: 'oc-1',
          actionType: 'overclock',
          targetRacerId: 'racer-0',
          playerId: 'player-1',
          sparkAddress: 'sm1p1',
          cost: 0.5,
          submittedAt: 1000000,
          tick: 3,
        },
      ];

      const result = runRace(makeRaceInput({ actions }));

      // Effect registered at tick 3 (ticks[2]), lasts through tick 7 (ticks[6])
      for (let t = 2; t <= 6; t++) {
        const effects = result.ticks[t].activeEffects.filter(
          (e) => e.source === 'overclock',
        );
        expect(effects.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

describe('replay verification', () => {
  it('generates and verifies a replay log', () => {
    const input = makeRaceInput();
    const result = runRace(input);

    const replay = generateReplayLog(
      input.config,
      result.serverSecret,
      result.serverSecretHash,
      input.publicEntropies,
      input.actions,
      result.ticks,
      result.finishOrder,
    );

    const verification = verifyReplayLog(replay);
    expect(verification.valid).toBe(true);
  });

  it('detects tampered server secret', () => {
    const input = makeRaceInput();
    const result = runRace(input);

    const replay = generateReplayLog(
      input.config,
      'tampered_secret'.padEnd(64, '0'),
      result.serverSecretHash,
      input.publicEntropies,
      input.actions,
      result.ticks,
      result.finishOrder,
    );

    const verification = verifyReplayLog(replay);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('hash mismatch');
  });
});
