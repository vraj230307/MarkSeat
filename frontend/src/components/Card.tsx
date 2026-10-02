import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'highlight' | 'muted';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border-[#dfd8f5]',
    highlight: 'bg-white border-[#5c34d7]',
    muted: 'bg-[#faf8fe] border-[#e7e1f7]',
  };

  return (
    <div
      className={`rounded-[8px] border p-5 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
