'use client';

import { useRaceStore } from '@/stores/raceStore';
import { PLACE_PERCENTAGES, BACKING_POOL_SPLIT } from '@sparkderby/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export function BackingPools() {
  const { race } = useRaceStore();
  if (!race) return null;

  const sorted = [...race.racers].sort((a, b) => b.totalBacked - a.totalBacked);
  const maxBacked = sorted[0]?.totalBacked || 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Backing Pools</h3>
          <span className="text-xs text-spark-secondary font-semibold">
            {race.totalPrizePool.toFixed(2)} FIRO
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {sorted.map((racer) => {
          const pct = maxBacked > 0 ? (racer.totalBacked / maxBacked) * 100 : 0;
          return (
            <div key={racer.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{racer.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{racer.backerCount} backers</span>
                  <span className="text-spark-secondary font-semibold">
                    {racer.totalBacked.toFixed(2)} F
                  </span>
                </div>
              </div>
              <div className="h-2 bg-spark-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-spark-secondary/80 to-spark-secondary rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Pool split info */}
        <div className="pt-3 mt-2 border-t border-spark-dark-600/50 grid grid-cols-3 gap-2 text-center">
          {[1, 2, 3].map((place) => (
            <div key={place} className="text-xs">
              <div className="text-gray-500">{place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}</div>
              <div className="text-spark-light font-semibold">
                {(race.totalPrizePool * (PLACE_PERCENTAGES[place] || 0)).toFixed(2)} F
              </div>
              <div className="text-[10px] text-gray-600">{((PLACE_PERCENTAGES[place] || 0) * 100)}%</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
