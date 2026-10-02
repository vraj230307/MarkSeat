import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-16 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-10 h-10 border-3 border-[#cbbfef] border-t-[#5c34d7] rounded-[6px] animate-spin mb-4" />
      <p className="text-sm font-semibold text-[#0b0519]">{message}</p>
      <span className="sr-only">Please wait while information is retrieved</span>
    </div>
  );
};
