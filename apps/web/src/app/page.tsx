'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRaceStore } from '@/stores/raceStore';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Countdown } from '@/components/ui/Countdown';
import { TICKS_PER_RACE, RACERS_PER_RACE } from '@sparkderby/shared';

export default function HomePage() {
  const { race, fetchCurrentRace } = useRaceStore();

  useEffect(() => {
    fetchCurrentRace();
  }, [fetchCurrentRace]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-16 relative">
        <div className="absolute inset-0 bg-gradient-radial from-spark-primary/5 via-transparent to-transparent" />
        <div className="relative">
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight">
            SPARK <span className="text-spark-secondary glow-amber-text">RUSH</span>
          </h1>
          <p className="mt-4 text-gray-400 text-lg max-w-md mx-auto">
            Back your racer. Boost, sabotage, and win FIRO. Privacy-first on-chain racing.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/lobby"
              className="px-8 py-3 bg-spark-primary text-white rounded-lg font-semibold
                         hover:bg-spark-primary-light transition-all active:scale-95 glow-purple"
            >
              Enter Lobby
            </Link>
            <Link
              href="/how-to-play"
              className="px-8 py-3 border border-spark-dark-600 text-gray-300 rounded-lg
                         hover:border-spark-primary/50 hover:text-spark-light transition-all"
            >
              How to Play
            </Link>
          </div>
        </div>
      </section>

      {/* Current race preview */}
      {race && (
        <section className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-gray-400">
              Current Race
            </h2>
            <StatusBadge status={race.status} />
          </div>

          <Link href="/live">
            <Card hover glow="purple" className="group">
              <CardBody className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="font-display text-2xl font-bold">Race {race.slot}</div>
                    <div className="text-sm text-gray-500">Tick {race.currentTick}/{TICKS_PER_RACE}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Prize Pool</div>
                    <div className="text-2xl font-bold text-spark-secondary">{race.totalPrizePool.toFixed(2)} <span className="text-sm">FIRO</span></div>
                  </div>
                </div>

                {/* Mini track preview */}
                <div className="space-y-1.5">
                  {[...race.racers].sort((a, b) => b.position - a.position).map((racer) => (
                    <div key={racer.id} className="flex items-center gap-3">
                      <span className="w-16 text-xs font-medium truncate">{racer.name}</span>
                      <div className="flex-1 h-3 bg-spark-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-spark-primary to-spark-secondary rounded-full racer-bar"
                          style={{ width: `${Math.min(100, racer.position)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-gray-400">{racer.position.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-center text-sm text-spark-primary group-hover:text-spark-primary-light transition-colors">
                  Watch Live &rarr;
                </div>
              </CardBody>
            </Card>
          </Link>
        </section>
      )}

      {/* Features grid */}
      <section className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Privacy-First', desc: 'All transactions use Firo Spark for complete privacy. No browser wallets needed.', icon: '\uD83D\uDD12' },
          { title: 'InstantLock', desc: 'Transactions confirm in ~2 seconds via Firo InstantSend. Actions apply on the next tick.', icon: '\u26A1' },
          { title: 'Fair Racing', desc: 'Deterministic engine with committed randomness. Fully verifiable race outcomes.', icon: '\uD83C\uDFCE' },
        ].map((f) => (
          <Card key={f.title} hover>
            <CardBody className="text-center py-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      {/* Stats bar */}
      <section className="max-w-4xl mx-auto">
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-spark-secondary">2</div>
                <div className="text-xs text-gray-500">Races per Day</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-spark-primary">{RACERS_PER_RACE}</div>
                <div className="text-xs text-gray-500">Racers per Race</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-spark-accent">{TICKS_PER_RACE}</div>
                <div className="text-xs text-gray-500">Ticks per Race</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-spark-cyan">~2s</div>
                <div className="text-xs text-gray-500">InstantLock</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
