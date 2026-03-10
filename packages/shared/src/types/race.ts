export type RaceStatus = 'scheduled' | 'active' | 'settling' | 'settled' | 'cancelled';
export type RaceSlot = 'A' | 'B';
export type Archetype = 'balanced' | 'sprinter' | 'closer' | 'tank' | 'wildcard' | 'technician';

export interface Race {
  id: string;
  raceDate: string;
  slot: RaceSlot;
  status: RaceStatus;
  currentTick: number;
  startsAt: string;
  endsAt: string;
  randomnessCommit: string | null;
  randomnessReveal: string | null;
  totalPrizePool: number;
  totalActionPool: number;
  totalTreasury: number;
  totalReserve: number;
  racers: Racer[];
}

export interface Racer {
  id: string;
  raceId: string;
  lane: number;
  name: string;
  archetype: Archetype;
  position: number;
  speed: number;
  baseSpeed: number;
  stamina: number;
  luckModifier: number;
  statusEffects: StatusEffect[];
  finishPosition: number | null;
  finishTick: number | null;
  totalBacked: number;
  backerCount: number;
}

export interface StatusEffect {
  type: 'buff' | 'debuff';
  source: string;
  magnitude: number;
  ticksRemaining: number;
}

export interface TickSnapshot {
  raceId: string;
  tick: number;
  blockHash: string;
  randomSeed: string;
  racerStates: RacerTickState[];
  actionsApplied: AppliedAction[];
  commentary: string | null;
}

export interface RacerTickState {
  racerId: string;
  position: number;
  speed: number;
  stamina: number;
  statusEffects: StatusEffect[];
  positionDelta: number;
}

export interface AppliedAction {
  actionType: string;
  targetRacerId: string;
  effectMagnitude: number;
  playerSparkAddress: string;
}
