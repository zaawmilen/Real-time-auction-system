import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
}

export default function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return <span className={clsx('text-green-400 font-semibold', className)}>Starting now</span>;
  }

  const isUrgent = timeLeft.total < 60 * 60 * 1000; // under 1 hour
  const isSoon = timeLeft.total < 24 * 60 * 60 * 1000; // under 24 hours

  if (timeLeft.days > 0) {
    return (
      <span className={clsx('text-[#888]', className)}>
        in {timeLeft.days}d {timeLeft.hours}h
      </span>
    );
  }

  return (
    <span className={clsx(
      'font-mono font-semibold tabular-nums',
      isUrgent ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-[#888]',
      className
    )}>
      {String(timeLeft.hours).padStart(2, '0')}:
      {String(timeLeft.minutes).padStart(2, '0')}:
      {String(timeLeft.seconds).padStart(2, '0')}
    </span>
  );
}

function getTimeLeft(targetDate: string) {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / 1000 / 60) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
