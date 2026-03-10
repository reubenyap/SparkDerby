'use client';

import { useRaceStore } from '@/stores/raceStore';

export function LeaderBoard() {
  const { race } = useRaceStore();

  if (!race) return null;

  const sorted = [...race.racers].sort((a, b) => b.position - a.position);

  return (
    <div className="border border-gray-700 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Standings</h3>
      <div className="space-y-2">
        {sorted.map((racer, i) => (
          <div
            key={racer.id}
            className="flex justify-between items-center text-sm"
          >
            <span>
              <span className="text-gray-500 mr-2">{i + 1}.</span>
              {racer.name}
            </span>
            <span className="text-spark-secondary">
              {racer.totalBacked.toFixed(2)} FIRO
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Prize Pool</span>
          <span className="font-semibold text-spark-accent">
            {race.totalPrizePool.toFixed(2)} FIRO
          </span>
        </div>
      </div>
    </div>
  );
}
