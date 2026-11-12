import { AppError } from './response.util';

export type IdentityImageMime = 'image/jpeg' | 'image/png';

export interface DecodedIdentityImage {
  mimeType: IdentityImageMime;
  data: Buffer;
}

export const MAX_IDENTITY_IMAGE_BYTES = 4 * 1024 * 1024;
const MIN_IDENTITY_IMAGE_BYTES = 1024;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|jpg|png));base64,/i;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const detectImageMime = (data: Buffer): IdentityImageMime | null => {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.length >= PNG_SIGNATURE.length && data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  return null;
};

export const decodeIdentityImage = (raw: string, side: 'recto' | 'verso'): DecodedIdentityImage => {
  const trimmed = raw.trim();
  const declared = DATA_URL_PATTERN.exec(trimmed);
  const base64 = (declared ? trimmed.slice(declared[0].length) : trimmed).replace(/\s+/g, '');
  const invalid = new AppError(`Image ${side} invalide : une photo JPEG ou PNG encodée en base64 est attendue.`, 400);

  if (!base64 || base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) throw invalid;
  if (Math.floor((base64.length * 3) / 4) > MAX_IDENTITY_IMAGE_BYTES + 2) {
    throw new AppError(`Image ${side} trop volumineuse : 4 Mo au plus.`, 413);
  }

  const data = Buffer.from(base64, 'base64');
  if (data.length > MAX_IDENTITY_IMAGE_BYTES) {
    throw new AppError(`Image ${side} trop volumineuse : 4 Mo au plus.`, 413);
  }
  if (data.length < MIN_IDENTITY_IMAGE_BYTES) throw invalid;

  const mimeType = detectImageMime(data);
  if (!mimeType) throw invalid;
  return { mimeType, data };
};

export const toDataUrl = (data: Buffer): string => {
  const mimeType = detectImageMime(data) ?? 'application/octet-stream';
  return `data:${mimeType};base64,${data.toString('base64')}`;
};
