'use client';

import { useState } from 'react';
import { MOCK_RACE_HISTORY } from '@/lib/mock-data';
import { PLACE_PERCENTAGES } from '@sparkderby/shared';
import type { Race } from '@sparkderby/shared';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

export default function ResultsPage() {
  const [races] = useState<Race[]>(MOCK_RACE_HISTORY);
  const [expandedRace, setExpandedRace] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider">Race Results</h1>
        <p className="text-sm text-gray-500 mt-1">Past race outcomes and payout records</p>
      </div>

      <div className="space-y-4">
        {races.map((race) => {
          const isExpanded = expandedRace === race.id;
          const finishOrder = [...race.racers]
            .filter(r => r.finishPosition !== null)
            .sort((a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99));

          return (
            <Card key={race.id} hover>
              <button
                onClick={() => setExpandedRace(isExpanded ? null : race.id)}
                className="w-full text-left"
              >
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-display text-sm font-semibold">
                          Race {race.slot}
                        </div>
                        <div className="text-xs text-gray-500">{race.raceDate}</div>
                      </div>
                      <StatusBadge status={race.status} />
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Top 3 mini results */}
                      <div className="hidden sm:flex items-center gap-3">
                        {finishOrder.slice(0, 3).map((racer, i) => (
                          <div key={racer.id} className="flex items-center gap-1.5 text-xs">
                            <span className={
                              i === 0 ? 'text-yellow-400' :
                              i === 1 ? 'text-gray-300' :
                              'text-amber-500'
                            }>
                              {i + 1}.
                            </span>
                            <span className="text-gray-300">{racer.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-spark-secondary">
                          {race.totalPrizePool.toFixed(2)} F
                        </div>
                        <div className="text-[10px] text-gray-500">Prize Pool</div>
                      </div>

                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </CardBody>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-spark-dark-600/50 animate-slide-in">
                  <CardBody className="space-y-4">
                    {/* Finish order table */}
                    <div className="space-y-2">
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider">Finish Order</h4>
                      {finishOrder.map((racer, i) => {
                        const placePool = race.totalPrizePool * (PLACE_PERCENTAGES[i + 1] || 0);
                        return (
                          <div
                            key={racer.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                              i < 3 ? 'bg-spark-dark-700/30' : ''
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                              ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                i === 1 ? 'bg-gray-400/20 text-gray-300' :
                                i === 2 ? 'bg-amber-600/20 text-amber-500' :
                                'bg-spark-dark-700 text-gray-500'}`}
                            >
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <span className="text-sm font-medium">{racer.name}</span>
                              <span className="text-xs text-gray-500 ml-2 capitalize">({racer.archetype})</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400">Backed: {racer.totalBacked.toFixed(2)} F</div>
                              {i < 3 && (
                                <div className="text-xs text-spark-secondary font-semibold">
                                  Pool: {placePool.toFixed(2)} F
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Race stats */}
                    <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t border-spark-dark-600/30">
                      <div>
                        <div className="text-xs text-gray-500">Total Pool</div>
                        <div className="text-sm font-semibold text-spark-secondary">{race.totalPrizePool.toFixed(2)} F</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Treasury</div>
                        <div className="text-sm font-semibold">{race.totalTreasury.toFixed(2)} F</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Reserve</div>
                        <div className="text-sm font-semibold">{race.totalReserve.toFixed(2)} F</div>
                      </div>
                    </div>
                  </CardBody>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {races.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-500">No race results yet.</p>
            <Link href="/live" className="text-sm text-spark-primary hover:underline mt-2 inline-block">
              Watch the current race &rarr;
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
