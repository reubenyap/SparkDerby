'use client';

import { useRaceStore } from '@/stores/raceStore';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export function LeaderBoard() {
  const { race } = useRaceStore();
  if (!race) return null;

  const sorted = [...race.racers].sort((a, b) => b.position - a.position);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Standings</h3>
          <span className="text-xs text-gray-500">Tick {race.currentTick}</span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-spark-dark-600/30">
          {sorted.map((racer, i) => (
            <div
              key={racer.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-spark-dark-700/20 transition-colors"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-gray-400/20 text-gray-300' :
                  i === 2 ? 'bg-amber-600/20 text-amber-500' :
                  'bg-spark-dark-700 text-gray-500'}`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{racer.name}</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold">{racer.position.toFixed(1)}%</div>
                <div className="text-[10px] text-spark-secondary">{racer.totalBacked.toFixed(1)} F</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-spark-dark-600/50">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Prize Pool</span>
            <span className="font-semibold text-spark-accent">{race.totalPrizePool.toFixed(2)} FIRO</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
