'use client';

import { useState, useEffect } from 'react';
import { generateMockFeedEvents, type MockFeedEvent } from '@/lib/mock-data';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

const typeStyles: Record<MockFeedEvent['type'], { dot: string; text: string }> = {
  backing: { dot: 'bg-spark-secondary', text: 'text-spark-secondary' },
  action: { dot: 'bg-spark-primary', text: 'text-spark-primary' },
  tick: { dot: 'bg-spark-accent', text: 'text-spark-accent' },
  instantlock: { dot: 'bg-spark-cyan', text: 'text-spark-cyan' },
  payout: { dot: 'bg-yellow-400', text: 'text-yellow-400' },
  system: { dot: 'bg-gray-500', text: 'text-gray-400' },
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function LiveFeed() {
  const [events, setEvents] = useState<MockFeedEvent[]>([]);

  useEffect(() => {
    setEvents(generateMockFeedEvents());
    // In production, events would come from WebSocket
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spark-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-spark-accent" />
          </span>
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Live Feed</h3>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-gray-600">
              Waiting for events...
            </div>
          ) : (
            <div className="divide-y divide-spark-dark-600/30">
              {events.map((event) => {
                const styles = typeStyles[event.type];
                return (
                  <div key={event.id} className="px-4 py-2.5 hover:bg-spark-dark-700/30 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 leading-relaxed">{event.message}</p>
                        <span className="text-[10px] text-gray-600">{timeAgo(event.timestamp)}</span>
                      </div>
                      <span className={`flex-shrink-0 text-[9px] uppercase tracking-wider ${styles.text}`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
