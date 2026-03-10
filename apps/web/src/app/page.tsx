import { RaceTrack } from '@/components/race/RaceTrack';
import { LeaderBoard } from '@/components/race/LeaderBoard';
import { ActionPanel } from '@/components/race/ActionPanel';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-2">
          Spark <span className="text-spark-secondary">Rush</span>
        </h1>
        <p className="text-gray-400">
          Back your racer. Boost, sabotage, and win FIRO.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RaceTrack />
        </div>
        <div className="space-y-6">
          <LeaderBoard />
          <ActionPanel />
        </div>
      </div>
    </div>
  );
}
