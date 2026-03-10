'use client';

type BadgeVariant = 'live' | 'scheduled' | 'settling' | 'settled' | 'cancelled' | 'active' | 'default';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  live: 'bg-spark-accent/20 text-spark-accent border-spark-accent/30',
  active: 'bg-spark-accent/20 text-spark-accent border-spark-accent/30',
  scheduled: 'bg-spark-cyan/20 text-spark-cyan border-spark-cyan/30',
  settling: 'bg-spark-secondary/20 text-spark-secondary border-spark-secondary/30',
  settled: 'bg-gray-700/50 text-gray-400 border-gray-600/30',
  cancelled: 'bg-spark-danger/20 text-spark-danger border-spark-danger/30',
  default: 'bg-gray-700/50 text-gray-400 border-gray-600/30',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const variant = (variants[status as BadgeVariant] || variants.default);
  const isLive = status === 'active' || status === 'live';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium uppercase tracking-wide ${variant} ${className}`}>
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spark-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-spark-accent" />
        </span>
      )}
      {status}
    </span>
  );
}
