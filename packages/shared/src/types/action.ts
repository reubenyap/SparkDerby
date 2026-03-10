export type ActionType = 'boost' | 'emp' | 'oil_slick' | 'overclock' | 'black_swan';
export type ActionStatus = 'pending' | 'applied' | 'rejected' | 'expired';
export type IntentType = 'back' | ActionType;

export interface GameAction {
  id: string;
  raceId: string;
  racerId: string;
  playerId: string;
  actionType: ActionType;
  status: ActionStatus;
  cost: number;
  appliedAtTick: number | null;
  effectMagnitude: number | null;
  diminishingFactor: number;
}
