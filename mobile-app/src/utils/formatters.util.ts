export const shortenWallet = (wallet?: string | null, chars = 4): string => {
  if (!wallet) return '0x0000...0000';
  if (wallet.length <= chars * 2 + 2) return wallet;
  return `${wallet.slice(0, chars + 2)}...${wallet.slice(-chars)}`;
};

export const formatEth = (amount: number): string => {
  return `${Number(amount).toFixed(2)} ETH`;
};

export const formatPoints = (points: number): string => {
  return `${Number(points || 0)} pts`;
};


export const formatEthBalance = (amount: number, decimals = 4): string => {
  return Number(amount || 0).toFixed(decimals);
};
