import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes with 6px corner radius, strict flat colors, visible focus outline
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-[6px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c34d7] select-none';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  // High contrast rules:
  // White text ONLY on primary (#5c34d7).
  // Dark text (#0b0519) on secondary (#e98dc5) and accent (#e1658b).
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-[#5c34d7] text-white hover:bg-[#4a28b5] active:bg-[#3b1e96] border border-[#5c34d7]',
    secondary: 'bg-[#e98dc5] text-[#0b0519] hover:bg-[#df7fb9] active:bg-[#d06faa] border border-[#d47cb0]',
    accent: 'bg-[#e1658b] text-[#0b0519] hover:bg-[#d3557b] active:bg-[#c2466c] border border-[#ce557a]',
    outline: 'bg-white text-[#0b0519] hover:bg-[#f4f1fc] border border-[#cbbfef] active:border-[#5c34d7]',
    ghost: 'bg-transparent text-[#0b0519] hover:bg-[#ebe6f7] border border-transparent',
  };

  const disabledClasses = (disabled || isLoading) ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
