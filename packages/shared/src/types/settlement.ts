export type SettlementStatus = 'pending' | 'calculating' | 'paying_out' | 'completed' | 'failed';

export interface Settlement {
  id: string;
  raceId: string;
  status: SettlementStatus;
  totalPrizePool: number;
  totalTreasury: number;
  totalReserve: number;
  firstPlacePool: number;
  secondPlacePool: number;
  thirdPlacePool: number;
  payouts: PayoutEntry[];
}

export interface PayoutEntry {
  playerId: string;
  sparkAddress: string;
  amount: number;
  place: number;
  racerId: string;
  backedAmount: number;
  share: number;
  txid?: string;
}
