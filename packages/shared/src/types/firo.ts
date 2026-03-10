export type EventStatus = 'detected' | 'instant_locked' | 'confirmed' | 'failed';
export type EventPurpose = 'backing' | 'action' | 'payout' | 'treasury' | 'reserve';

export interface OnchainEvent {
  id: string;
  txid: string;
  voutIndex: number | null;
  sparkAddress: string;
  amount: number;
  direction: 'in' | 'out';
  purpose: EventPurpose | null;
  raceId: string | null;
  playerId: string | null;
  status: EventStatus;
  instantLocked: boolean;
  blockHash: string | null;
  blockHeight: number | null;
}

export interface SparkBalance {
  available: number;
  pending: number;
}
