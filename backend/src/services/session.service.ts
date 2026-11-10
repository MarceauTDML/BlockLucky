import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import redis from '../config/redis.config';
import { JwtPayload } from '../types/api.types';

const ALGORITHM = 'HS256';
const ISSUER = 'blocklucky-api';
const AUDIENCE = 'blocklucky-clients';
const CLOCK_TOLERANCE_SECONDS = 30;

export interface VerifiedToken extends JwtPayload {
  jti: string;
  iat: number;
  exp: number;
}

const revokedKey = (jti: string) => `auth:revoked:${jti}`;
const revokedBeforeKey = (userId: string) => `auth:revoked-before:${userId}`;

export class SessionService {
  public sign(payload: JwtPayload): string {
    return jwt.sign(
      {
        userId: payload.userId,
        walletAddress: payload.walletAddress,
        role: payload.role,
        twoFactorVerified: payload.twoFactorVerified ?? false,
      },
      env.JWT_SECRET,
      {
        algorithm: ALGORITHM,
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] & string,
        issuer: ISSUER,
        audience: AUDIENCE,
        jwtid: randomUUID(),
      }
    );
  }

  public decode(token: string): VerifiedToken {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    if (typeof decoded === 'string' || !decoded.jti || !decoded.userId) {
      throw new Error('Jeton invalide');
    }
    return decoded as VerifiedToken;
  }

  public async verify(token: string): Promise<VerifiedToken> {
    const decoded = this.decode(token);
    const [revoked, revokedBefore] = await Promise.all([
      redis.get(revokedKey(decoded.jti)),
      redis.get(revokedBeforeKey(decoded.userId)),
    ]);
    if (revoked) throw new Error('Session révoquée');
    if (revokedBefore && decoded.iat * 1000 < Number(revokedBefore)) {
      throw new Error('Session révoquée');
    }
    return decoded;
  }

  public async revoke(token: Pick<VerifiedToken, 'jti' | 'exp'>): Promise<void> {
    const remaining = Math.max(1, token.exp - Math.floor(Date.now() / 1000));
    const ttl = Math.ceil(remaining * 1.2) + CLOCK_TOLERANCE_SECONDS;
    await redis.set(revokedKey(token.jti), '1', ttl);
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await redis.set(revokedBeforeKey(userId), String(Date.now() - 1000), 30 * 24 * 3600);
  }

  public isRecent(token: Pick<VerifiedToken, 'iat'>, maxAgeSeconds = 15 * 60): boolean {
    return Date.now() / 1000 - token.iat <= maxAgeSeconds;
  }
}

export const sessionService = new SessionService();
export default sessionService;
