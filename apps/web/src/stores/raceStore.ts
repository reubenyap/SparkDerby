import { create } from 'zustand';
import type { Race } from '@sparkderby/shared';
import { api } from '@/lib/api';
import { MOCK_RACE } from '@/lib/mock-data';

interface RaceState {
  race: Race | null;
  loading: boolean;
  error: string | null;
  useMock: boolean;
  fetchCurrentRace: () => Promise<void>;
  setRace: (race: Race) => void;
  updateRacerPosition: (racerId: string, position: number) => void;
  loadMock: () => void;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  race: null,
  loading: false,
  error: null,
  useMock: true,

  fetchCurrentRace: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCurrentRace() as { race: Race | null };
      set({ race: data.race, loading: false, useMock: false });
    } catch {
      // Fall back to mock data if API is unavailable
      set({ race: MOCK_RACE, loading: false, useMock: true });
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

  loadMock: () => set({ race: MOCK_RACE, loading: false, useMock: true }),
}));
