'use client';

import { useEffect } from 'react';
import { useRaceStore } from '@/stores/raceStore';
import { RaceTrack } from '@/components/race/RaceTrack';
import { LeaderBoard } from '@/components/race/LeaderBoard';
import { BackingPools } from '@/components/race/BackingPools';
import { PayoutBoard } from '@/components/race/PayoutBoard';
import { LiveFeed } from '@/components/race/LiveFeed';
import { Card, CardBody } from '@/components/ui/Card';
import Link from 'next/link';

interface RacePageProps {
  params: { raceId: string };
}

export default function RacePage({ params }: RacePageProps) {
  const { race, fetchCurrentRace } = useRaceStore();

  useEffect(() => {
    fetchCurrentRace();
  }, [fetchCurrentRace]);

  if (race && race.id !== params.raceId) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-3xl mb-3 opacity-20">&#x1F50D;</div>
            <h2 className="text-lg font-semibold mb-2">Race {params.raceId.slice(0, 8)}...</h2>
            <p className="text-sm text-gray-500 mb-4">
              Historical race lookup will be available once the API is connected.
            </p>
            <Link href="/live" className="text-sm text-spark-primary hover:underline">
              Watch the current race &rarr;
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/results" className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-bold uppercase tracking-wider">
          Race {race?.slot || params.raceId.slice(0, 8)}
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <RaceTrack />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BackingPools />
            <PayoutBoard />
          </div>
          <LiveFeed />
        </div>
        <div className="space-y-6">
          <LeaderBoard />
        </div>
      </div>
    </div>
  );
}
