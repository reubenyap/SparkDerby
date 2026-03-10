'use client';

import { useRaceStore } from '@/stores/raceStore';
import { ARCHETYPES } from '@sparkderby/shared';

export function RaceTrack() {
  const { race, loading } = useRaceStore();

  if (loading) {
    return (
      <div className="border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400 animate-pulse">Loading race...</p>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">No active race. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Race {race.slot} - Tick {race.currentTick}/24
        </h2>
        <span className="text-sm px-2 py-1 rounded bg-spark-primary/20 text-spark-primary">
          {race.status}
        </span>
      </div>

      <div className="space-y-3">
        {race.racers.map((racer) => {
          const profile = ARCHETYPES[racer.archetype];
          const widthPercent = Math.min(100, racer.position);
          return (
            <div key={racer.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>
                  <span className="font-semibold">{racer.name}</span>
                  <span className="text-gray-500 ml-2">({racer.archetype})</span>
                </span>
                <span className="text-gray-400">
                  {racer.position.toFixed(1)}%
                </span>
              </div>
              <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-spark-primary to-spark-secondary rounded-full transition-all duration-1000"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
