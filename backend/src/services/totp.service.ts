import crypto from 'crypto';
import QRCode from 'qrcode';
import { generateOtpCode } from '../utils/crypto.util';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class TotpService {
  public generateSecret(length = 20): string {
    const bytes = crypto.randomBytes(length);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += BASE32_ALPHABET[bytes[i]! % 32];
    }
    return secret;
  }

  private base32ToBuffer(base32: string): Buffer {
    const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of cleaned) {
      const val = BASE32_ALPHABET.indexOf(char);
      if (val >= 0) {
        bits += val.toString(2).padStart(5, '0');
      }
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  }

  private computeHotp(secret: string, counter: number): string {
    const key = this.base32ToBuffer(secret);
    const buf = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
      buf[i] = tmp & 0xff;
      tmp = Math.floor(tmp / 256);
    }

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const code =
      (((hmac[offset]! & 0x7f) << 24) |
        ((hmac[offset + 1]! & 0xff) << 16) |
        ((hmac[offset + 2]! & 0xff) << 8) |
        (hmac[offset + 3]! & 0xff)) %
      1000000;

    return code.toString().padStart(6, '0');
  }

  public generateOtpAuthUrl(
    accountName: string,
    secret: string,
    issuer = 'BlockLucky EtherBay'
  ): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  public async generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl);
  }

  public generateToken(secret: string, timestamp = Date.now()): string {
    const counter = Math.floor(timestamp / 1000 / 30);
    return this.computeHotp(secret, counter);
  }

  public verifyToken(token: string, secret: string, window = 1): boolean {
    if (!token || !secret) return false;
    const currentCounter = Math.floor(Date.now() / 1000 / 30);
    for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
      const expected = this.computeHotp(secret, currentCounter + errorWindow);
      if (expected === token.trim()) {
        return true;
      }
    }
    return false;
  }

  public generateBackupCodes(count = 5): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(`${generateOtpCode(4)}-${generateOtpCode(4)}`);
    }
    return codes;
  }
}

export const totpService = new TotpService();
export default totpService;
