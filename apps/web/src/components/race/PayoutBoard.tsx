'use client';

import { useRaceStore } from '@/stores/raceStore';
import { PLACE_PERCENTAGES } from '@sparkderby/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export function PayoutBoard() {
  const { race } = useRaceStore();
  if (!race) return null;

  const sorted = [...race.racers].sort((a, b) => b.position - a.position);

  // Project payouts based on current standings
  const projectedPayouts = sorted.map((racer, idx) => {
    const place = idx + 1;
    const placePool = race.totalPrizePool * (PLACE_PERCENTAGES[place] || 0);
    // If you're the only backer, you'd get the entire place pool
    // In reality it's proportional — show per-FIRO return
    const perFiro = racer.totalBacked > 0 ? placePool / racer.totalBacked : 0;
    return { racer, place, placePool, perFiro };
  });

  return (
    <Card glow="amber">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Projected Payouts</h3>
          <span className="text-[10px] text-gray-500">Based on current standings</span>
        </div>
      </CardHeader>
      <CardBody className="space-y-2">
        {projectedPayouts.slice(0, 3).map(({ racer, place, placePool, perFiro }) => (
          <div
            key={racer.id}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              place === 1 ? 'bg-yellow-500/5 border border-yellow-500/10' :
              place === 2 ? 'bg-gray-400/5 border border-gray-400/10' :
              'bg-amber-600/5 border border-amber-600/10'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${place === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                place === 2 ? 'bg-gray-400/20 text-gray-300' :
                'bg-amber-600/20 text-amber-500'}`}
            >
              {place}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{racer.name}</div>
              <div className="text-[10px] text-gray-500">{racer.backerCount} backers</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-spark-secondary">
                {placePool.toFixed(2)} F
              </div>
              <div className="text-[10px] text-gray-500">
                {perFiro.toFixed(2)}x per FIRO
              </div>
            </div>
          </div>
        ))}

        {/* Out of money positions */}
        {projectedPayouts.slice(3).map(({ racer, place }) => (
          <div key={racer.id} className="flex items-center gap-3 px-2 py-1 text-xs text-gray-600">
            <span className="w-7 text-center">{place}</span>
            <span className="flex-1 truncate">{racer.name}</span>
            <span>No payout</span>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
