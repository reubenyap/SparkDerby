import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-spark-dark/95 backdrop-blur">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Spark<span className="text-spark-secondary">Rush</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-spark-secondary transition-colors">
            Live Race
          </Link>
          <Link href="/history" className="hover:text-spark-secondary transition-colors">
            History
          </Link>
          <Link href="/how-to-play" className="hover:text-spark-secondary transition-colors">
            How to Play
          </Link>
        </nav>
      </div>
    </header>
  );
}
