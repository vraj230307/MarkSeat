import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type StatusBannerType = 'info' | 'warning' | 'error' | 'success';

interface StatusBannerProps {
  type?: StatusBannerType;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  type = 'info',
  title,
  message,
  action,
  className = '',
}) => {
  const styles = {
    info: {
      container: 'bg-[#ece7fb] border-[#5c34d7] text-[#0b0519]',
      icon: <Info className="w-5 h-5 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />,
    },
    warning: {
      container: 'bg-[#fdf0f7] border-[#d47cb0] text-[#0b0519]',
      icon: <AlertTriangle className="w-5 h-5 text-[#b34887] flex-shrink-0" aria-hidden="true" />,
    },
    error: {
      container: 'bg-[#fae8ee] border-[#e1658b] text-[#0b0519]',
      icon: <AlertCircle className="w-5 h-5 text-[#c23d66] flex-shrink-0" aria-hidden="true" />,
    },
    success: {
      container: 'bg-[#eefaf2] border-[#2e7a50] text-[#0b0519]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#2e7a50] flex-shrink-0" aria-hidden="true" />,
    },
  };

  const current = styles[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-[6px] border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${current.container} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{current.icon}</div>
        <div>
          {title && <h3 className="text-sm font-bold text-[#0b0519] leading-tight mb-0.5">{title}</h3>}
          <p className="text-sm text-[#0b0519]">{message}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0 self-end sm:self-auto">{action}</div>}
    </div>
  );
};
