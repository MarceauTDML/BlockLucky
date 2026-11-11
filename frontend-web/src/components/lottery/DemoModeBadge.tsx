'use client';

import React from 'react';
import { Badge } from '@/components/ui/Misc';
import { useAppTheme } from '@/theme/ThemeProvider';

export const DemoModeBadge: React.FC<{ simulated?: boolean; className?: string }> = ({ simulated, className }) => {
  const { t } = useAppTheme();
  if (!simulated) return null;
  return (
    <Badge tone="warning" className={className}>
      {t('Mode démonstration', 'Demo mode')}
    </Badge>
  );
};

export default DemoModeBadge;
