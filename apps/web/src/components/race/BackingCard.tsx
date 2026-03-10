'use client';

import type { Racer } from '@sparkderby/shared';
import { MIN_BACKING_AMOUNT } from '@sparkderby/shared';
import { MOCK_ADDRESSES } from '@/lib/mock-data';
import { QRCode } from '@/components/ui/QRCode';
import { CopyAddress } from '@/components/ui/CopyAddress';
import { Card, CardBody } from '@/components/ui/Card';

interface BackingCardProps {
  racer: Racer;
}

export function BackingCard({ racer }: BackingCardProps) {
  const backingAddress = MOCK_ADDRESSES[racer.id]?.['back'] || 'sm1_not_found';

  return (
    <Card glow="amber" className="animate-slide-in">
      <CardBody className="space-y-3 text-center">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Back</div>
          <div className="text-lg font-semibold">{racer.name}</div>
          <div className="text-xs text-gray-500 capitalize">{racer.archetype}</div>
        </div>

        <QRCode value={`firo:${backingAddress}?amount=${MIN_BACKING_AMOUNT}`} size={140} />

        <div>
          <div className="text-xs text-gray-500">Min {MIN_BACKING_AMOUNT} FIRO</div>
        </div>

        <CopyAddress address={backingAddress} truncate={false} className="justify-center" />

        <div className="text-[10px] text-gray-600 pt-2 border-t border-spark-dark-600/50 space-y-0.5">
          <p>Send any amount &ge; {MIN_BACKING_AMOUNT} FIRO to back this racer.</p>
          <p>Your share of the prize pool is proportional to your backing.</p>
        </div>
      </CardBody>
    </Card>
  );
}
