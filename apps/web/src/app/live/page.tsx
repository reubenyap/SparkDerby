'use client';

import { useEffect } from 'react';
import { useRaceStore } from '@/stores/raceStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useRaceWebSocket } from '@/hooks/useRaceWebSocket';
import { RaceTrack } from '@/components/race/RaceTrack';
import { LeaderBoard } from '@/components/race/LeaderBoard';
import { BackingPools } from '@/components/race/BackingPools';
import { PayoutBoard } from '@/components/race/PayoutBoard';
import { ActionPanel } from '@/components/race/ActionPanel';
import { LiveFeed } from '@/components/race/LiveFeed';
import { IdentityEntry } from '@/components/player/IdentityEntry';
import { IdentityBadge } from '@/components/player/IdentityBadge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export default function LiveRacePage() {
  const { race, fetchCurrentRace } = useRaceStore();
  const { player, loadFromStorage } = usePlayerStore();

  useEffect(() => {
    loadFromStorage();
    fetchCurrentRace();
  }, [loadFromStorage, fetchCurrentRace]);

  useRaceWebSocket();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Identity bar */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold uppercase tracking-wider">
          Live Race
        </h1>
        <div className="w-80">
          {player ? <IdentityBadge /> : <IdentityEntry />}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left: Track + Feed (spans 3 cols on xl) */}
        <div className="xl:col-span-3 space-y-6">
          <RaceTrack />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BackingPools />
            <PayoutBoard />
          </div>

          <LiveFeed />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <LeaderBoard />
          <ActionPanel />

          {/* Quick backing section */}
          {race && (
            <Card>
              <CardHeader>
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Quick Back</h3>
              </CardHeader>
              <CardBody className="space-y-2">
                {[...race.racers].sort((a, b) => b.position - a.position).map((racer) => (
                  <a
                    key={racer.id}
                    href={`/lobby`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg
                               border border-spark-dark-600/50 hover:border-spark-secondary/30
                               transition-all text-xs"
                  >
                    <span className="font-medium">{racer.name}</span>
                    <span className="text-spark-secondary">{racer.totalBacked.toFixed(1)} F</span>
                  </a>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
