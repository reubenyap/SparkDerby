'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { CopyAddress } from '@/components/ui/CopyAddress';

export function IdentityBadge() {
  const { player, logout } = usePlayerStore();

  if (!player) return null;

  return (
    <div className="flex items-center gap-3 bg-spark-dark-800 border border-spark-dark-600/50 rounded-lg px-3 py-2">
      {/* Avatar placeholder */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-spark-primary to-spark-secondary flex items-center justify-center text-xs font-bold">
        {(player.sparkName || player.sparkAddress).charAt(0).toUpperCase()}
      </div>

      <div className="flex flex-col min-w-0">
        {player.sparkName && (
          <span className="text-sm font-semibold text-spark-secondary truncate">
            {player.sparkName}
          </span>
        )}
        <CopyAddress
          address={player.sparkAddress}
          truncate
          className="text-xs"
        />
      </div>

      <div className="flex items-center gap-2 ml-2 text-xs text-gray-500">
        <span title="Total won">{player.totalWon.toFixed(1)} FIRO</span>
      </div>

      <button
        onClick={logout}
        className="ml-2 text-gray-600 hover:text-spark-danger transition-colors text-xs"
        title="Disconnect"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
