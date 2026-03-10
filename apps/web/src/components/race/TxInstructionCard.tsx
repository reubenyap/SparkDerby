'use client';

import { MOCK_ADDRESSES } from '@/lib/mock-data';
import { QRCode } from '@/components/ui/QRCode';
import { CopyAddress } from '@/components/ui/CopyAddress';
import type { ActionType } from '@sparkderby/shared';

interface TxInstructionCardProps {
  raceId: string;
  racerId: string;
  racerName: string;
  actionType: ActionType | 'back';
  cost: number;
  onSent?: () => void;
}

export function TxInstructionCard({
  raceId,
  racerId,
  racerName,
  actionType,
  cost,
  onSent,
}: TxInstructionCardProps) {
  // Get the address for this racer + intent (mock for now)
  const address = MOCK_ADDRESSES[racerId]?.[actionType] || 'sm1_address_not_found';

  return (
    <div className="animate-slide-in bg-spark-dark-700/50 border border-spark-primary/20 rounded-lg p-4 space-y-3">
      <div className="text-center">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
          Send Transaction
        </div>
        <div className="text-sm">
          <span className="text-spark-primary capitalize font-semibold">{actionType.replace('_', ' ')}</span>
          {' '}<span className="text-gray-500">on</span>{' '}
          <span className="font-semibold">{racerName}</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <QRCode value={`firo:${address}?amount=${cost}`} size={140} className="rounded-lg" />
      </div>

      {/* Amount */}
      <div className="text-center">
        <div className="text-xs text-gray-500">Send exactly</div>
        <div className="text-lg font-bold text-spark-secondary">{cost} FIRO</div>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <div className="text-xs text-gray-500 text-center">To this Spark address:</div>
        <CopyAddress address={address} truncate={false} className="justify-center" />
      </div>

      {/* Instructions */}
      <div className="text-[10px] text-gray-600 space-y-1 pt-2 border-t border-spark-dark-600/50">
        <p>1. Open your Firo wallet</p>
        <p>2. Send <span className="text-spark-secondary">{cost} FIRO</span> to the address above</p>
        <p>3. Transaction will be detected within ~5 seconds via InstantLock</p>
        <p>4. Action applies on the next tick</p>
      </div>

      {/* Simulated "I've sent it" button for mock mode */}
      <button
        onClick={onSent}
        className="w-full py-2 text-xs rounded-lg border border-spark-dark-600 text-gray-400
                   hover:border-spark-accent hover:text-spark-accent transition-colors"
      >
        I&apos;ve sent the transaction
      </button>
    </div>
  );
}
