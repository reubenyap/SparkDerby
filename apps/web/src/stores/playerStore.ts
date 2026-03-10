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
  resolvedState: 'idle' | 'resolving' | 'resolved' | 'failed';
  identify: (sparkAddress: string, sparkName?: string) => Promise<void>;
  loadFromStorage: () => void;
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: null,
  sessionToken: null,
  loading: false,
  error: null,
  resolvedState: 'idle',

  identify: async (sparkAddress: string, sparkName?: string) => {
    set({ loading: true, error: null, resolvedState: 'resolving' });
    try {
      const data = await api.identify(sparkAddress, sparkName) as {
        player: PlayerInfo;
        sessionToken: string;
      };
      set({
        player: data.player,
        sessionToken: data.sessionToken,
        loading: false,
        resolvedState: 'resolved',
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sparkderby_session', data.sessionToken);
        localStorage.setItem('sparkderby_player', JSON.stringify(data.player));
      }
    } catch {
      // Mock fallback: create a local player identity
      const mockAddr = sparkAddress || 'sm1mock' + Math.random().toString(16).slice(2, 14);
      const mockPlayer: PlayerInfo = {
        id: 'player-' + Math.random().toString(36).slice(2, 10),
        sparkAddress: mockAddr,
        sparkName: sparkName || null,
        totalRaces: 0,
        totalBacked: 0,
        totalWon: 0,
      };
      const mockToken = 'mock-session-' + Date.now();
      set({
        player: mockPlayer,
        sessionToken: mockToken,
        loading: false,
        resolvedState: 'resolved',
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sparkderby_session', mockToken);
        localStorage.setItem('sparkderby_player', JSON.stringify(mockPlayer));
      }
    }
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('sparkderby_session');
    const playerStr = localStorage.getItem('sparkderby_player');
    if (token && playerStr) {
      try {
        set({ sessionToken: token, player: JSON.parse(playerStr), resolvedState: 'resolved' });
      } catch {
        // Invalid stored data
      }
    }
  },

  logout: () => {
    set({ player: null, sessionToken: null, resolvedState: 'idle' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sparkderby_session');
      localStorage.removeItem('sparkderby_player');
    }
  },
}));
