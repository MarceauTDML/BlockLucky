import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.config';
import { AppError } from '../utils/response.util';

export type OAuthProvider = 'GOOGLE' | 'APPLE';

export interface VerifiedOAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  email: string;
}

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

type JoseModule = typeof import('jose');
type RemoteKeySet = ReturnType<JoseModule['createRemoteJWKSet']>;

const isTrue = (value: unknown): boolean => value === true || value === 'true';

export class OAuthVerifierService {
  private googleClient: OAuth2Client | null = null;
  private appleKeys: RemoteKeySet | null = null;
  private jose: Promise<JoseModule> | null = null;

  private loadJose(): Promise<JoseModule> {
    if (!this.jose) this.jose = import('jose');
    return this.jose;
  }

  public async verifyGoogle(idToken: string): Promise<VerifiedOAuthIdentity> {
    if (env.GOOGLE_CLIENT_IDS.length === 0) {
      throw new AppError('Connexion Google non configurée.', 503);
    }
    if (!this.googleClient) this.googleClient = new OAuth2Client();

    let payload: Record<string, unknown> | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_IDS });
      payload = ticket.getPayload() as Record<string, unknown> | undefined;
    } catch {
      throw new AppError('Jeton Google invalide ou expiré.', 401);
    }

    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const subject = typeof payload?.sub === 'string' ? payload.sub : '';
    if (!payload || !subject || !email) throw new AppError('Jeton Google invalide ou expiré.', 401);
    if (!isTrue(payload.email_verified)) {
      throw new AppError("L'adresse email du compte Google n'est pas vérifiée.", 401);
    }
    return { provider: 'GOOGLE', subject, email };
  }

  public async verifyApple(identityToken: string): Promise<VerifiedOAuthIdentity> {
    if (env.APPLE_CLIENT_IDS.length === 0) {
      throw new AppError('Connexion Apple non configurée.', 503);
    }
    const jose = await this.loadJose();
    if (!this.appleKeys) this.appleKeys = jose.createRemoteJWKSet(new URL(APPLE_KEYS_URL));

    let payload: Record<string, unknown>;
    try {
      const verified = await jose.jwtVerify(identityToken, this.appleKeys, {
        issuer: APPLE_ISSUER,
        audience: env.APPLE_CLIENT_IDS,
        algorithms: ['RS256'],
      });
      payload = verified.payload as Record<string, unknown>;
    } catch {
      throw new AppError('Jeton Apple invalide ou expiré.', 401);
    }

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const subject = typeof payload.sub === 'string' ? payload.sub : '';
    if (!subject || !email) {
      throw new AppError("Le jeton Apple ne contient pas d'adresse email.", 401);
    }
    if (payload.email_verified !== undefined && !isTrue(payload.email_verified)) {
      throw new AppError("L'adresse email du compte Apple n'est pas vérifiée.", 401);
    }
    return { provider: 'APPLE', subject, email };
  }
}

export const oauthVerifierService = new OAuthVerifierService();
export default oauthVerifierService;
