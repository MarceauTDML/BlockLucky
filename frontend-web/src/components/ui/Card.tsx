import React from 'react';
import { cn } from '@/lib/cn';

type CardTone = 'surface' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
  tone?: CardTone;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = { sm: 'p-3.5', md: 'p-4', lg: 'p-[18px] md:p-5' };

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
      'rounded-lg border border-line',
      tone === 'surface' ? 'bg-surface' : 'bg-surface-elevated',
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
