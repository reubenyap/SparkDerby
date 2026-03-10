import {
  BACKING_POOL_SPLIT,
  BACKING_TREASURY_SPLIT,
  ACTION_POOL_SPLIT,
  ACTION_TREASURY_SPLIT,
  ACTION_RESERVE_SPLIT,
  PLACE_PERCENTAGES,
  MIN_PAYOUT_AMOUNT,
} from '../constants/economics';
import {
  BackingEntry,
  PayoutResult,
  PayoutLine,
  ProjectedPayout,
  FinishEntry,
} from './types';

export function calculatePayouts(
  finishOrder: FinishEntry[],
  backings: BackingEntry[],
  totalBacking: number,
  totalActionSpend: number,
): PayoutResult {
  const prizePool =
    totalBacking * BACKING_POOL_SPLIT + totalActionSpend * ACTION_POOL_SPLIT;
  const treasury =
    totalBacking * BACKING_TREASURY_SPLIT +
    totalActionSpend * ACTION_TREASURY_SPLIT;
  const reserve = totalActionSpend * ACTION_RESERVE_SPLIT;

  const placePools: Record<number, number> = {};
  for (const [place, pct] of Object.entries(PLACE_PERCENTAGES)) {
    placePools[Number(place)] = prizePool * pct;
  }

  const payouts: PayoutLine[] = [];

  for (let place = 1; place <= 3; place++) {
    const finisher = finishOrder.find((f) => f.place === place);
    if (!finisher) continue;

    const placePool = placePools[place];
    const racerBackings = backings.filter(
      (b) => b.racerId === finisher.racerId,
    );
    const totalOnRacer = racerBackings.reduce((sum, b) => sum + b.amount, 0);

    if (totalOnRacer === 0) continue;

    for (const backing of racerBackings) {
      const share = backing.amount / totalOnRacer;
      const payout = placePool * share;

      if (payout < MIN_PAYOUT_AMOUNT) continue;

      payouts.push({
        playerId: backing.playerId,
        sparkAddress: backing.sparkAddress,
        racerId: backing.racerId,
        place,
        backedAmount: backing.amount,
        share,
        payout,
      });
    }
  }

  return { totalPrizePool: prizePool, totalTreasury: treasury, totalReserve: reserve, placePools, payouts };
}

export function projectPayouts(
  playerId: string,
  allBackings: BackingEntry[],
  totalBacking: number,
  totalActionSpend: number,
): ProjectedPayout[] {
  const prizePool =
    totalBacking * BACKING_POOL_SPLIT + totalActionSpend * ACTION_POOL_SPLIT;
  const projections: ProjectedPayout[] = [];

  const playerBackings = allBackings.filter((b) => b.playerId === playerId);

  for (const backing of playerBackings) {
    const totalOnRacer = allBackings
      .filter((b) => b.racerId === backing.racerId)
      .reduce((sum, b) => sum + b.amount, 0);

    if (totalOnRacer === 0) continue;

    const share = backing.amount / totalOnRacer;

    for (let place = 1; place <= 3; place++) {
      const placePool = prizePool * PLACE_PERCENTAGES[place];
      projections.push({
        racerId: backing.racerId,
        place,
        placePool,
        playerBacked: backing.amount,
        totalBacked: totalOnRacer,
        projectedPayout: placePool * share,
      });
    }
  }

  return projections;
}
