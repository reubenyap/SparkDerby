interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'purple' | 'amber' | 'green' | 'none';
  hover?: boolean;
}

export function Card({ children, className = '', glow = 'none', hover = false }: CardProps) {
  const glowClass = glow !== 'none' ? `glow-${glow}` : '';
  const hoverClass = hover ? 'card-hover' : '';

  return (
    <div className={`bg-spark-dark-800/80 border border-spark-dark-600/50 rounded-xl backdrop-blur-sm ${glowClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-3 border-b border-spark-dark-600/50 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  );
}
