export const shortenWallet = (wallet?: string | null, chars = 4): string => {
  if (!wallet) return '0x0000...0000';
  if (wallet.length <= chars * 2 + 2) return wallet;
  return `${wallet.slice(0, chars + 2)}...${wallet.slice(-chars)}`;
};

export const formatEth = (amount: number): string => {
  return `${Number(amount || 0).toFixed(2)} ETH`;
};

export const formatPoints = (points: number): string => {
  return `${Number(points || 0)} pts`;
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(Number(value || 0))}%`;
};

export const formatNumber = (value: number, locale: 'FR' | 'EN' = 'FR'): string => {
  return new Intl.NumberFormat(locale === 'FR' ? 'fr-FR' : 'en-GB').format(Number(value || 0));
};

export const shortenHash = (hash?: string | null, chars = 6): string => {
  if (!hash) return '—';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
};
