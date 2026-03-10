import { RacerTickState, AppliedAction, Racer } from './race';

export type ServerEvent =
  | TickUpdateEvent
  | BackingReceivedEvent
  | ActionReceivedEvent
  | RaceStartedEvent
  | RaceFinishedEvent
  | PayoutsSentEvent;

export interface TickUpdateEvent {
  event: 'tick_update';
  data: {
    raceId: string;
    tick: number;
    racerStates: RacerTickState[];
    actionsApplied: AppliedAction[];
    commentary: string | null;
    nextTickAt: string;
  };
}

export interface BackingReceivedEvent {
  event: 'backing_received';
  data: {
    raceId: string;
    racerId: string;
    amount: number;
    playerSparkAddress: string;
    newRacerTotal: number;
    newPrizePool: number;
  };
}

export interface ActionReceivedEvent {
  event: 'action_received';
  data: {
    raceId: string;
    racerId: string;
    actionType: string;
    playerSparkAddress: string;
    pendingUntilTick: number;
  };
}

export interface RaceStartedEvent {
  event: 'race_started';
  data: {
    raceId: string;
    slot: string;
    startsAt: string;
    racers: Racer[];
  };
}

export interface RaceFinishedEvent {
  event: 'race_finished';
  data: {
    raceId: string;
    finishOrder: Array<{
      racerId: string;
      name: string;
      position: number;
      finishTick: number;
    }>;
    totalPrizePool: number;
  };
}

export interface PayoutsSentEvent {
  event: 'payouts_sent';
  data: {
    raceId: string;
    payouts: Array<{
      sparkAddress: string;
      amount: number;
      place: number;
      txid: string;
    }>;
  };
}

export interface ClientSubscribeEvent {
  event: 'subscribe_race';
  data: { raceId: string };
}

export interface ClientPingEvent {
  event: 'ping';
}
