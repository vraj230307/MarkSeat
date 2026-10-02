import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownProps {
  targetTimestamp: number | string; // Unix timestamp in ms or ISO string
  onExpire?: () => void;
  label?: string;
  expiredMessage?: string;
  showIcon?: boolean;
  className?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  targetTimestamp,
  onExpire,
  label = 'Temporary Hold Timer',
  expiredMessage = 'Seat released',
  showIcon = true,
  className = '',
}) => {
  const targetMs = typeof targetTimestamp === 'string' ? new Date(targetTimestamp).getTime() : targetTimestamp;

  const calculateRemaining = useCallback(
    () => Math.max(0, Math.floor((targetMs - Date.now()) / 1000)),
    [targetMs]
  );

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemaining);
  const [hasExpired, setHasExpired] = useState<boolean>(() => calculateRemaining() <= 0);

  useEffect(() => {
    const initial = calculateRemaining();
    if (initial <= 0) {
      setHasExpired(true);
      if (onExpire) onExpire();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setHasExpired(true);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs, calculateRemaining, onExpire]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = remainingSeconds > 0 && remainingSeconds <= 60;

  if (hasExpired) {
    return (
      <div
        role="alert"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#fae8ee] border border-[#e1658b] text-[#0b0519] font-bold text-sm ${className}`}
      >
        <AlertTriangle className="w-4 h-4 text-[#c23d66]" aria-hidden="true" />
        <span>{expiredMessage}</span>
      </div>
    );
  }

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${minutes} minutes and ${seconds} seconds remaining`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border text-sm font-semibold transition-colors duration-150 ${
        isUrgent
          ? 'bg-[#fae8ee] border-[#e1658b] text-[#0b0519] animate-pulse'
          : 'bg-[#ece7fb] border-[#cbbfef] text-[#0b0519]'
      } ${className}`}
    >
      {showIcon && (
        isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-[#c23d66]" aria-hidden="true" />
        ) : (
          <Clock className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
        )
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        {label && <span className="text-xs font-medium text-[#524b64]">{label}:</span>}
        <span className="font-mono text-base font-bold text-[#0b0519] tracking-wider">
          {formattedTime}
        </span>
      </div>
      {isUrgent && (
        <span className="text-xs font-bold text-[#c02a54] hidden sm:inline">
          (Final minute)
        </span>
      )}
    </div>
  );
};
