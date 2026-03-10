'use client';

import { useState, useEffect, useCallback } from 'react';
import { ACTION_DEFINITIONS, ACTION_RATE_LIMIT_SECONDS } from '@sparkderby/shared';
import type { ActionType } from '@sparkderby/shared';
import { useRaceStore } from '@/stores/raceStore';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { TxInstructionCard } from '@/components/race/TxInstructionCard';

const actionIcons: Record<ActionType, string> = {
  boost: '\u26A1',
  emp: '\uD83D\uDCA5',
  oil_slick: '\uD83D\uDEE2',
  overclock: '\u2699',
  black_swan: '\uD83E\uDD86',
};

export function ActionPanel() {
  const { race } = useRaceStore();
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedRacer, setSelectedRacer] = useState<string | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Cooldown ticker
  useEffect(() => {
    if (cooldownEnd <= Date.now()) {
      setCooldownLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleActionSelect = useCallback((action: ActionType) => {
    if (cooldownLeft > 0) return;
    setSelectedAction(prev => prev === action ? null : action);
    setSelectedRacer(null);
  }, [cooldownLeft]);

  const handleRacerSelect = useCallback((racerId: string) => {
    setSelectedRacer(prev => prev === racerId ? null : racerId);
  }, []);

  const handleActionSent = useCallback(() => {
    setCooldownEnd(Date.now() + ACTION_RATE_LIMIT_SECONDS * 1000);
    setSelectedAction(null);
    setSelectedRacer(null);
  }, []);

  if (!race || race.status !== 'active') {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-xs text-gray-500">Actions available during active races</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Actions</h3>
          {cooldownLeft > 0 && (
            <span className="text-xs text-spark-danger font-mono">
              Cooldown: {cooldownLeft}s
            </span>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {/* Cooldown bar */}
        {cooldownLeft > 0 && (
          <div className="h-1 bg-spark-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-spark-danger/60 rounded-full transition-all duration-1000"
              style={{ width: `${(cooldownLeft / ACTION_RATE_LIMIT_SECONDS) * 100}%` }}
            />
          </div>
        )}

        {/* Action buttons grid */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(ACTION_DEFINITIONS) as [ActionType, typeof ACTION_DEFINITIONS[ActionType]][]).map(([key, action]) => {
            const isSelected = selectedAction === key;
            const isDisabled = cooldownLeft > 0;
            return (
              <button
                key={key}
                onClick={() => handleActionSelect(key)}
                disabled={isDisabled}
                className={`relative text-left px-3 py-2.5 rounded-lg border text-sm transition-all
                  ${isSelected
                    ? 'border-spark-primary bg-spark-primary/10 glow-purple'
                    : 'border-spark-dark-600/50 hover:border-spark-dark-600 bg-spark-dark-800/50'
                  }
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                  ${action.type === 'buff' ? 'hover:border-spark-accent/30' :
                    action.type === 'debuff' ? 'hover:border-spark-danger/30' :
                    'hover:border-spark-secondary/30'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{actionIcons[key]}</span>
                  <div>
                    <div className="font-medium capitalize text-xs">
                      {key.replace('_', ' ')}
                    </div>
                    <div className="text-spark-secondary text-[10px]">{action.cost} FIRO</div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 leading-tight">{action.description}</p>
                <span className={`absolute top-1.5 right-1.5 text-[8px] px-1 rounded
                  ${action.type === 'buff' ? 'bg-spark-accent/20 text-spark-accent' :
                    action.type === 'debuff' ? 'bg-spark-danger/20 text-spark-danger' :
                    'bg-spark-secondary/20 text-spark-secondary'}`}
                >
                  {action.type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Racer target selector */}
        {selectedAction && (
          <div className="animate-slide-in space-y-2">
            <div className="text-xs text-gray-400">
              Select target racer for <span className="text-spark-primary capitalize">{selectedAction.replace('_', ' ')}</span>:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {race.racers.map((racer) => (
                <button
                  key={racer.id}
                  onClick={() => handleRacerSelect(racer.id)}
                  className={`px-2 py-1.5 rounded-lg border text-xs text-center transition-all
                    ${selectedRacer === racer.id
                      ? 'border-spark-primary bg-spark-primary/10'
                      : 'border-spark-dark-600/50 hover:border-spark-dark-600'}`}
                >
                  <div className="font-semibold truncate">{racer.name}</div>
                  <div className="text-[10px] text-gray-500">#{racer.lane}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction instruction card */}
        {selectedAction && selectedRacer && (
          <TxInstructionCard
            raceId={race.id}
            racerId={selectedRacer}
            racerName={race.racers.find(r => r.id === selectedRacer)?.name || ''}
            actionType={selectedAction}
            cost={ACTION_DEFINITIONS[selectedAction].cost}
            onSent={handleActionSent}
          />
        )}
      </CardBody>
    </Card>
  );
}
