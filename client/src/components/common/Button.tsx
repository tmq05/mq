import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-pill transition-all active:scale-[0.98] select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-5 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-primary text-on-primary hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-subtle',
    secondary:
      'border border-hairline-strong dark:border-hairline-dark bg-canvas dark:bg-canvas-dark text-ink dark:text-on-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft',
    ghost:
      'bg-transparent text-ink dark:text-on-dark hover:bg-surface-soft dark:hover:bg-surface-dark-soft',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

