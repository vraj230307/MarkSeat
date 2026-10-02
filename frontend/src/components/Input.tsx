import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  id: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-[#0b0519]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm bg-white text-[#0b0519] rounded-[6px] border ${
          error ? 'border-[#e1658b] focus:border-[#e1658b]' : 'border-[#cbbfef] focus:border-[#5c34d7]'
        } focus:outline-none focus:ring-1 ${
          error ? 'focus:ring-[#e1658b]' : 'focus:ring-[#5c34d7]'
        } placeholder-[#766f88] disabled:bg-[#f0edf9] disabled:text-[#88819a] disabled:cursor-not-allowed transition-colors duration-150 ${className}`}
        {...props}
      />
      {error ? (
        <span id={errorId} role="alert" className="text-xs font-medium text-[#c02a54]">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="text-xs text-[#524b64]">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
