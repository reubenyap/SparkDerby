'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/lobby', label: 'Lobby' },
  { href: '/live', label: 'Live Race' },
  { href: '/results', label: 'Results' },
  { href: '/how-to-play', label: 'How to Play' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-spark-dark-600/50 bg-spark-dark/90 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-spark-primary to-spark-secondary flex items-center justify-center text-sm font-bold text-white group-hover:scale-105 transition-transform">
            SR
          </div>
          <span className="font-display text-lg font-bold tracking-wide">
            SPARK<span className="text-spark-secondary">RUSH</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'text-spark-light bg-spark-primary/15 font-medium'
                    : 'text-gray-400 hover:text-spark-light hover:bg-spark-dark-700/50'
                }`}
              >
                {item.label}
                {item.href === '/live' && (
                  <span className="ml-1.5 relative inline-flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spark-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-spark-accent" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden p-2 rounded-lg hover:bg-spark-dark-700/50 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
