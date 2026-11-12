'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Select } from '@/components/ui/Input';
import storage, { KEYS } from '@/lib/storage';
import { useGetPartnersQuery } from '@/store/api/partnersApi';
import { useAppSelector } from '@/store';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PartnerWithRewards } from '@/types/partner.types';

interface PartnerSelectionValue {
  partners: PartnerWithRewards[];
  selected: PartnerWithRewards | null;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const PartnerSelectionContext = createContext<PartnerSelectionValue>({
  partners: [],
  selected: null,
  selectedId: null,
  setSelectedId: () => {},
  isLoading: false,
  isError: false,
  refetch: () => {},
});

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const PartnerSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, isError, refetch } = useGetPartnersQuery();
  const email = useAppSelector((s) => s.auth.user?.email) || '';
  const [explicitId, setExplicitId] = useState<string | null>(() => storage.get(KEYS.partnerId));

  const partners = useMemo(() => data?.data?.partners ?? [], [data]);

  const selectedId = useMemo(() => {
    if (explicitId && partners.some((p) => p.id === explicitId)) return explicitId;
    const local = normalize(email.split('@')[0] || '');
    const guess = local ? partners.find((p) => normalize(p.name).includes(local)) : undefined;
    return guess?.id ?? partners[0]?.id ?? null;
  }, [email, explicitId, partners]);

  const setSelectedId = useCallback((id: string) => {
    storage.set(KEYS.partnerId, id);
    setExplicitId(id);
  }, []);

  const value = useMemo<PartnerSelectionValue>(
    () => ({
      partners,
      selected: partners.find((p) => p.id === selectedId) ?? null,
      selectedId,
      setSelectedId,
      isLoading,
      isError,
      refetch,
    }),
    [partners, selectedId, setSelectedId, isLoading, isError, refetch]
  );

  return <PartnerSelectionContext.Provider value={value}>{children}</PartnerSelectionContext.Provider>;
};

export const usePartnerSelection = () => useContext(PartnerSelectionContext);

export const PartnerSwitcher: React.FC = () => {
  const { t } = useAppTheme();
  const { partners, selectedId, setSelectedId } = usePartnerSelection();
  if (partners.length <= 1) return null;
  return (
    <div className="w-full rounded-[20px] bg-surface px-3.5 pt-3 shadow-[var(--card-shadow)] md:w-72">
      <Select
        label={t('Établissement', 'Business')}
        value={selectedId ?? ''}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.isActive ? '' : t(' (suspendu)', ' (suspended)')}
          </option>
        ))}
      </Select>
    </div>
  );
};
