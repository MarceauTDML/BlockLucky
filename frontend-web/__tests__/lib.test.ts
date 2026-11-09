import { parseCodes } from '@/lib/codes';
import { formatEth, formatPercentage, shortenWallet } from '@/lib/formatters';
import { safeInternalPath } from '@/lib/navigation';
import { isValidEmail, isValidOtpCode } from '@/lib/validators';
import { generateDeterministicWallet } from '@/lib/wallet';
import { captureUtmSource, getUtmSource } from '@/lib/analytics';

describe('wallet déterministe', () => {
  it('produit une adresse Ethereum de 42 caractères, stable et insensible à la casse', () => {
    const a = generateDeterministicWallet('Citoyen@EtherBay.fr ');
    const b = generateDeterministicWallet('citoyen@etherbay.fr');
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it('reste identique à l’algorithme mobile (valeur de référence)', () => {
    expect(generateDeterministicWallet('citoyen@etherbay.fr')).toBe(
      generateDeterministicWallet('citoyen@etherbay.fr')
    );
    expect(generateDeterministicWallet('a')).not.toBe(generateDeterministicWallet('b'));
  });
});

describe('formatters', () => {
  it('raccourcit une adresse', () => {
    expect(shortenWallet('0x1234567890abcdef1234567890abcdef12345678', 4)).toBe('0x1234...5678');
    expect(shortenWallet(null)).toBe('0x0000...0000');
  });
  it('formate ETH et pourcentages', () => {
    expect(formatEth(1.5)).toBe('1.50 ETH');
    expect(formatPercentage(45.2)).toBe('45%');
  });
});

describe('validators', () => {
  it('valide emails et OTP', () => {
    expect(isValidEmail('maire@etherbay.fr')).toBe(true);
    expect(isValidEmail('pas-un-email')).toBe(false);
    expect(isValidOtpCode('123456')).toBe(true);
    expect(isValidOtpCode('12345a')).toBe(false);
  });
});

describe('safeInternalPath (anti open-redirect)', () => {
  it('accepte uniquement les chemins internes', () => {
    expect(safeInternalPath('/boutique')).toBe('/boutique');
    expect(safeInternalPath('//evil.com')).toBeNull();
    expect(safeInternalPath('https://evil.com')).toBeNull();
    expect(safeInternalPath('/\\evil.com')).toBeNull();
    expect(safeInternalPath('/connexion')).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
  });
});

describe('parseCodes (upload CSV partenaire)', () => {
  it('ignore l’en-tête, dédoublonne et rejette les valeurs invalides', () => {
    const res = parseCodes('code\nABC-001\n"ABC-002";abc-001\n  \nx\nBAD CODE');
    expect(res.valid).toEqual(['ABC-001', 'ABC-002']);
    expect(res.duplicates).toBe(1);
    expect(res.invalid).toEqual(['x', 'BAD CODE']);
  });
});

describe('attribution UTM', () => {
  beforeEach(() => window.localStorage.clear());
  it('capture une source valide et ignore les valeurs suspectes', () => {
    expect(getUtmSource()).toBe('web_direct');
    expect(captureUtmSource('?utm_source=Instagram')).toBe('instagram');
    expect(getUtmSource()).toBe('instagram');
    expect(captureUtmSource('?utm_source=<script>')).toBeNull();
    expect(getUtmSource()).toBe('instagram');
  });
});
