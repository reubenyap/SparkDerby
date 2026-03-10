import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Spark Rush - Live Race Game on Firo',
  description: 'A browser-based live race game built on Firo Spark transactions. Back racers, boost, sabotage, and win FIRO.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-spark-dark text-spark-light bg-grid">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-16">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-spark-dark-600/30 mt-auto">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between text-xs text-gray-600">
            <span>Spark Rush &mdash; Built on Firo Spark</span>
            <div className="flex items-center gap-4">
              <a href="/how-to-play" className="hover:text-gray-400 transition-colors">How to Play</a>
              <span className="text-gray-700">|</span>
              <span>No wallets. No smart contracts. Pure privacy.</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
