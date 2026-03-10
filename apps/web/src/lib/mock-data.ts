import type { Race, Racer, Archetype, StatusEffect, TickSnapshot } from '@sparkderby/shared';

const MOCK_RACE_ID = 'race-001-mock';

const archetypeNames: Record<Archetype, string[]> = {
  balanced: ['Nova', 'Prism'],
  sprinter: ['Blitz', 'Flash'],
  closer: ['Shadow', 'Phantom'],
  tank: ['Titan', 'Bastion'],
  wildcard: ['Chaos', 'Jinx'],
  technician: ['Cipher', 'Logic'],
};

function pickName(arch: Archetype, idx: number): string {
  const names = archetypeNames[arch];
  return names[idx % names.length];
}

const archetypes: Archetype[] = ['balanced', 'sprinter', 'closer', 'tank', 'wildcard', 'technician'];

function makeMockRacers(): Racer[] {
  return archetypes.map((arch, i) => ({
    id: `racer-${i + 1}`,
    raceId: MOCK_RACE_ID,
    lane: i + 1,
    name: pickName(arch, 0),
    archetype: arch,
    position: 15 + Math.random() * 55,
    speed: 3 + Math.random() * 3,
    baseSpeed: 4.0,
    stamina: 40 + Math.random() * 50,
    luckModifier: 0,
    statusEffects: i === 2 ? [{ type: 'debuff' as const, source: 'oil_slick', magnitude: 1.0, ticksRemaining: 2 }] : [],
    finishPosition: null,
    finishTick: null,
    totalBacked: parseFloat((5 + Math.random() * 45).toFixed(2)),
    backerCount: Math.floor(2 + Math.random() * 15),
  }));
}

const mockRacers = makeMockRacers();

export const MOCK_RACE: Race = {
  id: MOCK_RACE_ID,
  raceDate: new Date().toISOString().slice(0, 10),
  slot: 'A',
  status: 'active',
  currentTick: 14,
  startsAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  randomnessCommit: 'a1b2c3d4e5f6...',
  randomnessReveal: null,
  totalPrizePool: mockRacers.reduce((s, r) => s + r.totalBacked, 0) * 0.9,
  totalActionPool: 12.5,
  totalTreasury: mockRacers.reduce((s, r) => s + r.totalBacked, 0) * 0.1,
  totalReserve: 2.5,
  racers: mockRacers,
};

export const MOCK_FINISHED_RACE: Race = {
  ...MOCK_RACE,
  id: 'race-000-finished',
  status: 'settled',
  currentTick: 24,
  racers: mockRacers.map((r, i) => ({
    ...r,
    position: 100,
    finishPosition: i + 1,
    finishTick: 20 + i,
  })),
};

export interface MockAddressMap {
  [racerId: string]: Record<string, string>;
}

export function generateMockAddresses(): MockAddressMap {
  const intents = ['back', 'boost', 'emp', 'oil_slick', 'overclock', 'black_swan'];
  const map: MockAddressMap = {};
  for (const racer of mockRacers) {
    map[racer.id] = {};
    for (const intent of intents) {
      map[racer.id][intent] = 'sm1' + Array.from({ length: 40 }, () =>
        '0123456789abcdef'[Math.floor(Math.random() * 16)]
      ).join('');
    }
  }
  return map;
}

export const MOCK_ADDRESSES = generateMockAddresses();

export interface MockFeedEvent {
  id: string;
  type: 'backing' | 'action' | 'tick' | 'instantlock' | 'payout' | 'system';
  message: string;
  timestamp: number;
  raceId?: string;
  racerName?: string;
  amount?: number;
}

let feedCounter = 0;

export function generateMockFeedEvents(): MockFeedEvent[] {
  const now = Date.now();
  return [
    { id: `f-${++feedCounter}`, type: 'backing', message: 'sm1a3f…d91 backed Nova with 5.0 FIRO', timestamp: now - 120000, racerName: 'Nova', amount: 5.0 },
    { id: `f-${++feedCounter}`, type: 'action', message: 'Boost applied to Blitz (+1.5 speed)', timestamp: now - 90000, racerName: 'Blitz' },
    { id: `f-${++feedCounter}`, type: 'instantlock', message: 'InstantLock confirmed: tx a7c2…f1e8', timestamp: now - 60000 },
    { id: `f-${++feedCounter}`, type: 'tick', message: 'Tick 14 processed — Shadow surges to 2nd!', timestamp: now - 30000 },
    { id: `f-${++feedCounter}`, type: 'action', message: 'Oil Slick hit Shadow (-1.0 speed, 3 ticks)', timestamp: now - 15000, racerName: 'Shadow' },
    { id: `f-${++feedCounter}`, type: 'backing', message: 'sm1e7b…c44 backed Titan with 10.0 FIRO', timestamp: now - 5000, racerName: 'Titan', amount: 10.0 },
  ];
}

export const MOCK_RACE_HISTORY: Race[] = [
  MOCK_FINISHED_RACE,
  {
    ...MOCK_FINISHED_RACE,
    id: 'race-prev-1',
    raceDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    slot: 'B',
    totalPrizePool: 89.4,
  },
  {
    ...MOCK_FINISHED_RACE,
    id: 'race-prev-2',
    raceDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    slot: 'A',
    totalPrizePool: 134.2,
  },
  {
    ...MOCK_FINISHED_RACE,
    id: 'race-prev-3',
    raceDate: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
    slot: 'B',
    totalPrizePool: 56.8,
  },
];
