'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

export function IdentityEntry() {
  const [input, setInput] = useState('');
  const { identify, loading, error } = usePlayerStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;

    const isSparkName = val.endsWith('.spark') && !val.startsWith('sm1');
    if (isSparkName) {
      await identify('', val);
    } else {
      await identify(val);
    }
  };

  const isValid = input.trim().length > 0 && (
    input.trim().startsWith('sm1') || input.trim().endsWith('.spark')
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-xs text-gray-500 uppercase tracking-wider">
        Identify with Spark
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="sm1... or name.spark"
            className="w-full bg-spark-dark-800 border border-spark-dark-600 rounded-lg px-3 py-2.5 text-sm font-mono
                       focus:border-spark-primary focus:outline-none focus:ring-1 focus:ring-spark-primary/30
                       placeholder:text-gray-600 transition-all"
          />
          {input.trim() && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isValid ? 'text-spark-accent' : 'text-gray-600'}`}>
              {input.trim().endsWith('.spark') ? '.spark' : 'addr'}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !isValid}
          className="px-5 py-2.5 bg-spark-primary text-white rounded-lg text-sm font-semibold
                     hover:bg-spark-primary-light disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all active:scale-95"
        >
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </span>
          ) : 'Enter'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-spark-danger animate-slide-in">{error}</p>
      )}
    </form>
  );
}
