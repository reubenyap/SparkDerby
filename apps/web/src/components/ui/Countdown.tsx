'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  targetTime: string | number; // ISO string or unix ms
  label?: string;
  onComplete?: () => void;
  className?: string;
  compact?: boolean;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calcTimeLeft(target: number): TimeLeft {
  const total = Math.max(0, target - Date.now());
  return {
    hours: Math.floor(total / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
    total,
  };
}

export function Countdown({ targetTime, label, onComplete, className = '', compact = false }: CountdownProps) {
  const target = typeof targetTime === 'string' ? new Date(targetTime).getTime() : targetTime;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = calcTimeLeft(target);
      setTimeLeft(tl);
      if (tl.total <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [target, onComplete]);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (timeLeft.total <= 0) {
    return (
      <span className={`text-spark-accent ${className}`}>
        {label ? `${label}: ` : ''}Complete
      </span>
    );
  }

  if (compact) {
    return (
      <span className={`font-mono ${className}`}>
        {label ? `${label} ` : ''}{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {label && <span className="text-xs text-gray-500 mr-1">{label}</span>}
      <TimeUnit value={timeLeft.hours} unit="h" />
      <span className="text-gray-600">:</span>
      <TimeUnit value={timeLeft.minutes} unit="m" />
      <span className="text-gray-600">:</span>
      <TimeUnit value={timeLeft.seconds} unit="s" />
    </div>
  );
}

function TimeUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="font-mono text-sm font-semibold tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] text-gray-500">{unit}</span>
    </div>
  );
}
