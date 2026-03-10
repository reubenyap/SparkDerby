'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyAddress } from '@/components/ui/CopyAddress';
import Link from 'next/link';

interface RacerSnapshot {
  id: string;
  lane: number;
  name: string;
  archetype: string;
}

interface TickEntry {
  tick: number;
  blockHash: string;
  randomSeed: string;
  racerStates: Record<string, unknown>[];
  actionsApplied: Record<string, unknown>[];
  commentary?: string;
}

interface ActionEntry {
  id: string;
  actionType: string;
  racerId: string;
  status: string;
  cost: number;
  appliedAtTick: number | null;
  effectMagnitude: number;
}

interface FinishEntry {
  racerId: string;
  name: string;
  position: number;
  finishTick: number | null;
  place: number;
}

interface SettlementInfo {
  status: string;
  totalPrizePool: number;
  totalTreasury: number;
  totalReserve: number;
  payouts: Record<string, unknown>[];
  completedAt: string | null;
}

interface ReplayLog {
  version: string;
  raceId: string;
  slot: string;
  raceDate: string;
  serverSecretHash: string;
  serverSecret: string | null;
  racers: RacerSnapshot[];
  ticks: TickEntry[];
  actions: ActionEntry[];
  finishOrder: FinishEntry[];
  settlement: SettlementInfo | null;
}

// Mock replay log for offline dev
const MOCK_REPLAY: ReplayLog = {
  version: '1.0',
  raceId: 'mock-race-1',
  slot: 'A',
  raceDate: '2026-03-10',
  serverSecretHash: 'a1b2c3d4e5f6...commit_hash',
  serverSecret: 'revealed_secret_hex_string',
  racers: [
    { id: 'r1', lane: 1, name: 'Nova', archetype: 'balanced' },
    { id: 'r2', lane: 2, name: 'Blitz', archetype: 'sprinter' },
    { id: 'r3', lane: 3, name: 'Shadow', archetype: 'closer' },
    { id: 'r4', lane: 4, name: 'Titan', archetype: 'tank' },
    { id: 'r5', lane: 5, name: 'Chaos', archetype: 'wildcard' },
    { id: 'r6', lane: 6, name: 'Cipher', archetype: 'technician' },
  ],
  ticks: Array.from({ length: 24 }, (_, i) => ({
    tick: i + 1,
    blockHash: `0x${(i + 1).toString(16).padStart(8, '0')}...block`,
    randomSeed: `seed_tick_${i + 1}`,
    racerStates: [],
    actionsApplied: [],
    commentary: i === 23 ? 'Nova crosses the finish line!' : undefined,
  })),
  actions: [
    { id: 'a1', actionType: 'boost', racerId: 'r1', status: 'applied', cost: 0.1, appliedAtTick: 5, effectMagnitude: 1.5 },
    { id: 'a2', actionType: 'emp', racerId: 'r2', status: 'applied', cost: 0.2, appliedAtTick: 8, effectMagnitude: -2.0 },
    { id: 'a3', actionType: 'oil_slick', racerId: 'r3', status: 'applied', cost: 0.2, appliedAtTick: 12, effectMagnitude: -1.0 },
    { id: 'a4', actionType: 'overclock', racerId: 'r1', status: 'applied', cost: 0.5, appliedAtTick: 15, effectMagnitude: 1.0 },
    { id: 'a5', actionType: 'black_swan', racerId: 'r5', status: 'applied', cost: 1.0, appliedAtTick: 18, effectMagnitude: 0 },
  ],
  finishOrder: [
    { racerId: 'r1', name: 'Nova', position: 100, finishTick: 23, place: 1 },
    { racerId: 'r2', name: 'Blitz', position: 97.2, finishTick: null, place: 2 },
    { racerId: 'r3', name: 'Shadow', position: 94.8, finishTick: null, place: 3 },
    { racerId: 'r4', name: 'Titan', position: 89.1, finishTick: null, place: 4 },
    { racerId: 'r5', name: 'Chaos', position: 82.5, finishTick: null, place: 5 },
    { racerId: 'r6', name: 'Cipher', position: 78.3, finishTick: null, place: 6 },
  ],
  settlement: {
    status: 'completed',
    totalPrizePool: 45.0,
    totalTreasury: 6.5,
    totalReserve: 1.2,
    payouts: [
      { playerId: 'p1', place: 1, payout: 27.0, address: 'sm1aaa...' },
      { playerId: 'p2', place: 2, payout: 11.25, address: 'sm1bbb...' },
      { playerId: 'p3', place: 3, payout: 6.75, address: 'sm1ccc...' },
    ],
    completedAt: '2026-03-10T12:05:00Z',
  },
};

const ACTION_ICONS: Record<string, string> = {
  boost: '⚡', emp: '💥', oil_slick: '🛢', overclock: '⚙️', black_swan: '🦆',
};

const MEDALS = ['🥇', '🥈', '🥉'];

type Tab = 'overview' | 'ticks' | 'actions' | 'settlement' | 'verify';

export default function AuditPage() {
  const params = useParams();
  const raceId = params.raceId as string;
  const [replay, setReplay] = useState<ReplayLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReplay() {
      try {
        const res = await fetch(`/api/audit/${raceId}/replay`);
        if (res.ok) {
          setReplay(await res.json());
        } else {
          // Fall back to mock data
          setReplay(MOCK_REPLAY);
        }
      } catch {
        setReplay(MOCK_REPLAY);
      } finally {
        setLoading(false);
      }
    }
    fetchReplay();
  }, [raceId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <div className="animate-pulse text-gray-500">Loading replay data...</div>
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <p className="text-red-400">{error || 'Failed to load replay log.'}</p>
        <Link href="/results" className="text-sm text-spark-primary hover:underline mt-4 inline-block">
          Back to results
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'ticks', label: `Ticks (${replay.ticks.length})` },
    { key: 'actions', label: `Actions (${replay.actions.length})` },
    { key: 'settlement', label: 'Settlement' },
    { key: 'verify', label: 'Verify' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Audit — Race {replay.slot}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {replay.raceDate} &middot; {replay.ticks.length} ticks &middot; {replay.actions.length} actions
          </p>
        </div>
        <Link href="/results" className="text-sm text-gray-400 hover:text-white transition-colors">
          &larr; Results
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-spark-dark-600/50">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-spark-primary text-spark-primary'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab replay={replay} />}
      {tab === 'ticks' && <TicksTab replay={replay} />}
      {tab === 'actions' && <ActionsTab replay={replay} />}
      {tab === 'settlement' && <SettlementTab replay={replay} />}
      {tab === 'verify' && <VerifyTab replay={replay} />}
    </div>
  );
}

function OverviewTab({ replay }: { replay: ReplayLog }) {
  return (
    <div className="space-y-6">
      {/* Podium */}
      <Card>
        <CardHeader title="Finish Order" />
        <CardBody className="space-y-2">
          {replay.finishOrder.map((entry, i) => {
            const racer = replay.racers.find(r => r.id === entry.racerId);
            return (
              <div
                key={entry.racerId}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  i < 3 ? 'bg-spark-dark-700/30' : ''
                }`}
              >
                <span className="text-lg w-8 text-center">
                  {i < 3 ? MEDALS[i] : `${i + 1}.`}
                </span>
                <div className="flex-1">
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-xs text-gray-500 ml-2 capitalize">
                    ({racer?.archetype || 'unknown'})
                  </span>
                </div>
                <div className="text-right text-sm">
                  <span className="text-gray-400">{entry.position.toFixed(1)}%</span>
                  {entry.finishTick && (
                    <span className="text-xs text-gray-500 ml-2">T{entry.finishTick}</span>
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Race metadata */}
      <Card>
        <CardHeader title="Race Metadata" />
        <CardBody className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Race ID</span>
              <div className="font-mono text-xs mt-1 text-gray-300 break-all">{replay.raceId}</div>
            </div>
            <div>
              <span className="text-gray-500">Version</span>
              <div className="mt-1">{replay.version}</div>
            </div>
            <div>
              <span className="text-gray-500">Slot</span>
              <div className="mt-1">Race {replay.slot}</div>
            </div>
            <div>
              <span className="text-gray-500">Date</span>
              <div className="mt-1">{replay.raceDate}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Racers */}
      <Card>
        <CardHeader title="Racers" />
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {replay.racers.map(r => (
              <div key={r.id} className="bg-spark-dark-700/30 rounded-lg px-3 py-2">
                <div className="font-medium text-sm">Lane {r.lane}: {r.name}</div>
                <div className="text-xs text-gray-500 capitalize">{r.archetype}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function TicksTab({ replay }: { replay: ReplayLog }) {
  const [expandedTick, setExpandedTick] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader title="Tick-by-Tick Log" />
      <CardBody className="space-y-1 max-h-[600px] overflow-y-auto">
        {replay.ticks.map(tick => {
          const isExpanded = expandedTick === tick.tick;
          const actionsThisTick = replay.actions.filter(a => a.appliedAtTick === tick.tick);

          return (
            <div key={tick.tick} className="border-b border-spark-dark-600/20 last:border-0">
              <button
                onClick={() => setExpandedTick(isExpanded ? null : tick.tick)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-spark-dark-700/20 transition-colors rounded"
              >
                <span className="font-mono text-xs text-spark-primary w-8">T{tick.tick}</span>
                <div className="flex-1 text-sm">
                  {actionsThisTick.length > 0 && (
                    <span className="text-yellow-400 mr-2">
                      {actionsThisTick.map(a => ACTION_ICONS[a.actionType] || '?').join(' ')}
                    </span>
                  )}
                  {tick.commentary && (
                    <span className="text-gray-300 italic">{tick.commentary}</span>
                  )}
                  {!tick.commentary && actionsThisTick.length === 0 && (
                    <span className="text-gray-600">Standard tick</span>
                  )}
                </div>
                <svg
                  className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 text-xs animate-slide-in">
                  <div>
                    <span className="text-gray-500">Block Hash: </span>
                    <span className="font-mono text-gray-400">{tick.blockHash}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Random Seed: </span>
                    <span className="font-mono text-gray-400">{tick.randomSeed}</span>
                  </div>
                  {actionsThisTick.length > 0 && (
                    <div className="mt-2">
                      <span className="text-gray-500">Actions Applied:</span>
                      <div className="mt-1 space-y-1">
                        {actionsThisTick.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-gray-300">
                            <span>{ACTION_ICONS[a.actionType] || '?'}</span>
                            <span className="capitalize">{a.actionType.replace('_', ' ')}</span>
                            <span className="text-gray-500">on {replay.racers.find(r => r.id === a.racerId)?.name}</span>
                            <span className="text-gray-500">({a.effectMagnitude > 0 ? '+' : ''}{a.effectMagnitude})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function ActionsTab({ replay }: { replay: ReplayLog }) {
  return (
    <Card>
      <CardHeader title="All Actions" />
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-spark-dark-600/50">
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Target</th>
                <th className="pb-2 pr-3">Tick</th>
                <th className="pb-2 pr-3">Cost</th>
                <th className="pb-2 pr-3">Effect</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-spark-dark-600/20">
              {replay.actions.map(action => {
                const racer = replay.racers.find(r => r.id === action.racerId);
                return (
                  <tr key={action.id} className="hover:bg-spark-dark-700/20">
                    <td className="py-2 pr-3">
                      <span className="mr-1">{ACTION_ICONS[action.actionType] || '?'}</span>
                      <span className="capitalize">{action.actionType.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2 pr-3 text-gray-300">{racer?.name || action.racerId}</td>
                    <td className="py-2 pr-3 font-mono text-gray-400">
                      {action.appliedAtTick ? `T${action.appliedAtTick}` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-spark-secondary">{action.cost.toFixed(2)} F</td>
                    <td className="py-2 pr-3 text-gray-400">
                      {action.effectMagnitude > 0 ? '+' : ''}{action.effectMagnitude}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={action.status as 'applied' | 'pending' | 'rejected'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {replay.actions.length === 0 && (
          <p className="text-center text-gray-500 py-6">No actions recorded for this race.</p>
        )}
      </CardBody>
    </Card>
  );
}

function SettlementTab({ replay }: { replay: ReplayLog }) {
  if (!replay.settlement) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-gray-500">Settlement data not yet available.</p>
          <p className="text-xs text-gray-600 mt-1">Race may still be active or pending settlement.</p>
        </CardBody>
      </Card>
    );
  }

  const s = replay.settlement;

  return (
    <div className="space-y-6">
      {/* Pool breakdown */}
      <Card>
        <CardHeader title="Pool Breakdown" />
        <CardBody>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-xs text-gray-500 mb-1">Prize Pool</div>
              <div className="text-xl font-bold text-spark-secondary">{s.totalPrizePool.toFixed(2)} F</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Treasury</div>
              <div className="text-xl font-bold">{s.totalTreasury.toFixed(2)} F</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Reserve</div>
              <div className="text-xl font-bold">{s.totalReserve.toFixed(2)} F</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <StatusBadge status={s.status as 'completed' | 'pending' | 'failed'} />
            {s.completedAt && (
              <span className="text-xs text-gray-500 ml-2">
                {new Date(s.completedAt).toLocaleString()}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader title="Payouts" />
        <CardBody className="space-y-2">
          {(s.payouts as { playerId: string; place: number; payout: number; address: string }[]).map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-spark-dark-700/20 rounded-lg">
              <span className="text-lg w-8 text-center">{MEDALS[p.place - 1] || `${p.place}.`}</span>
              <div className="flex-1">
                <div className="text-sm font-mono text-gray-400">{p.playerId}</div>
                {p.address && (
                  <div className="text-xs text-gray-500 font-mono">{p.address}</div>
                )}
              </div>
              <div className="text-sm font-bold text-spark-secondary">{p.payout.toFixed(2)} F</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function VerifyTab({ replay }: { replay: ReplayLog }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Randomness Commitment" />
        <CardBody className="space-y-4 text-sm">
          <div>
            <span className="text-gray-500 block mb-1">Server Secret Hash (published before race)</span>
            <div className="font-mono text-xs bg-spark-dark-700/50 rounded px-3 py-2 break-all text-gray-300">
              {replay.serverSecretHash || 'Not available'}
            </div>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Server Secret (revealed after race)</span>
            <div className="font-mono text-xs bg-spark-dark-700/50 rounded px-3 py-2 break-all text-gray-300">
              {replay.serverSecret || 'Not yet revealed — race may still be active'}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How to Verify" />
        <CardBody className="text-sm text-gray-400 space-y-3">
          <p>
            This race uses commit-reveal randomness. The server commits to a secret
            hash before the race starts, then reveals the secret after the race ends.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Verify that <code className="text-gray-300">SHA256(serverSecret)</code> matches{' '}
              <code className="text-gray-300">serverSecretHash</code>
            </li>
            <li>
              For each tick, verify the random seed:{' '}
              <code className="text-gray-300">HMAC-SHA256(secret, raceId:tick:blockHash)</code>
            </li>
            <li>
              Replay the deterministic race engine with the verified seeds and actions
              to confirm the finish order matches
            </li>
          </ol>
          <div className="mt-4 p-3 bg-spark-dark-700/30 rounded-lg">
            <p className="text-xs text-gray-500">
              Use the <code className="text-spark-primary">verifyReplayLog()</code> function
              from <code className="text-spark-primary">@sparkderby/shared</code> to automatically
              verify this race. Download the full replay JSON from the API endpoint:{' '}
              <code className="text-gray-300">/api/audit/{replay.raceId}/replay</code>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
