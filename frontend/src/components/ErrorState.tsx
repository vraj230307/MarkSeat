import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`w-full py-16 px-4 bg-[#fae8ee] border border-[#e1658b] rounded-[8px] flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-[6px] bg-white border border-[#e1658b] flex items-center justify-center text-[#c23d66] mb-4">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-[#0b0519] mb-1">{title}</h3>
      <p className="text-xs text-[#0b0519] max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="md"
          onClick={onRetry}
          leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
