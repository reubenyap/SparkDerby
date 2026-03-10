'use client';

import type { Racer, Archetype } from '@sparkderby/shared';
import { ARCHETYPES } from '@sparkderby/shared';
import { Card, CardBody } from '@/components/ui/Card';

interface RacerCardProps {
  racer: Racer;
  rank: number;
  selected?: boolean;
  onClick?: () => void;
}

const archetypeColors: Record<Archetype, string> = {
  balanced: 'from-blue-500 to-blue-700',
  sprinter: 'from-yellow-400 to-orange-500',
  closer: 'from-purple-500 to-pink-600',
  tank: 'from-gray-400 to-gray-600',
  wildcard: 'from-red-500 to-rose-600',
  technician: 'from-cyan-400 to-blue-500',
};

const archetypeEmoji: Record<Archetype, string> = {
  balanced: '\u2696', // balance scale
  sprinter: '\u26A1', // lightning
  closer: '\uD83C\uDF19', // moon
  tank: '\uD83D\uDEE1', // shield
  wildcard: '\uD83C\uDFB2', // dice
  technician: '\u2699', // gear
};

export function RacerCard({ racer, rank, selected = false, onClick }: RacerCardProps) {
  const profile = ARCHETYPES[racer.archetype];
  const hasDebuff = racer.statusEffects.some(e => e.type === 'debuff');
  const hasBuff = racer.statusEffects.some(e => e.type === 'buff');

  return (
    <Card
      glow={selected ? 'purple' : 'none'}
      hover
      className={`cursor-pointer transition-all ${selected ? 'border-spark-primary/60' : ''}`}
    >
      <CardBody className="p-3">
        <div className="flex items-start gap-3" onClick={onClick}>
          {/* Rank badge */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
            ${rank <= 3 ? 'bg-gradient-to-br ' + (rank === 1 ? 'from-yellow-400 to-amber-600 text-black' : rank === 2 ? 'from-gray-300 to-gray-500 text-black' : 'from-amber-600 to-amber-800 text-white') : 'bg-spark-dark-700 text-gray-400'}`}
          >
            {rank}
          </div>

          {/* Racer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{racer.name}</span>
              <span className="text-xs">{archetypeEmoji[racer.archetype]}</span>
              {hasBuff && <span className="text-[10px] px-1 rounded bg-spark-accent/20 text-spark-accent">BUFF</span>}
              {hasDebuff && <span className="text-[10px] px-1 rounded bg-spark-danger/20 text-spark-danger">DEBUFF</span>}
            </div>
            <div className="text-xs text-gray-500 capitalize">{racer.archetype}</div>

            {/* Progress bar */}
            <div className="mt-1.5 h-2 bg-spark-dark-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full racer-bar bg-gradient-to-r ${archetypeColors[racer.archetype]}`}
                style={{ width: `${Math.min(100, racer.position)}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex-shrink-0 text-right">
            <div className="text-sm font-semibold">{racer.position.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">{racer.speed.toFixed(1)} spd</div>
            <div className="text-xs text-spark-secondary">{racer.totalBacked.toFixed(1)} F</div>
          </div>
        </div>

        {/* Status effects */}
        {racer.statusEffects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {racer.statusEffects.map((effect, i) => (
              <span
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  effect.type === 'buff' ? 'bg-spark-accent/10 text-spark-accent' : 'bg-spark-danger/10 text-spark-danger'
                }`}
              >
                {effect.source} ({effect.ticksRemaining}t)
              </span>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
