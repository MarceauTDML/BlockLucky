'use client';

import Link from 'next/link';
import React from 'react';
import { cn } from '@/lib/cn';
import Spinner from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-light',
  secondary: 'bg-secondary text-on-primary hover:opacity-90',
  danger: 'bg-error text-on-primary hover:opacity-90',
  outline: 'border border-line bg-transparent text-fg hover:bg-surface-elevated',
  ghost: 'bg-transparent text-fg-secondary hover:bg-surface-elevated hover:text-fg',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-12 px-[18px] py-[13px] text-body rounded-md',
  sm: 'min-h-9 px-3.5 py-2 text-caption rounded-md',
};

export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  disabled = false,
  fullWidth = false
): string =>
  cn(
    'inline-flex items-center justify-center gap-2 text-center font-medium transition-colors duration-150 select-none',
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
