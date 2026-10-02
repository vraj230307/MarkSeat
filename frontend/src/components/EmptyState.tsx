import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`w-full py-16 px-4 bg-white border border-[#dfd8f5] rounded-[8px] flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-[6px] bg-[#f4f1fc] border border-[#cbbfef] flex items-center justify-center text-[#5c34d7] mb-4">
        {icon || <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-bold text-[#0b0519] mb-1">{title}</h3>
      <p className="text-xs text-[#524b64] max-w-md mb-6">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
