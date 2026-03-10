export interface Player {
  id: string;
  sparkAddress: string;
  sparkName: string | null;
  totalRaces: number;
  totalBacked: number;
  totalWon: number;
  firstSeenAt: string;
  lastActiveAt: string;
}

export interface BrowserSession {
  id: string;
  playerId: string;
  sessionToken: string;
  expiresAt: string;
}
