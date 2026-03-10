'use client';

import { useState, useCallback } from 'react';

interface CopyAddressProps {
  address: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function CopyAddress({ address, label, truncate = true, className = '' }: CopyAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = address;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const displayAddress = truncate && address.length > 16
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : address;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <button
        onClick={handleCopy}
        className="group flex items-center gap-1.5 px-2 py-1 rounded bg-spark-dark-800 border border-spark-dark-600 hover:border-spark-primary/50 transition-colors text-xs font-mono"
        title={`Copy: ${address}`}
      >
        <span className="text-gray-300 group-hover:text-spark-light transition-colors">
          {displayAddress}
        </span>
        <span className="text-gray-500 group-hover:text-spark-primary transition-colors">
          {copied ? (
            <svg className="w-3.5 h-3.5 text-spark-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </span>
      </button>
      {copied && <span className="text-xs text-spark-accent animate-fade-in">Copied!</span>}
    </div>
  );
}
