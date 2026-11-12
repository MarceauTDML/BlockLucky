import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.config';
import { AppError } from '../utils/response.util';

export type OAuthProvider = 'GOOGLE';

export interface VerifiedOAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  email: string;
}

const isTrue = (value: unknown): boolean => value === true || value === 'true';

export class OAuthVerifierService {
  private googleClient: OAuth2Client | null = null;

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
}

export const oauthVerifierService = new OAuthVerifierService();
export default oauthVerifierService;
