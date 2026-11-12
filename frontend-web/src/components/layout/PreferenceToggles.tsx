'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';

export const PreferenceToggles: React.FC<{ compact?: boolean; className?: string }> = ({ compact, className }) => {
  const { mode, language, toggleTheme, setLanguage, t } = useAppTheme();
  const pill =
    'rounded-full border border-line bg-surface px-3 py-1.5 text-caption font-semibold text-fg hover:border-fg-muted transition-colors';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={toggleTheme}
        className={pill}
        aria-label={t('Changer de thème', 'Toggle theme')}
      >
        {compact
          ? mode === 'DARK'
            ? t('Sombre', 'Dark')
            : t('Clair', 'Light')
          : t(`Apparence : ${mode === 'DARK' ? 'Sombre' : 'Claire'}`, `Theme: ${mode === 'DARK' ? 'Dark' : 'Light'}`)}
      </button>
      <button
        type="button"
        onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
        className={pill}
        aria-label={t('Passer en anglais', 'Switch to French')}
      >
        {language === 'FR' ? 'FR / EN' : 'EN / FR'}
      </button>
    </div>
  );
};

export default PreferenceToggles;
