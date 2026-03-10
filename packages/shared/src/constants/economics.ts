/** Backing split: 90% to prize pool, 10% to treasury */
export const BACKING_POOL_SPLIT = 0.9;
export const BACKING_TREASURY_SPLIT = 0.1;

/** Action split: 45% to prize pool, 35% to treasury, 20% to reserve */
export const ACTION_POOL_SPLIT = 0.45;
export const ACTION_TREASURY_SPLIT = 0.35;
export const ACTION_RESERVE_SPLIT = 0.2;

/** Prize pool distribution among places */
export const PLACE_PERCENTAGES: Record<number, number> = {
  1: 0.6,
  2: 0.25,
  3: 0.15,
};

/** Minimum backing amount in FIRO */
export const MIN_BACKING_AMOUNT = 1.0;

/** Minimum payout threshold in FIRO (avoid dust) */
export const MIN_PAYOUT_AMOUNT = 0.001;
