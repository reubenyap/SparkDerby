import { Archetype } from '../types/race';
import { ActionType } from '../types/action';

/** Immutable racer definition fed into the engine */
export interface EngineRacer {
  id: string;
  lane: number;
  name: string;
  archetype: Archetype;
}

/** Mutable racer state during simulation */
export interface RacerState {
  id: string;
  lane: number;
  name: string;
  archetype: Archetype;
  position: number;
  stamina: number;
  finishTick: number | null;
}

/** Action submitted by a player, assigned to a tick */
export interface EngineAction {
  id: string;
  actionType: ActionType;
  targetRacerId: string;
  playerId: string;
  sparkAddress: string;
  cost: number;
  submittedAt: number;
  tick: number;
}

/** Multi-tick effect active on a racer */
export interface ActiveEffect {
  type: 'buff' | 'debuff';
  source: ActionType;
  targetRacerId: string;
  magnitude: number;
  ticksRemaining: number;
  appliedAtTick: number;
  playerId: string;
}

/** Result of processing one tick */
export interface TickResult {
  tick: number;
  seed: string;
  publicEntropy: string;
  racerStates: RacerTickResult[];
  actionsApplied: AppliedActionResult[];
  actionsRejected: RejectedActionResult[];
  activeEffects: ActiveEffect[];
  chaosEvent: ChaosEvent | null;
  commentary: string;
}

export interface RacerTickResult {
  racerId: string;
  position: number;
  previousPosition: number;
  speed: number;
  stamina: number;
  positionDelta: number;
}

export interface AppliedActionResult {
  actionId: string;
  actionType: ActionType;
  targetRacerId: string;
  effectMagnitude: number;
  playerSparkAddress: string;
  diminishingFactor: number;
}

export interface RejectedActionResult {
  actionId: string;
  actionType: ActionType;
  reason: string;
}

export type ChaosEventType =
  | 'position_shuffle'
  | 'freeze_leader'
  | 'boost_underdogs'
  | 'speed_storm';

export interface ChaosEvent {
  type: ChaosEventType;
  description: string;
  /** For position_shuffle: new absolute positions. For others: speed modifiers. */
  effects: Record<string, number>;
}

export interface RaceConfig {
  raceId: string;
  serverSecret: string;
  racers: EngineRacer[];
}

export interface RaceResult {
  raceId: string;
  ticks: TickResult[];
  finishOrder: FinishEntry[];
  serverSecret: string;
  serverSecretHash: string;
}

export interface FinishEntry {
  racerId: string;
  name: string;
  position: number;
  finishTick: number | null;
  place: number;
}

export interface BackingEntry {
  playerId: string;
  sparkAddress: string;
  racerId: string;
  amount: number;
}

export interface PayoutResult {
  totalPrizePool: number;
  totalTreasury: number;
  totalReserve: number;
  placePools: Record<number, number>;
  payouts: PayoutLine[];
}

export interface PayoutLine {
  playerId: string;
  sparkAddress: string;
  racerId: string;
  place: number;
  backedAmount: number;
  share: number;
  payout: number;
}

export interface ProjectedPayout {
  racerId: string;
  place: number;
  placePool: number;
  playerBacked: number;
  totalBacked: number;
  projectedPayout: number;
}

export interface ActionValidation {
  valid: boolean;
  reason?: string;
}

export interface ReplayLog {
  version: '1.0';
  raceId: string;
  serverSecretHash: string;
  serverSecret: string;
  racers: EngineRacer[];
  publicEntropies: Record<number, string>;
  actions: EngineAction[];
  ticks: TickResult[];
  finishOrder: FinishEntry[];
}
