import React from 'react';
import { cn } from '@/lib/cn';
import { iconData, IconName } from './iconData';

export const Icon: React.FC<{ name: IconName; size?: number; className?: string }> = ({
  name,
  size = 20,
  className,
}) => {
  const definition = iconData[name];
  const height = (size * definition.height) / definition.width;
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 [&>svg]:h-full [&>svg]:w-full', className)}
      style={{ width: size, height }}
      dangerouslySetInnerHTML={{ __html: definition.xml }}
    />
  );
};

export type { IconName };
export default Icon;
