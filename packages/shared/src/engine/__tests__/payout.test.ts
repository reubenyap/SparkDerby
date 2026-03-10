import { calculatePayouts, projectPayouts } from '../payout';
import { BackingEntry, FinishEntry } from '../types';

const finishOrder: FinishEntry[] = [
  { racerId: 'r1', name: 'Racer 1', position: 100, finishTick: 20, place: 1 },
  { racerId: 'r2', name: 'Racer 2', position: 98, finishTick: null, place: 2 },
  { racerId: 'r3', name: 'Racer 3', position: 95, finishTick: null, place: 3 },
  { racerId: 'r4', name: 'Racer 4', position: 90, finishTick: null, place: 4 },
  { racerId: 'r5', name: 'Racer 5', position: 85, finishTick: null, place: 5 },
  { racerId: 'r6', name: 'Racer 6', position: 80, finishTick: null, place: 6 },
];

describe('calculatePayouts', () => {
  it('splits backing 90% to prize pool, 10% to treasury', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1p1', racerId: 'r1', amount: 10 },
    ];

    const result = calculatePayouts(finishOrder, backings, 100, 0);
    expect(result.totalPrizePool).toBeCloseTo(90);
    expect(result.totalTreasury).toBeCloseTo(10);
    expect(result.totalReserve).toBe(0);
  });

  it('splits action spend 45/35/20', () => {
    const result = calculatePayouts(finishOrder, [], 0, 100);
    expect(result.totalPrizePool).toBeCloseTo(45);
    expect(result.totalTreasury).toBeCloseTo(35);
    expect(result.totalReserve).toBeCloseTo(20);
  });

  it('distributes prize pool 60/25/15 across places', () => {
    const result = calculatePayouts(finishOrder, [], 100, 0);
    expect(result.placePools[1]).toBeCloseTo(54); // 90 * 0.6
    expect(result.placePools[2]).toBeCloseTo(22.5); // 90 * 0.25
    expect(result.placePools[3]).toBeCloseTo(13.5); // 90 * 0.15
  });

  it('calculates pari-mutuel payouts proportional to backing', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1p1', racerId: 'r1', amount: 5 },
      { playerId: 'p2', sparkAddress: 'sm1p2', racerId: 'r1', amount: 15 },
    ];

    const result = calculatePayouts(finishOrder, backings, 20, 0);
    // Prize pool = 20 * 0.9 = 18
    // 1st place pool = 18 * 0.6 = 10.8
    const p1 = result.payouts.find((p) => p.playerId === 'p1')!;
    const p2 = result.payouts.find((p) => p.playerId === 'p2')!;

    expect(p1.share).toBeCloseTo(0.25); // 5/20
    expect(p2.share).toBeCloseTo(0.75); // 15/20
    expect(p1.payout).toBeCloseTo(2.7); // 10.8 * 0.25
    expect(p2.payout).toBeCloseTo(8.1); // 10.8 * 0.75
  });

  it('only pays backers of top 3 racers', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1p1', racerId: 'r1', amount: 10 },
      { playerId: 'p2', sparkAddress: 'sm1p2', racerId: 'r4', amount: 10 },
    ];

    const result = calculatePayouts(finishOrder, backings, 20, 0);
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].playerId).toBe('p1');
  });

  it('handles racer with no backers (no payout for that place)', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1p1', racerId: 'r2', amount: 10 },
    ];

    const result = calculatePayouts(finishOrder, backings, 10, 0);
    // r1 (1st) has no backers, r2 (2nd) has backing
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].place).toBe(2);
  });

  it('action spend does not affect payout share', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1p1', racerId: 'r1', amount: 10 },
    ];

    // Same backing, different action spend
    const low = calculatePayouts(finishOrder, backings, 10, 0);
    const high = calculatePayouts(finishOrder, backings, 10, 100);

    // Shares should be the same (1.0 both times)
    expect(low.payouts[0].share).toEqual(high.payouts[0].share);
    // But high action spend increases the pool
    expect(high.payouts[0].payout).toBeGreaterThan(low.payouts[0].payout);
  });
});

describe('projectPayouts', () => {
  it('projects payouts for each place a racer could finish', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1p1', racerId: 'r1', amount: 5 },
      { playerId: 'p2', sparkAddress: 'sm1p2', racerId: 'r1', amount: 15 },
    ];

    const projections = projectPayouts('p1', backings, 20, 0);
    // Player backed r1 -> 3 projections (places 1, 2, 3)
    expect(projections).toHaveLength(3);
    expect(projections.map((p) => p.place)).toEqual([1, 2, 3]);

    // 1st place projection: pool=18*0.6=10.8, share=5/20=0.25, payout=2.7
    expect(projections[0].projectedPayout).toBeCloseTo(2.7);
  });

  it('returns empty for player with no backings', () => {
    const projections = projectPayouts('p99', [], 100, 0);
    expect(projections).toHaveLength(0);
  });
});
