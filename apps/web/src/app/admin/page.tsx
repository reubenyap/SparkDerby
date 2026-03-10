'use client';

import { useState, useEffect } from 'react';
import { MOCK_RACE, MOCK_RACE_HISTORY } from '@/lib/mock-data';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface SystemStatus {
  firoNode: 'connected' | 'disconnected' | 'mock';
  redis: 'connected' | 'disconnected';
  database: 'connected' | 'disconnected';
  chainWatcher: 'polling' | 'idle' | 'mock';
  uptime: number;
  blockHeight: number;
  walletBalance: number;
}

export default function AdminPage() {
  const [status, setStatus] = useState<SystemStatus>({
    firoNode: 'mock',
    redis: 'connected',
    database: 'connected',
    chainWatcher: 'mock',
    uptime: 86400,
    blockHeight: 501234,
    walletBalance: 100.0,
  });

  const race = MOCK_RACE;
  const history = MOCK_RACE_HISTORY;

  const statusColor = (s: string) => {
    if (s === 'connected' || s === 'polling') return 'text-spark-accent';
    if (s === 'mock') return 'text-spark-secondary';
    return 'text-spark-danger';
  };

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System monitoring and race management</p>
      </div>

      {/* System status grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Firo Node', value: status.firoNode },
          { label: 'Redis', value: status.redis },
          { label: 'Database', value: status.database },
          { label: 'Chain Watcher', value: status.chainWatcher },
        ].map((item) => (
          <Card key={item.label}>
            <CardBody className="text-center py-4">
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className={`text-sm font-semibold uppercase ${statusColor(item.value)}`}>
                {item.value}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center py-4">
            <div className="text-xs text-gray-500">Block Height</div>
            <div className="text-lg font-bold text-spark-primary">{status.blockHeight.toLocaleString()}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <div className="text-xs text-gray-500">Wallet Balance</div>
            <div className="text-lg font-bold text-spark-secondary">{status.walletBalance.toFixed(2)} F</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <div className="text-xs text-gray-500">Uptime</div>
            <div className="text-lg font-bold text-spark-accent">{formatUptime(status.uptime)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <div className="text-xs text-gray-500">Completed Races</div>
            <div className="text-lg font-bold">{history.length}</div>
          </CardBody>
        </Card>
      </div>

      {/* Current race management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider">Current Race</h2>
            <StatusBadge status={race.status} />
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500">Race ID</div>
              <div className="text-sm font-mono">{race.id.slice(0, 16)}...</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Slot</div>
              <div className="text-sm font-semibold">{race.slot}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tick</div>
              <div className="text-sm font-semibold">{race.currentTick}/24</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Prize Pool</div>
              <div className="text-sm font-semibold text-spark-secondary">{race.totalPrizePool.toFixed(2)} F</div>
            </div>
          </div>

          {/* Racer status table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-spark-dark-600/50 text-gray-500">
                  <th className="text-left py-2 px-2">Lane</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Archetype</th>
                  <th className="text-right py-2 px-2">Position</th>
                  <th className="text-right py-2 px-2">Speed</th>
                  <th className="text-right py-2 px-2">Stamina</th>
                  <th className="text-right py-2 px-2">Backed</th>
                  <th className="text-right py-2 px-2">Backers</th>
                  <th className="text-left py-2 px-2">Effects</th>
                </tr>
              </thead>
              <tbody>
                {race.racers.map((racer) => (
                  <tr key={racer.id} className="border-b border-spark-dark-600/20 hover:bg-spark-dark-700/20">
                    <td className="py-2 px-2">{racer.lane}</td>
                    <td className="py-2 px-2 font-semibold">{racer.name}</td>
                    <td className="py-2 px-2 capitalize text-gray-400">{racer.archetype}</td>
                    <td className="py-2 px-2 text-right">{racer.position.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right">{racer.speed.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right">{racer.stamina.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right text-spark-secondary">{racer.totalBacked.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right">{racer.backerCount}</td>
                    <td className="py-2 px-2">
                      {racer.statusEffects.length > 0
                        ? racer.statusEffects.map(e => `${e.source}(${e.ticksRemaining}t)`).join(', ')
                        : <span className="text-gray-600">-</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Admin actions */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-spark-dark-600/50">
            <button className="px-4 py-2 text-xs bg-spark-dark-700 border border-spark-dark-600 rounded-lg
                               hover:border-spark-primary/50 transition-colors">
              Force Tick
            </button>
            <button className="px-4 py-2 text-xs bg-spark-dark-700 border border-spark-dark-600 rounded-lg
                               hover:border-spark-secondary/50 transition-colors">
              Trigger Settlement
            </button>
            <button className="px-4 py-2 text-xs bg-spark-dark-700 border border-spark-dark-600 rounded-lg
                               hover:border-spark-cyan/50 transition-colors">
              Run Reconciliation
            </button>
            <button className="px-4 py-2 text-xs bg-spark-dark-700 border border-spark-danger/30 rounded-lg
                               hover:border-spark-danger/50 text-spark-danger transition-colors">
              Cancel Race
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Race history summary */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider">Recent Races</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-spark-dark-600/30">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-spark-dark-700/20">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Race {r.slot}</span>
                  <span className="text-gray-500">{r.raceDate}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-spark-secondary font-semibold">{r.totalPrizePool.toFixed(2)} F</span>
                  <span className="text-gray-500">
                    Winner: {r.racers.find(rc => rc.finishPosition === 1)?.name || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
