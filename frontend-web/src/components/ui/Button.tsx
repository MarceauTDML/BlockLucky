'use client';

import Link from 'next/link';
import React from 'react';
import { cn } from '@/lib/cn';
import Spinner from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'soft';
export type ButtonSize = 'md' | 'sm';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-sun text-on-sun shadow-[0_6px_16px_rgba(172,141,10,0.18)] hover:bg-sun-light',
  secondary: 'bg-primary text-on-primary hover:bg-primary-light',
  danger: 'border border-line bg-surface text-error hover:bg-peach',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-elevated',
  ghost: 'bg-transparent text-fg-secondary hover:bg-surface-elevated hover:text-fg',
  soft: 'bg-lavender text-violet hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-[52px] px-5 py-3 text-body rounded-[16px]',
  sm: 'min-h-10 px-3.5 py-2 text-caption rounded-[12px]',
};

export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  disabled = false,
  fullWidth = false
): string =>
  cn(
    'inline-flex items-center justify-center gap-2 text-center font-semibold transition-colors duration-150 select-none',
    sizeClasses[size],
    disabled ? 'bg-surface-elevated text-fg-muted border-0 cursor-not-allowed' : variantClasses[variant],
    fullWidth && 'w-full'
  );

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

export type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}) => {
  const isDisabled = Boolean(disabled || loading);
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(buttonClasses(variant, size, Boolean(disabled), fullWidth), className)}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : children}
    </button>
  );
};

export interface LinkButtonProps extends CommonProps {
  href: string;
  external?: boolean;
}

export const LinkButton: React.FC<LinkButtonProps> = ({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  external,
  className,
  children,
}) => {
  const classes = cn(buttonClasses(variant, size, false, fullWidth), className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
};

export default Button;
