/**
 * Settlement integration tests.
 *
 * These tests verify the payout calculation pipeline works correctly
 * using the shared engine, without requiring a database or Firo node.
 */
import {
  calculatePayouts,
  FinishEntry,
  BackingEntry,
  PLACE_PERCENTAGES,
  BACKING_POOL_SPLIT,
  ACTION_POOL_SPLIT,
  MIN_PAYOUT_AMOUNT,
} from '@sparkderby/shared';

describe('Settlement — Payout Calculation', () => {
  const finishOrder: FinishEntry[] = [
    { racerId: 'r1', name: 'Nova', position: 100, finishTick: 20, place: 1 },
    { racerId: 'r2', name: 'Blitz', position: 98.5, finishTick: 21, place: 2 },
    { racerId: 'r3', name: 'Shadow', position: 95.2, finishTick: 22, place: 3 },
    { racerId: 'r4', name: 'Titan', position: 88.1, finishTick: null, place: 4 },
    { racerId: 'r5', name: 'Chaos', position: 82.3, finishTick: null, place: 5 },
    { racerId: 'r6', name: 'Cipher', position: 76.0, finishTick: null, place: 6 },
  ];

  it('distributes payouts to top-3 backers proportionally', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1aaa', racerId: 'r1', amount: 10 },
      { playerId: 'p2', sparkAddress: 'sm1bbb', racerId: 'r1', amount: 5 },
      { playerId: 'p3', sparkAddress: 'sm1ccc', racerId: 'r2', amount: 8 },
      { playerId: 'p4', sparkAddress: 'sm1ddd', racerId: 'r3', amount: 12 },
      { playerId: 'p5', sparkAddress: 'sm1eee', racerId: 'r4', amount: 6 },
    ];

    const totalBacking = backings.reduce((s, b) => s + b.amount, 0);
    const totalActionSpend = 5.0;

    const result = calculatePayouts(finishOrder, backings, totalBacking, totalActionSpend);

    // Prize pool = backing * 0.9 + actions * 0.45
    const expectedPool = totalBacking * BACKING_POOL_SPLIT + totalActionSpend * ACTION_POOL_SPLIT;
    expect(result.totalPrizePool).toBeCloseTo(expectedPool, 4);

    // Verify place pools sum to total
    const placePoolSum = Object.values(result.placePools).reduce((s, v) => s + v, 0);
    expect(placePoolSum).toBeCloseTo(result.totalPrizePool, 4);

    // 1st place backers (p1 and p2) get 60% of pool
    const firstPlacePayouts = result.payouts.filter(p => p.place === 1);
    expect(firstPlacePayouts).toHaveLength(2);
    const firstPlaceTotal = firstPlacePayouts.reduce((s, p) => s + p.payout, 0);
    expect(firstPlaceTotal).toBeCloseTo(result.placePools[1], 4);

    // p1 backed 10/15 = 66.67% of r1
    const p1Payout = result.payouts.find(p => p.playerId === 'p1');
    expect(p1Payout!.share).toBeCloseTo(10 / 15, 4);

    // 4th place backer (p5) gets nothing
    const p5Payout = result.payouts.find(p => p.playerId === 'p5');
    expect(p5Payout).toBeUndefined();
  });

  it('handles zero backings gracefully', () => {
    const result = calculatePayouts(finishOrder, [], 0, 0);
    expect(result.totalPrizePool).toBe(0);
    expect(result.payouts).toHaveLength(0);
  });

  it('handles single backer on winning racer', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1aaa', racerId: 'r1', amount: 20 },
    ];

    const result = calculatePayouts(finishOrder, backings, 20, 0);
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].share).toBe(1);
    expect(result.payouts[0].payout).toBeCloseTo(20 * BACKING_POOL_SPLIT * PLACE_PERCENTAGES[1], 4);
  });

  it('filters out dust payouts below MIN_PAYOUT_AMOUNT', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1aaa', racerId: 'r1', amount: 0.001 },
      { playerId: 'p2', sparkAddress: 'sm1bbb', racerId: 'r1', amount: 100 },
    ];

    const result = calculatePayouts(finishOrder, backings, 100.001, 0);
    // p1's share is tiny (0.001/100.001) — payout may be below dust threshold
    const p1 = result.payouts.find(p => p.playerId === 'p1');
    if (p1) {
      expect(p1.payout).toBeGreaterThanOrEqual(MIN_PAYOUT_AMOUNT);
    }
  });

  it('correctly splits treasury and reserve', () => {
    const backings: BackingEntry[] = [
      { playerId: 'p1', sparkAddress: 'sm1aaa', racerId: 'r1', amount: 100 },
    ];

    const result = calculatePayouts(finishOrder, backings, 100, 10);

    // Treasury = 100 * 0.1 + 10 * 0.35 = 13.5
    expect(result.totalTreasury).toBeCloseTo(13.5, 4);
    // Reserve = 10 * 0.2 = 2.0
    expect(result.totalReserve).toBeCloseTo(2.0, 4);
  });
});
