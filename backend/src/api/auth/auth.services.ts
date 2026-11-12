import { env } from '../../config/env.config';
import authRepository from './auth.repo';
import totpService from '../../services/totp.service';
import ledgerService from '../../services/ledger.service';
import sessionService, { VerifiedToken } from '../../services/session.service';
import otpChallengeService, { PendingSignup } from '../../services/otp-challenge.service';
import { enqueueEmail } from '../../queues/emails.queue';
import walletService from '../../blockchain/wallet.service';
import { VerifiedOAuthIdentity } from '../../services/oauth-verifier.service';
import logger from '../../utils/logger.util';
import {
  compareHash,
  decryptText,
  encryptText,
  hashValue,
  hmacSha256,
  isEncrypted,
  normalizeBackupCode,
  safeEqual,
  sha256,
} from '../../utils/crypto.util';
import { AppError } from '../../utils/response.util';

type AuthUser = NonNullable<Awaited<ReturnType<typeof authRepository.findById>>>;

const INVALID_CODE_MESSAGE = 'Code de vérification invalide ou expiré';
const INVALID_CREDENTIALS_MESSAGE = 'Email ou mot de passe incorrect.';
const INVALID_RESET_CODE_MESSAGE = 'Code invalide ou expiré.';
const ACCOUNT_EXISTS_MESSAGE = 'Un compte existe déjà avec cette adresse email.';
const WELCOME_POINTS = 25;

const passwordResetSubject = (userId: string) => `password-reset:${userId}`;
const anonymousSubject = (scope: string, email: string) => `${scope}:${hmacSha256(`${scope}:${email}`)}`;

let timingDummyHash: Promise<string> | null = null;
const dummyHash = (): Promise<string> => {
  if (!timingDummyHash) timingDummyHash = hashValue('blocklucky-compte-inexistant-0');
  return timingDummyHash;
};

const verifyPassword = async (password: string, storedHash: string | null | undefined): Promise<boolean> => {
  const matches = await compareHash(password, storedHash ?? (await dummyHash()));
  return Boolean(storedHash) && matches;
};

const publicUser = (user: AuthUser) => ({
  id: user.id,
  walletAddress: user.walletAddress,
  email: user.email,
  role: user.role,
  pointsBalance: user.pointsBalance,
  referralCode: user.referralCode,
  isTwoFactorEnabled: user.isTwoFactorEnabled,
  twoFactorMethod: user.twoFactorMethod,
  hasPassword: Boolean(user.passwordHash),
  ageVerificationStatus: user.ageVerificationStatus,
});

const hashBackupCode = (code: string) => sha256(`backup:${normalizeBackupCode(code)}`);

const devPreview = (code: string) =>
  env.NODE_ENV === 'development' ? { devOtpPreview: code } : {};

export class AuthService {
  private notify(email: string | null, event: string) {
    if (!email) return Promise.resolve();
    return enqueueEmail({
      to: email,
      subject: 'Alerte de sécurité sur votre compte - BlockLucky',
      templateName: 'security-alert',
      variables: { EVENT: event, DATE: new Date().toISOString().replace('T', ' ').slice(0, 16) },
    }).then(() => undefined);
  }

  private async sendCodeEmail(email: string, code: string, subject: string) {
    await enqueueEmail({
      to: email,
      subject,
      templateName: 'otp-code',
      variables: { CODE: code, EXPIRES_MINUTES: '10' },
    });
  }

  private readTotpSecret(user: AuthUser): string | null {
    if (!user.twoFactorSecret) return null;
    return isEncrypted(user.twoFactorSecret) ? decryptText(user.twoFactorSecret) : user.twoFactorSecret;
  }

  private async issueSession(user: AuthUser) {
    const token = sessionService.sign({
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      twoFactorVerified: true,
    });
    const refreshed = (await authRepository.findById(user.id)) ?? user;
    return { token, user: publicUser(refreshed) };
  }

  private async createVerifiedUser(signup: PendingSignup) {
    const existing =
      (signup.walletAddress ? await authRepository.findByWallet(signup.walletAddress) : null) ??
      (await authRepository.findByEmail(signup.email));
    if (existing) return { user: existing, isNewUser: false };

    const wallet = walletService.createCustodialWallet();
    const user = await authRepository.createUser({
      walletAddress: wallet.address,
      walletEncryptedKey: wallet.encryptedKey,
      email: signup.email,
      isEmailVerified: true,
      ...(signup.passwordHash ? { passwordHash: signup.passwordHash } : {}),
      ...(signup.referrerId ? { referredById: signup.referrerId } : {}),
    });
    walletService
      .grantWelcomeEthers(user)
      .catch((error: Error) => logger.warn(`Dotation de bienvenue différée : ${error.message}`));

    if (signup.referrerId) {
      await ledgerService.creditPoints(
        signup.referrerId,
        100,
        'REFERRAL',
        `Parrainage d'un nouveau citoyen (${user.walletAddress.slice(0, 8)}...)`
      );
      await ledgerService.creditPoints(user.id, 50, 'REFERRAL', 'Bonus filleul inscription parrainée');
    }

    await this.welcomeNewAccount(user, signup);
    return { user, isNewUser: true };
  }

  private async welcomeNewAccount(user: AuthUser, signup: PendingSignup) {
    await ledgerService.creditPoints(user.id, WELCOME_POINTS, 'SOCIAL_QUEST', 'Bonus de bienvenue Onboarding EtherBay');

    await enqueueEmail({
      to: signup.email,
      subject: "Bienvenue à la Grande Loterie d'EtherBay !",
      templateName: 'welcome',
      variables: { WALLET_ADDRESS: user.walletAddress, REFERRAL_CODE: user.referralCode },
    });

    await authRepository.recordAuthAnalytics(user.id, 'USER_SIGNUP', signup.utmSource, {
      provider: signup.provider,
      ageGroup: signup.ageGroup ?? '18-35',
      isAdultConfirmed: true,
    });
  }

  private async activateExistingAccount(existing: AuthUser, signup: PendingSignup) {
    const activated = signup.passwordHash
      ? await authRepository.setPassword(existing.id, signup.passwordHash)
      : await authRepository.markEmailVerified(existing.id);
    walletService
      .ensureWallet(activated)
      .then((owner) => walletService.grantWelcomeEthers(owner))
      .catch((error: Error) => logger.warn(`Dotation de bienvenue différée : ${error.message}`));
    await this.welcomeNewAccount(activated, signup);
    return { user: activated, isNewUser: true };
  }

  private async registerVerifiedEmail(signup: PendingSignup) {
    const existing = await authRepository.findByEmail(signup.email);
    if (!existing) return this.createVerifiedUser(signup);
    if (existing.isEmailVerified || existing.deletedAt) throw new AppError(ACCOUNT_EXISTS_MESSAGE, 409);
    return this.activateExistingAccount(existing, signup);
  }

  private async completePrimaryLogin(user: AuthUser, provider: string) {
    if (user.isTwoFactorEnabled && user.twoFactorMethod === 'APP') {
      return { requiresTwoFactor: true, twoFactorMethod: 'APP' as const, userId: user.id };
    }
    if (user.isTwoFactorEnabled && user.twoFactorMethod === 'EMAIL' && user.email) {
      const code = await otpChallengeService.issue(user.id, 'LOGIN');
      await this.sendCodeEmail(user.email, code, 'Votre code de connexion - BlockLucky');
      return { requiresTwoFactor: true, twoFactorMethod: 'EMAIL' as const, userId: user.id, ...devPreview(code) };
    }
    await otpChallengeService.clearFailures(user.id);
    await authRepository.recordAuthAnalytics(user.id, 'USER_LOGIN', undefined, { provider });
    const session = await this.issueSession(user);
    return { requiresTwoFactor: false, isNewUser: false, ...session };
  }

  public async signup(input: {
    email: string;
    password: string;
    referralCode?: string;
    utmSource?: string;
    ageGroup?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await authRepository.findByEmail(email);
    if (existing && (existing.isEmailVerified || existing.deletedAt)) {
      throw new AppError(ACCOUNT_EXISTS_MESSAGE, 409);
    }

    const passwordHash = await hashValue(input.password);
    const referrer = input.referralCode ? await authRepository.findByReferralCode(input.referralCode) : null;
    const subjectId = otpChallengeService.newSubjectId();
    const code = await otpChallengeService.issue(subjectId, 'SIGNUP', {
      email,
      passwordHash,
      provider: 'PASSWORD',
      referrerId: referrer?.id,
      ageGroup: input.ageGroup,
      utmSource: input.utmSource,
    });
    await this.sendCodeEmail(email, code, 'Vérifiez votre adresse email - BlockLucky');

    return {
      requiresTwoFactor: true,
      twoFactorMethod: 'EMAIL' as const,
      userId: subjectId,
      ...devPreview(code),
    };
  }

  public async signin(input: { email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const found = await authRepository.findByEmail(email);
    const account = found && !found.deletedAt ? found : null;
    const lockSubject = account?.id ?? anonymousSubject('signin', email);

    await otpChallengeService.assertNotLocked(lockSubject);
    const valid = await verifyPassword(input.password, account?.passwordHash);
    if (!account || !valid) {
      await otpChallengeService.recordFailure(lockSubject);
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    return this.completePrimaryLogin(account, 'PASSWORD');
  }

  public async forgotPassword(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const found = await authRepository.findByEmail(email);
    if (!found || found.deletedAt || !found.email) return { sent: true };

    const code = await otpChallengeService.issue(passwordResetSubject(found.id), 'PASSWORD_RESET');
    this.sendCodeEmail(found.email, code, 'Réinitialisation de votre mot de passe - BlockLucky').catch(
      (error: Error) => logger.warn(`Email de réinitialisation non envoyé : ${error.message}`)
    );
    return { sent: true, ...devPreview(code) };
  }

  public async resetPassword(input: { email: string; code: string; newPassword: string }) {
    const email = input.email.trim().toLowerCase();
    const found = await authRepository.findByEmail(email);
    const account = found && !found.deletedAt ? found : null;
    const subject = account ? passwordResetSubject(account.id) : anonymousSubject('password-reset', email);

    await otpChallengeService.assertNotLocked(subject);
    const challenge = account ? await otpChallengeService.consume(subject, input.code) : null;
    if (!account || !challenge || challenge.purpose !== 'PASSWORD_RESET') {
      await otpChallengeService.recordFailure(subject);
      throw new AppError(INVALID_RESET_CODE_MESSAGE, 400);
    }
    await otpChallengeService.clearFailures(subject);

    const passwordHash = await hashValue(input.newPassword);
    await authRepository.setPassword(account.id, passwordHash);
    await sessionService.revokeAllForUser(account.id);
    await this.notify(
      account.email,
      account.passwordHash ? 'Mot de passe réinitialisé' : 'Mot de passe défini sur votre compte'
    );
    return { reset: true };
  }

  public async oauthLogin(identity: VerifiedOAuthIdentity) {
    const found = await authRepository.findByEmail(identity.email);
    if (found && !found.deletedAt) {
      if (!found.isEmailVerified) {
        const { user } = await this.activateExistingAccount(found, {
          email: identity.email,
          provider: identity.provider,
        });
        const session = await this.issueSession(user);
        return { requiresTwoFactor: false, isNewUser: true, ...session };
      }
      return this.completePrimaryLogin(found, identity.provider);
    }

    const { user, isNewUser } = await this.createVerifiedUser({
      email: identity.email,
      provider: identity.provider,
    });
    const session = await this.issueSession(user);
    return { requiresTwoFactor: false, isNewUser, ...session };
  }

  public async socialLogin(input: {
    walletAddress: string;
    email?: string;
    provider?: string;
    isAdultConfirmed: boolean;
    ageGroup?: string;
    referralCode?: string;
    utmSource?: string;
  }) {
    if (!input.isAdultConfirmed) {
      throw new AppError('Vous devez confirmer avoir plus de 18 ans (vérification légale).', 403);
    }

    const walletLower = input.walletAddress.toLowerCase();
    const emailLower = input.email?.trim().toLowerCase();
    const provider = input.provider ?? 'GOOGLE';

    let user = await authRepository.findByWallet(walletLower);
    if (!user && emailLower) user = await authRepository.findByEmail(emailLower);

    if (user && user.isTwoFactorEnabled && user.twoFactorMethod === 'APP') {
      return {
        requiresTwoFactor: true,
        twoFactorMethod: 'APP' as const,
        userId: user.id,
      };
    }

    if (env.LOGIN_EMAIL_CODE_REQUIRED || (user?.isTwoFactorEnabled && user.twoFactorMethod === 'EMAIL')) {
      const email = user?.email ?? emailLower;
      if (!email) {
        throw new AppError('Une adresse email est requise pour recevoir le code de connexion', 400);
      }

      let subjectId: string;
      let code: string;
      if (user) {
        subjectId = user.id;
        await otpChallengeService.assertNotLocked(subjectId);
        code = await otpChallengeService.issue(subjectId, 'LOGIN');
      } else {
        const referrer = input.referralCode
          ? await authRepository.findByReferralCode(input.referralCode)
          : null;
        subjectId = otpChallengeService.newSubjectId();
        code = await otpChallengeService.issue(subjectId, 'SIGNUP', {
          walletAddress: walletLower,
          email,
          provider,
          referrerId: referrer?.id,
          ageGroup: input.ageGroup,
          utmSource: input.utmSource,
        });
      }

      await this.sendCodeEmail(email, code, 'Votre code de connexion - BlockLucky');

      return {
        requiresTwoFactor: true,
        twoFactorMethod: 'EMAIL' as const,
        userId: subjectId,
        ...devPreview(code),
      };
    }

    let isNewUser = false;
    if (!user) {
      if (!emailLower) {
        throw new AppError('Une adresse email est requise pour créer un compte', 400);
      }
      const referrer = input.referralCode
        ? await authRepository.findByReferralCode(input.referralCode)
        : null;
      const created = await this.createVerifiedUser({
        walletAddress: walletLower,
        email: emailLower,
        provider,
        referrerId: referrer?.id,
        ageGroup: input.ageGroup,
        utmSource: input.utmSource,
      });
      user = created.user;
      isNewUser = created.isNewUser;
    } else {
      await authRepository.recordAuthAnalytics(user.id, 'USER_LOGIN', input.utmSource, {
        provider,
        ageGroup: input.ageGroup ?? '18-35',
        isAdultConfirmed: true,
      });
    }

    const session = await this.issueSession(user);
    return { requiresTwoFactor: false, isNewUser, ...session };
  }

  public async setup2FA(userId: string, method: 'APP' | 'EMAIL') {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('Utilisateur introuvable', 404);
    if (user.isTwoFactorEnabled) {
      throw new AppError('La double authentification est déjà active. Désactivez-la avant de la reconfigurer.', 409);
    }

    if (method === 'APP') {
      const secret = totpService.generateSecret();
      const accountName = user.email || user.walletAddress;
      const otpAuthUrl = totpService.generateOtpAuthUrl(accountName, secret);
      const qrCodeDataUrl = await totpService.generateQrCodeDataUrl(otpAuthUrl);
      const backupCodes = totpService.generateBackupCodes();

      await authRepository.updateTwoFactor(user.id, {
        isTwoFactorEnabled: false,
        twoFactorMethod: 'APP',
        twoFactorSecret: encryptText(secret),
        twoFactorBackupCodes: backupCodes.map(hashBackupCode),
      });
      await otpChallengeService.discard(user.id);

      return { method: 'APP', secret, otpAuthUrl, qrCodeDataUrl, backupCodes };
    }

    if (!user.email) {
      throw new AppError('Une adresse email est requise pour activer la 2FA par Email', 400);
    }

    await authRepository.updateTwoFactor(user.id, {
      isTwoFactorEnabled: false,
      twoFactorMethod: 'EMAIL',
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    });
    const code = await otpChallengeService.issue(user.id, 'SETUP');
    await this.sendCodeEmail(user.email, code, 'Activation 2FA - Votre code OTP BlockLucky');

    return {
      method: 'EMAIL',
      message: `Un code à 6 chiffres a été envoyé à ${user.email}`,
      ...devPreview(code),
    };
  }

  private async verifyTotpOrBackup(user: AuthUser, code: string): Promise<boolean> {
    const secret = this.readTotpSecret(user);
    if (!secret) return false;

    const counter = totpService.matchCounter(code, secret);
    if (counter !== null) {
      return otpChallengeService.markTotpUsed(user.id, counter);
    }

    const candidate = hashBackupCode(code);
    const remaining = user.twoFactorBackupCodes.filter((stored) => !safeEqual(stored, candidate));
    if (remaining.length === user.twoFactorBackupCodes.length) return false;

    await authRepository.updateBackupCodes(user.id, remaining);
    await this.notify(
      user.email,
      `Un code de secours 2FA a été utilisé (${remaining.length} restant${remaining.length > 1 ? 's' : ''})`
    );
    return true;
  }

  public async verify2FA(subjectId: string, code: string) {
    await otpChallengeService.assertNotLocked(subjectId);

    if (await otpChallengeService.hasPending(subjectId)) {
      const challenge = await otpChallengeService.consume(subjectId, code);
      if (!challenge) {
        await otpChallengeService.recordFailure(subjectId);
        throw new AppError(INVALID_CODE_MESSAGE, 401);
      }
      await otpChallengeService.clearFailures(subjectId);

      if (challenge.purpose === 'SIGNUP' && challenge.signup) {
        const { user, isNewUser } = challenge.signup.passwordHash
          ? await this.registerVerifiedEmail(challenge.signup)
          : await this.createVerifiedUser(challenge.signup);
        const session = await this.issueSession(user);
        return { verified: true, isNewUser, ...session };
      }

      const user = await authRepository.findById(subjectId);
      if (!user) throw new AppError(INVALID_CODE_MESSAGE, 401);

      if (!user.isEmailVerified) await authRepository.markEmailVerified(user.id);

      if (challenge.purpose === 'SETUP') {
        await authRepository.updateTwoFactor(user.id, {
          isTwoFactorEnabled: true,
          twoFactorMethod: 'EMAIL',
          twoFactorSecret: null,
          twoFactorBackupCodes: [],
        });
        await sessionService.revokeAllForUser(user.id);
        await this.notify(user.email, 'Double authentification par email activée');
      } else {
        await authRepository.recordAuthAnalytics(user.id, 'USER_LOGIN', undefined, { provider: 'EMAIL_CODE' });
      }

      const session = await this.issueSession(user);
      return { verified: true, isNewUser: false, ...session };
    }

    const user = await authRepository.findById(subjectId);
    if (!user || user.twoFactorMethod !== 'APP' || !(await this.verifyTotpOrBackup(user, code))) {
      await otpChallengeService.recordFailure(subjectId);
      throw new AppError(INVALID_CODE_MESSAGE, 401);
    }
    await otpChallengeService.clearFailures(subjectId);

    if (!user.isTwoFactorEnabled) {
      await authRepository.updateTwoFactor(user.id, {
        isTwoFactorEnabled: true,
        twoFactorMethod: 'APP',
        twoFactorSecret: user.twoFactorSecret,
        twoFactorBackupCodes: user.twoFactorBackupCodes,
      });
      await sessionService.revokeAllForUser(user.id);
      await this.notify(user.email, 'Double authentification par application activée');
    } else {
      await authRepository.recordAuthAnalytics(user.id, 'USER_LOGIN', undefined, { provider: 'TOTP' });
    }

    const session = await this.issueSession(user);
    return { verified: true, isNewUser: false, ...session };
  }

  public async disable2FA(session: VerifiedToken, code?: string) {
    const user = await authRepository.findById(session.userId);
    if (!user) throw new AppError('Utilisateur introuvable', 404);

    if (user.isTwoFactorEnabled) {
      await otpChallengeService.assertNotLocked(user.id);
      const proven =
        (code ? await this.verifyTotpOrBackup(user, code) : false) || sessionService.isRecent(session);
      if (!proven) {
        await otpChallengeService.recordFailure(user.id);
        throw new AppError(
          'Pour désactiver la double authentification, saisissez un code 2FA valide ou reconnectez-vous (connexion de moins de 15 minutes).',
          401
        );
      }
    }

    await authRepository.updateTwoFactor(user.id, {
      isTwoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    });

    if (user.isTwoFactorEnabled) {
      await this.notify(user.email, 'Double authentification désactivée');
    }

    return { isTwoFactorEnabled: false };
  }

  public async logout(session: VerifiedToken, allDevices: boolean) {
    if (allDevices) {
      await sessionService.revokeAllForUser(session.userId);
    } else {
      await sessionService.revoke(session);
    }
    return { loggedOut: true, allDevices };
  }

  public getOnboardingSlides() {
    return [
      {
        step: 1,
        title: "La Grande Loterie Citoyenne d'EtherBay",
        description:
          "Participez à l'événement de fin d'année organisé par la Mairie d'EtherBay. 100% transparent, équitable et vérifiable sur la blockchain.",
      },
      {
        step: 2,
        title: 'Achat 1-Clic avec votre Portefeuille Intégré',
        description:
          "La Mairie crée votre portefeuille Ethereum et vous offre une dotation d'ethers fictifs qui couvre vos tickets et les frais de réseau. Si l'événement est annulé, vous êtes automatiquement remboursé.",
      },
      {
        step: 3,
        title: 'Gagnez des EtherPoints & Soutenez nos Commerçants',
        description:
          "Chaque ticket acheté, ami parrainé ou quête accomplie vous rapporte des EtherPoints échangeables contre des réductions chez les commerçants locaux d'EtherBay !",
      },
      {
        step: 4,
        title: 'Tirage Live Certifié Chainlink VRF',
        description:
          "Rejoignez la salle d'attente 10 minutes avant le tirage en direct avec toute la ville et recevez votre badge commémoratif NFT (POAP).",
      },
    ];
  }
}

export const authService = new AuthService();
export default authService;
