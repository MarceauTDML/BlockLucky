import {
  shortenWallet,
  formatPoints,
  formatEth,
  formatPercentage,
} from '../../src/utils/formatters.util';

describe('formatters.util', () => {
  it('raccourcit correctement une adresse Ethereum valide', () => {
    const wallet = '0x1234567890abcdef1234567890abcdef12345678';
    expect(shortenWallet(wallet, 4)).toBe('0x1234...5678');
  });

  it('retourne une adresse par defaut si la valeur est absente', () => {
    expect(shortenWallet(null)).toBe('0x0000...0000');
  });

  it('formate correctement un solde d EtherPoints', () => {
    expect(formatPoints(1250)).toContain('1');
  });

  it('formate correctement un montant ETH et un pourcentage', () => {
    expect(formatEth(1.5)).toBe('1.50 ETH');
    expect(formatPercentage(45.2)).toBe('45%');
  });
});
