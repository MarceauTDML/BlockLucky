import React from 'react';
import { cn } from '@/lib/cn';

export const Spinner: React.FC<{ className?: string; label?: string }> = ({ className, label }) => (
  <span
    role="status"
    aria-label={label || 'Chargement'}
    className={cn(
      'inline-block h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-bl-spin',
      className
    )}
  />
);

export default Spinner;
