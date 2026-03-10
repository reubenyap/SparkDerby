import { create } from 'zustand';
import { api } from '@/lib/api';

interface PlayerInfo {
  id: string;
  sparkAddress: string;
  sparkName: string | null;
  totalRaces: number;
  totalBacked: number;
  totalWon: number;
}

interface PlayerState {
  player: PlayerInfo | null;
  sessionToken: string | null;
  loading: boolean;
  error: string | null;
  identify: (sparkAddress: string, sparkName?: string) => Promise<void>;
  loadFromStorage: () => void;
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: null,
  sessionToken: null,
  loading: false,
  error: null,

  identify: async (sparkAddress: string, sparkName?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.identify(sparkAddress, sparkName) as {
        player: PlayerInfo;
        sessionToken: string;
      };
      set({
        player: data.player,
        sessionToken: data.sessionToken,
        loading: false,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sparkderby_session', data.sessionToken);
        localStorage.setItem('sparkderby_player', JSON.stringify(data.player));
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to identify',
        loading: false,
      });
    }
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('sparkderby_session');
    const playerStr = localStorage.getItem('sparkderby_player');
    if (token && playerStr) {
      try {
        set({ sessionToken: token, player: JSON.parse(playerStr) });
      } catch {
        // Invalid stored data
      }
    }
  },

  logout: () => {
    set({ player: null, sessionToken: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sparkderby_session');
      localStorage.removeItem('sparkderby_player');
    }
  },
}));
