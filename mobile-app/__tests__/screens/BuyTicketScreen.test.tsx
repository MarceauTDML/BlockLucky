import { isValidEmail, isValidOtpCode } from '../../src/utils/validators.util';

describe('BuyTicketScreen & Auth validators', () => {
  it('valide correctement les adresses email pour l envoi de tickets cadeaux', () => {
    expect(isValidEmail('citoyen@etherbay.fr')).toBe(true);
    expect(isValidEmail('adresse-invalide')).toBe(false);
  });

  it('valide les codes OTP a 6 chiffres', () => {
    expect(isValidOtpCode('123456')).toBe(true);
    expect(isValidOtpCode('12345')).toBe(false);
    expect(isValidOtpCode('abcdef')).toBe(false);
  });
});
