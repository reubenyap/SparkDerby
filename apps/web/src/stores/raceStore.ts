import { create } from 'zustand';
import type { Race } from '@sparkderby/shared';
import { api } from '@/lib/api';

interface RaceState {
  race: Race | null;
  loading: boolean;
  error: string | null;
  fetchCurrentRace: () => Promise<void>;
  setRace: (race: Race) => void;
  updateRacerPosition: (racerId: string, position: number) => void;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  race: null,
  loading: false,
  error: null,

  fetchCurrentRace: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCurrentRace() as { race: Race | null };
      set({ race: data.race, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch race',
        loading: false,
      });
    }
  },

  setRace: (race: Race) => set({ race }),

  updateRacerPosition: (racerId: string, position: number) => {
    const { race } = get();
    if (!race) return;
    set({
      race: {
        ...race,
        racers: race.racers.map((r) =>
          r.id === racerId ? { ...r, position } : r,
        ),
      },
    });
  },
}));
