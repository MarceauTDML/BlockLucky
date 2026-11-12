import React from 'react';
import { cn } from '@/lib/cn';

type CardTone = 'surface' | 'elevated' | 'sun' | 'sunSoft' | 'lavender' | 'mint' | 'peach' | 'ink';

const toneClasses: Record<CardTone, string> = {
  surface: 'bg-surface border border-[var(--card-border)] shadow-[var(--card-shadow)]',
  elevated: 'bg-surface-elevated',
  sun: 'bg-sun text-on-sun',
  sunSoft: 'bg-sun-soft text-on-sun',
  lavender: 'bg-lavender',
  mint: 'bg-mint',
  peach: 'bg-peach',
  ink: 'bg-[#1d2637] text-white',
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
  tone?: CardTone;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = { sm: 'p-4', md: 'p-[18px]', lg: 'p-5 md:p-6' };

export const Card: React.FC<CardProps> = ({
  as: Tag = 'div',
  tone = 'surface',
  padding = 'md',
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cn(
      'rounded-[24px]',
      toneClasses[tone],
      paddingClasses[padding],
      className
    )}
    {...rest}
  >
    {children}
  </Tag>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string; as?: 'h2' | 'h3' }> = ({
  children,
  className,
  as: Tag = 'h2',
}) => <Tag className={cn('text-body font-bold text-fg', className)}>{children}</Tag>;

export default Card;
