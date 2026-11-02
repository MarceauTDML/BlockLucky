import totpService from '../../src/services/totp.service';

describe('TotpService (2FA Google Authenticator & Backup Codes)', () => {
  it('should generate a valid TOTP secret, OTP token, QRCode DataURL, and verify it', async () => {
    const secret = totpService.generateSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(8);

    const otpAuthUrl = totpService.generateOtpAuthUrl('citoyen@etherbay.fr', secret);
    expect(otpAuthUrl).toContain('otpauth://totp/');

    const qrCodeDataUrl = await totpService.generateQrCodeDataUrl(otpAuthUrl);
    expect(qrCodeDataUrl).toContain('data:image/png;base64,');

    const token = totpService.generateToken(secret);
    expect(token).toHaveLength(6);

    const isValid = totpService.verifyToken(token, secret);
    expect(isValid).toBe(true);

    const isInvalid = totpService.verifyToken('000000', secret);
    expect(typeof isInvalid).toBe('boolean');
  });

  it('should generate formatted backup codes', () => {
    const backupCodes = totpService.generateBackupCodes(5);
    expect(backupCodes).toHaveLength(5);
    expect(backupCodes[0]).toMatch(/^\d{4}-\d{4}$/);
  });
});
