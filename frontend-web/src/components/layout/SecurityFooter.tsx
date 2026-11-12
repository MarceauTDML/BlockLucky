'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import Icon from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

export const SecurityFooter: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useAppTheme();
  return (
    <p className={cn('flex items-center justify-center gap-1.5 text-[11px] font-medium text-fg-muted', className)}>
      <Icon name="shield" size={12} />
      {t('Application sécurisée · Aucun argent réel', 'Secure app · No real money')}
    </p>
  );
};

export default SecurityFooter;
