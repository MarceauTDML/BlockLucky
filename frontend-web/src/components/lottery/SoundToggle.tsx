'use client';

import React from 'react';
import Icon from '@/components/ui/Icon';
import { useSoundPreference } from '@/hooks/useSound';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';

export const SoundToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useAppTheme();
  const { soundEnabled, setSoundEnabled } = useSoundPreference();
  const label = soundEnabled ? t('Couper les sons', 'Mute sounds') : t('Activer les sons', 'Unmute sounds');
  return (
    <button
      type="button"
      onClick={() => setSoundEnabled(!soundEnabled)}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors hover:border-fg-muted',
        className
      )}
    >
      <Icon name={soundEnabled ? 'volume' : 'volumeOff'} size={18} />
    </button>
  );
};

export default SoundToggle;
