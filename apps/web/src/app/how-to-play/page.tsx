import {
  ACTION_DEFINITIONS,
  MIN_BACKING_AMOUNT,
  PLACE_PERCENTAGES,
  TICKS_PER_RACE,
  TICK_INTERVAL_MINUTES,
  RACERS_PER_RACE,
  ACTION_RATE_LIMIT_SECONDS,
} from '@sparkderby/shared';
import { Card, CardBody } from '@/components/ui/Card';

export default function HowToPlayPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">How to Play</h1>
        <p className="text-sm text-gray-500 mt-2">
          Spark Rush is a privacy-first racing game on the Firo blockchain. No browser wallets. No smart contracts. Just Spark transactions.
        </p>
      </div>

      {/* The Basics */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-spark-secondary uppercase tracking-wider">The Basics</h2>
        <Card>
          <CardBody className="space-y-3 text-sm text-gray-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-spark-dark-600/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Races per Day</div>
                <div className="text-lg font-bold">2</div>
                <div className="text-xs text-gray-500">A: 00:00-12:00 UTC</div>
                <div className="text-xs text-gray-500">B: 12:00-24:00 UTC</div>
              </div>
              <div className="border border-spark-dark-600/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Racers per Race</div>
                <div className="text-lg font-bold">{RACERS_PER_RACE}</div>
                <div className="text-xs text-gray-500">Each with a unique archetype</div>
              </div>
              <div className="border border-spark-dark-600/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Ticks per Race</div>
                <div className="text-lg font-bold">{TICKS_PER_RACE}</div>
                <div className="text-xs text-gray-500">1 tick every {TICK_INTERVAL_MINUTES} minutes</div>
              </div>
              <div className="border border-spark-dark-600/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Min Backing</div>
                <div className="text-lg font-bold">{MIN_BACKING_AMOUNT} FIRO</div>
                <div className="text-xs text-gray-500">No maximum limit</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* How to Back */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-spark-secondary uppercase tracking-wider">How to Back a Racer</h2>
        <Card>
          <CardBody className="space-y-4">
            {[
              { step: '1', title: 'Identify yourself', desc: 'Enter your Spark address or Spark Name in the lobby.' },
              { step: '2', title: 'Choose a racer', desc: 'Select which racer you want to back based on archetype and odds.' },
              { step: '3', title: 'Send FIRO', desc: 'Send FIRO to the unique Spark address shown. Use the QR code or copy the address.' },
              { step: '4', title: 'Wait for confirmation', desc: 'InstantLock confirms your transaction in ~2 seconds.' },
              { step: '5', title: 'Win payouts', desc: 'If your racer finishes top 3, you get a proportional share of the prize pool.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-spark-primary/20 text-spark-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </section>

      {/* Payouts */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-spark-secondary uppercase tracking-wider">Payouts</h2>
        <Card glow="amber">
          <CardBody>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[1, 2, 3].map((place) => (
                <div key={place} className={`p-4 rounded-lg ${
                  place === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  place === 2 ? 'bg-gray-400/10 border border-gray-400/20' :
                  'bg-amber-600/10 border border-amber-600/20'
                }`}>
                  <div className={`text-2xl font-bold ${
                    place === 1 ? 'text-yellow-400' : place === 2 ? 'text-gray-300' : 'text-amber-500'
                  }`}>
                    {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
                  </div>
                  <div className="text-lg font-bold text-spark-secondary mt-1">
                    {((PLACE_PERCENTAGES[place] || 0) * 100)}%
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">of prize pool</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">
              Your share is proportional to how much you backed relative to other backers of the same racer.
            </p>
          </CardBody>
        </Card>
      </section>

      {/* Actions */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-spark-secondary uppercase tracking-wider">Actions</h2>
        <p className="text-sm text-gray-400">
          Actions let you influence the race. Send FIRO to a racer&apos;s action address to trigger effects.
          Cooldown: {ACTION_RATE_LIMIT_SECONDS}s between actions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.entries(ACTION_DEFINITIONS) as [string, typeof ACTION_DEFINITIONS[keyof typeof ACTION_DEFINITIONS]][]).map(([key, action]) => (
            <Card key={key} hover>
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm capitalize">{key.replace('_', ' ')}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      action.type === 'buff' ? 'bg-spark-accent/20 text-spark-accent' :
                      action.type === 'debuff' ? 'bg-spark-danger/20 text-spark-danger' :
                      'bg-spark-secondary/20 text-spark-secondary'
                    }`}>
                      {action.type}
                    </span>
                    <span className="text-sm font-bold text-spark-secondary">{action.cost} F</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{action.description}</p>
                {action.duration > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">Duration: {action.duration} tick{action.duration > 1 ? 's' : ''}</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Key principles */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-spark-secondary uppercase tracking-wider">Privacy &amp; Fairness</h2>
        <Card>
          <CardBody className="space-y-3 text-sm text-gray-300">
            <p><strong className="text-spark-light">No browser wallets.</strong> You send transactions directly from your Firo wallet. No MetaMask, no WalletConnect, no wallet injection.</p>
            <p><strong className="text-spark-light">Spark privacy.</strong> All transactions use Firo Spark addresses for maximum privacy.</p>
            <p><strong className="text-spark-light">Committed randomness.</strong> Race randomness is committed before the race starts and revealed after. Fully verifiable.</p>
            <p><strong className="text-spark-light">Deterministic engine.</strong> Given the same seed and actions, the race outcome is always identical. Anyone can replay and verify.</p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
