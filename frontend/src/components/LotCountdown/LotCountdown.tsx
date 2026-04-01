import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface LotCountdownProps {
  endsAt: string | null;
  totalSeconds: number;
  onExpired?: () => void;
}

export default function LotCountdown({ endsAt, totalSeconds, onExpired }: LotCountdownProps) {
  const [remaining, setRemaining] = useState<number>(totalSeconds);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const secs = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) onExpired?.();
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [endsAt]);

  const pct = Math.max(0, Math.min(100, (remaining / totalSeconds) * 100));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 30;
  const isWarning = remaining <= 60 && remaining > 30;
  const isCritical = remaining <= 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className={clsx('w-4 h-4', isCritical ? 'text-red-400 animate-spin' : isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[#888] text-sm font-medium">
            {remaining <= 0 ? 'Closing...' : isCritical ? '🚨 FINAL SECONDS' : isUrgent ? '⚠ Closing soon!' : isWarning ? 'Hurry up!' : 'Time remaining'}
          </span>
        </div>
        <span className={clsx(
          'font-mono font-bold text-2xl tabular-nums transition-colors',
          isCritical ? 'text-red-400 animate-pulse' : isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'
        )}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar draining left to right */}
      <div className="h-3 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            isCritical ? 'bg-red-500 animate-pulse' : isUrgent ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
