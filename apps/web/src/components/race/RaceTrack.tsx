'use client';

import type { Archetype } from '@sparkderby/shared';
import { TICKS_PER_RACE } from '@sparkderby/shared';
import { useRaceStore } from '@/stores/raceStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Countdown } from '@/components/ui/Countdown';

const laneColors: Record<Archetype, { bar: string; bg: string }> = {
  balanced: { bar: 'from-blue-500 to-blue-400', bg: 'bg-blue-500/5' },
  sprinter: { bar: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-500/5' },
  closer: { bar: 'from-purple-500 to-pink-400', bg: 'bg-purple-500/5' },
  tank: { bar: 'from-gray-400 to-gray-300', bg: 'bg-gray-500/5' },
  wildcard: { bar: 'from-red-500 to-rose-400', bg: 'bg-red-500/5' },
  technician: { bar: 'from-cyan-400 to-blue-400', bg: 'bg-cyan-500/5' },
};

export function RaceTrack() {
  const { race, loading } = useRaceStore();

  if (loading) {
    return (
      <div className="border border-spark-dark-600/50 rounded-xl bg-spark-dark-800/80 p-8 text-center">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-10 bg-spark-dark-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="border border-spark-dark-600/50 rounded-xl bg-spark-dark-800/80 p-12 text-center">
        <div className="text-4xl mb-3 opacity-20">&#x1F3CE;</div>
        <p className="text-gray-500">No active race. Check back soon.</p>
      </div>
    );
  }

  const sorted = [...race.racers].sort((a, b) => b.position - a.position);
  const tickProgress = (race.currentTick / TICKS_PER_RACE) * 100;

  return (
    <div className="border border-spark-dark-600/50 rounded-xl bg-spark-dark-800/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-spark-dark-600/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
            Race {race.slot}
          </h2>
          <StatusBadge status={race.status} />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-400">
            Tick <span className="text-spark-light font-semibold">{race.currentTick}</span>/{TICKS_PER_RACE}
          </span>
          {race.status === 'active' && race.endsAt && (
            <Countdown targetTime={race.endsAt} compact className="text-spark-secondary" />
          )}
        </div>
      </div>

      {/* Tick progress bar */}
      <div className="h-1 bg-spark-dark-700">
        <div
          className="h-full bg-gradient-to-r from-spark-primary to-spark-secondary transition-all duration-1000"
          style={{ width: `${tickProgress}%` }}
        />
      </div>

      {/* Track lanes */}
      <div className="p-4 space-y-2">
        {sorted.map((racer, idx) => {
          const colors = laneColors[racer.archetype];
          const pct = Math.min(100, racer.position);
          return (
            <div key={racer.id} className={`relative rounded-lg p-2 ${colors.bg}`}>
              <div className="flex items-center gap-3">
                {/* Position number */}
                <span className="w-5 text-center text-xs font-bold text-gray-500">{idx + 1}</span>

                {/* Name + archetype */}
                <div className="w-24 flex-shrink-0">
                  <div className="text-sm font-semibold truncate">{racer.name}</div>
                  <div className="text-[10px] text-gray-500 capitalize">{racer.archetype}</div>
                </div>

                {/* Track bar */}
                <div className="flex-1 relative">
                  <div className="h-7 bg-spark-dark-700/60 rounded-full overflow-hidden relative">
                    <div className="track-shimmer absolute inset-0 rounded-full" />
                    <div
                      className={`h-full bg-gradient-to-r ${colors.bar} rounded-full racer-bar relative z-10 flex items-center justify-end pr-2`}
                      style={{ width: `${pct}%` }}
                    >
                      {pct > 15 && (
                        <span className="text-[10px] font-bold text-black/70">{pct.toFixed(1)}%</span>
                      )}
                    </div>
                    {/* Finish line */}
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-spark-secondary/30 z-20" />
                  </div>
                </div>

                {/* Stats */}
                <div className="w-16 text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">{racer.speed.toFixed(1)} spd</div>
                  <div className="text-[10px] text-spark-secondary">{racer.totalBacked.toFixed(1)} F</div>
                </div>
              </div>

              {/* Status effects inline */}
              {racer.statusEffects.length > 0 && (
                <div className="ml-8 mt-1 flex gap-1">
                  {racer.statusEffects.map((eff, i) => (
                    <span
                      key={i}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        eff.type === 'buff' ? 'bg-spark-accent/15 text-spark-accent' : 'bg-spark-danger/15 text-spark-danger'
                      }`}
                    >
                      {eff.source} {eff.ticksRemaining}t
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
