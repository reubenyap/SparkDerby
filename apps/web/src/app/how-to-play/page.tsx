import {
  ACTION_DEFINITIONS,
  MIN_BACKING_AMOUNT,
  PLACE_PERCENTAGES,
  TICKS_PER_RACE,
  TICK_INTERVAL_MINUTES,
  RACERS_PER_RACE,
} from '@sparkderby/shared';

export default function HowToPlayPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">How to Play</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-spark-secondary">The Basics</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>2 races per day (Race A: 00:00-12:00 UTC, Race B: 12:00-00:00 UTC)</li>
          <li>{RACERS_PER_RACE} racers per race, each with a unique archetype</li>
          <li>{TICKS_PER_RACE} ticks per race, 1 tick every {TICK_INTERVAL_MINUTES} minutes</li>
          <li>Back a racer by sending FIRO to their backing address (min {MIN_BACKING_AMOUNT} FIRO)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-spark-secondary">Payouts</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>1st place backers share {PLACE_PERCENTAGES[1] * 100}% of the prize pool</li>
          <li>2nd place backers share {PLACE_PERCENTAGES[2] * 100}% of the prize pool</li>
          <li>3rd place backers share {PLACE_PERCENTAGES[3] * 100}% of the prize pool</li>
          <li>Your share is proportional to how much you backed</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-spark-secondary">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(ACTION_DEFINITIONS).map(([key, action]) => (
            <div key={key} className="border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold capitalize">{key.replace('_', ' ')}</h3>
              <p className="text-sm text-gray-400">{action.description}</p>
              <p className="text-sm text-spark-secondary mt-1">{action.cost} FIRO</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
