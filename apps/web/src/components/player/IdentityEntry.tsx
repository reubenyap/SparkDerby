'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

export function IdentityEntry() {
  const [address, setAddress] = useState('');
  const { identify, loading } = usePlayerStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      await identify(address.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm text-gray-400">
        Enter your Spark address or Spark Name
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="sm1... or sparkname"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-spark-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="px-4 py-2 bg-spark-primary text-white rounded text-sm hover:bg-spark-primary/80 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Go'}
        </button>
      </div>
    </form>
  );
}
