'use client';

import { useEffect, useState } from 'react';
import { useRaceStore } from '@/stores/raceStore';
import { usePlayerStore } from '@/stores/playerStore';
import { IdentityEntry } from '@/components/player/IdentityEntry';
import { IdentityBadge } from '@/components/player/IdentityBadge';
import { RacerCard } from '@/components/race/RacerCard';
import { BackingCard } from '@/components/race/BackingCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Countdown } from '@/components/ui/Countdown';
import Link from 'next/link';

export default function LobbyPage() {
  const { race, fetchCurrentRace } = useRaceStore();
  const { player, loadFromStorage } = usePlayerStore();
  const [selectedRacer, setSelectedRacer] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage();
    fetchCurrentRace();
  }, [loadFromStorage, fetchCurrentRace]);

  const sorted = race ? [...race.racers].sort((a, b) => b.position - a.position) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">Race Lobby</h1>
          {race && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-400">Race {race.slot}</span>
              <StatusBadge status={race.status} />
              {race.status === 'active' && (
                <Countdown targetTime={race.endsAt} compact className="text-xs text-spark-secondary" />
              )}
            </div>
          )}
        </div>
        {race?.status === 'active' && (
          <Link
            href="/live"
            className="px-4 py-2 bg-spark-accent text-white rounded-lg text-sm font-semibold
                       hover:bg-spark-accent-light transition-all active:scale-95"
          >
            Watch Live
          </Link>
        )}
      </div>

      {/* Identity section */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider">Your Identity</h2>
        </CardHeader>
        <CardBody>
          {player ? <IdentityBadge /> : <IdentityEntry />}
        </CardBody>
      </Card>

      {/* Racer selection grid */}
      {race && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-gray-400">
              Select a Racer to Back
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sorted.map((racer, i) => (
                <RacerCard
                  key={racer.id}
                  racer={racer}
                  rank={i + 1}
                  selected={selectedRacer === racer.id}
                  onClick={() => setSelectedRacer(prev => prev === racer.id ? null : racer.id)}
                />
              ))}
            </div>
          </div>

          {/* Backing panel */}
          <div className="space-y-4">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-gray-400">
              Back Racer
            </h2>
            {selectedRacer ? (
              <BackingCard racer={race.racers.find(r => r.id === selectedRacer)!} />
            ) : (
              <Card>
                <CardBody className="text-center py-12">
                  <div className="text-3xl opacity-20 mb-2">&larr;</div>
                  <p className="text-xs text-gray-500">Select a racer to see backing instructions</p>
                </CardBody>
              </Card>
            )}

            {/* Prize pool info */}
            <Card glow="amber">
              <CardBody className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Current Prize Pool</div>
                <div className="text-3xl font-bold text-spark-secondary mt-1">
                  {race.totalPrizePool.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">FIRO</div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
