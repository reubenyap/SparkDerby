'use client';

import { ACTION_DEFINITIONS } from '@sparkderby/shared';

export function ActionPanel() {
  return (
    <div className="border border-gray-700 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Actions</h3>
      <p className="text-xs text-gray-500 mb-3">
        Send FIRO to the action address to trigger effects on racers.
      </p>
      <div className="space-y-2">
        {Object.entries(ACTION_DEFINITIONS).map(([key, action]) => (
          <button
            key={key}
            className="w-full text-left px-3 py-2 rounded border border-gray-700 hover:border-spark-primary transition-colors text-sm"
            onClick={() => {
              // TODO: Show QR code / address for selected action
            }}
          >
            <div className="flex justify-between">
              <span className="capitalize font-medium">
                {key.replace('_', ' ')}
              </span>
              <span className="text-spark-secondary">{action.cost} FIRO</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
