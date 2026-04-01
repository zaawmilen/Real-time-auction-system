import { useState } from 'react';
import clsx from 'clsx';
import type { Lot } from '../../types';
import { formatCurrency } from '../../utils/format';
import { usePlaceBid } from '../../hooks/useBids';
// import {LotTimer} from '../LotCountdown/LotCountdown';

interface BidPanelProps {
  lot: Lot;
  activeLot: Lot;
  lotTimer?: number; // Optional prop to receive remaining time for active lot (for real-time countdown)
  onBidSuccess?: (amount: number) => void;
}

export default function BidPanel({ lot, onBidSuccess }: BidPanelProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);

  const { mutate: placeBid, isPending } = usePlaceBid(lot.id);

  const currentBid = lot.currentBid || 0;
  const increment = lot.bidIncrement || 25;
  const nextMin = currentBid === 0 ? (lot.startingBid || 0) : currentBid + increment;
  const quickBids = [nextMin, nextMin + increment, nextMin + increment * 3];

  const handleBid = (amount: number) => {
    setLastError(null);
    setLastSuccess(null);
    placeBid(amount, {
      onSuccess: () => {
        setLastSuccess(amount);
        setCustomAmount('');
        onBidSuccess?.(amount);
        setTimeout(() => setLastSuccess(null), 3000);
      },
      onError: (err: any) => {
        setLastError(err.response?.data?.error || 'Bid failed');
        setTimeout(() => setLastError(null), 4000);
      },
    });
  };

  const isActive = lot.status === 'active';
  const customVal = parseFloat(customAmount);
  const customValid = !isNaN(customVal) && customVal >= nextMin;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-white text-xl">Place Bid</h3>
        <span className={clsx(
          'text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider flex items-center gap-1.5',
          isActive ? 'text-green-400 bg-green-900/30 border-green-700' : 'text-[#888] bg-[#1A1A1A] border-[#2A2A2A]'
        )}>
          {isActive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
          {lot.status}
        </span>
      </div>

      {/* Current bid */}
      <div className="bg-[#1A1A1A] rounded-xl p-5 mb-5 text-center">
        <p className="text-[#666] text-sm mb-1">Current Bid</p>
        <p className={clsx(
          'font-display font-bold text-4xl transition-colors duration-300',
          lastSuccess ? 'text-green-400' : 'text-[#FF6B00]'
        )}>
          {formatCurrency(currentBid)}
        </p>
        <p className="text-[#888] text-sm mt-1.5">
          {lot.bidCount} bid{lot.bidCount !== 1 ? 's' : ''}
          {lot.currentBidder && (
            <span className="text-[#666]"> · {lot.currentBidder}</span>
          )}
        </p>
        <p className="text-[#555] text-xs mt-1">Min next bid: {formatCurrency(nextMin)}</p>
      
        {lot.startedAt && (
          <div className="mt-2 pt-2 border-t border-[#2A2A2A] flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {/* <LotTimer startedAt={lot.startedAt} /> */}
          </div>
        )}
      </div>

      {/* Feedback */}
      {lastError && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-2.5 mb-4 text-sm">
          {lastError}
        </div>
      )}
      {lastSuccess && (
        <div className="bg-green-900/30 border border-green-700 text-green-400 rounded-lg px-4 py-2.5 mb-4 text-sm">
          ✓ Bid of {formatCurrency(lastSuccess)} placed successfully!
        </div>
      )}

      {/* Quick bid buttons */}
      <div className="space-y-2 mb-4">
        {quickBids.map((amount, i) => (
          <button
            key={amount}
            onClick={() => handleBid(amount)}
            disabled={!isActive || isPending}
            className={clsx(
              'w-full flex items-center justify-between px-5 py-3.5 rounded-lg border font-semibold',
              'transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
              i === 0
                ? 'bg-[#FF6B00] border-[#FF6B00] text-white hover:bg-[#FF8C00] active:scale-[0.98]'
                : 'bg-[#1A1A1A] border-[#2A2A2A] text-white hover:border-[#FF6B00]/50 active:scale-[0.98]'
            )}
          >
            <span className="text-sm opacity-70">
              {i === 0 ? 'Minimum bid' : `+${formatCurrency(amount - currentBid)}`}
            </span>
            <span className="font-mono text-lg">{formatCurrency(amount)}</span>
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder={`Min ${formatCurrency(nextMin)}`}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          min={nextMin}
          step={increment}
          className="input flex-1 font-mono"
          disabled={!isActive || isPending}
        />
        <button
          onClick={() => handleBid(customVal)}
          disabled={!isActive || !customValid || isPending}
          className="btn-secondary px-5 border-[#3A3A3A] hover:border-[#FF6B00] disabled:opacity-40"
        >
          {isPending ? '...' : 'Bid'}
        </button>
      </div>

      {!isActive && (
        <p className="text-center text-[#555] text-sm mt-4">
          {lot.status === 'sold' ? `Sold for ${formatCurrency(lot.soldPrice!)}` :
           lot.status === 'no_sale' ? 'No sale — reserve not met' :
           lot.status === 'pending' ? 'Waiting for lot to go active' :
           'Bidding closed'}
        </p>
      )}
    </div>
  );
}
