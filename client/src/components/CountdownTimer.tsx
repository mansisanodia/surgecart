import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onExpiry?: () => void;
  label?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onExpiry, label = 'Starts in' }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference <= 0) {
        if (onExpiry && !timeLeft.isExpired) {
          onExpiry();
        }
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return { hours, minutes, seconds, isExpired: false };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const current = calculateTimeLeft();
      setTimeLeft(current);
      if (current.isExpired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
        ● LIVE NOW
      </span>
    );
  }

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex h-8 w-9 items-center justify-center rounded bg-slate-900 border border-slate-800 text-sm font-bold text-brand-400 shadow-md">
          {formatNumber(timeLeft.hours)}
        </div>
        <span className="text-xs font-bold text-slate-500">:</span>
        <div className="flex h-8 w-9 items-center justify-center rounded bg-slate-900 border border-slate-800 text-sm font-bold text-brand-400 shadow-md">
          {formatNumber(timeLeft.minutes)}
        </div>
        <span className="text-xs font-bold text-slate-500">:</span>
        <div className="flex h-8 w-9 items-center justify-center rounded bg-slate-900 border border-slate-800 text-sm font-bold text-brand-400 shadow-md">
          {formatNumber(timeLeft.seconds)}
        </div>
      </div>
    </div>
  );
};
export default CountdownTimer;
