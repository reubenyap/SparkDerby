'use client';

import { useEffect, useCallback } from 'react';
import { getSocket, disconnectSocket } from '@/lib/ws';
import { useRaceStore } from '@/stores/raceStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { Race, RacerTickState } from '@sparkderby/shared';

export function useRaceWebSocket() {
  const { race, setRace } = useRaceStore();
  const { sessionToken } = usePlayerStore();

  const connect = useCallback(() => {
    const socket = getSocket(sessionToken || undefined);

    socket.on('connect', () => {
      console.log('WebSocket connected');
      if (race?.id) {
        socket.emit('subscribe_race', { raceId: race.id });
      }
    });

    socket.on('tick_update', (data: {
      raceId: string;
      tick: number;
      racerStates: RacerTickState[];
    }) => {
      const current = useRaceStore.getState().race;
      if (current && current.id === data.raceId) {
        setRace({
          ...current,
          currentTick: data.tick,
          racers: current.racers.map((r) => {
            const update = data.racerStates.find((s) => s.racerId === r.id);
            if (update) {
              return {
                ...r,
                position: update.position,
                speed: update.speed,
                stamina: update.stamina,
                statusEffects: update.statusEffects,
              };
            }
            return r;
          }),
        });
      }
    });

    socket.on('backing_received', (data: {
      raceId: string;
      racerId: string;
      newRacerTotal: number;
      newPrizePool: number;
    }) => {
      const current = useRaceStore.getState().race;
      if (current && current.id === data.raceId) {
        setRace({
          ...current,
          totalPrizePool: data.newPrizePool,
          racers: current.racers.map((r) =>
            r.id === data.racerId
              ? { ...r, totalBacked: data.newRacerTotal }
              : r,
          ),
        });
      }
    });

    socket.on('race_finished', (data: { raceId: string }) => {
      const current = useRaceStore.getState().race;
      if (current && current.id === data.raceId) {
        setRace({ ...current, status: 'settling' });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return socket;
  }, [race?.id, sessionToken, setRace]);

  useEffect(() => {
    const socket = connect();
    return () => {
      disconnectSocket();
    };
  }, [connect]);
}
