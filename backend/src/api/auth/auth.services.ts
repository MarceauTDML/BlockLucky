import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';
import authRepository from './auth.repo';
import totpService from '../../services/totp.service';
import ledgerService from '../../services/ledger.service';
import { enqueueEmail } from '../../queues/emails.queue';
import { generateOtpCode, hashValue, compareHash } from '../../utils/crypto.util';
import { AppError } from '../../utils/response.util';
import { JwtPayload } from '../../types/api.types';

export class AuthService {
  private signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
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
    let user = await authRepository.findByWallet(walletLower);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let referrerId: string | undefined;

      if (input.referralCode) {
        const referrer = await authRepository.findByReferralCode(input.referralCode);
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      user = await authRepository.createUser({
        walletAddress: walletLower,
        ...(input.email ? { email: input.email } : {}),
        ...(referrerId ? { referredById: referrerId } : {}),
      });

      await ledgerService.creditPoints(
        user.id,
        25,
        'SOCIAL_QUEST',
        'Bonus de bienvenue Onboarding EtherBay'
      );

      if (referrerId) {
        await ledgerService.creditPoints(
          referrerId,
          100,
          'REFERRAL',
          `Parrainage d'un nouveau citoyen (${walletLower.slice(0, 8)}...)`
        );
        await ledgerService.creditPoints(
          user.id,
          50,
          'REFERRAL',
          'Bonus filleul inscription parrainée'
        );
      }

      if (user.email) {
        await enqueueEmail({
          to: user.email,
          subject: "Bienvenue à la Grande Loterie d'EtherBay !",
          templateName: 'welcome',
          variables: {
            WALLET_ADDRESS: user.walletAddress,
            REFERRAL_CODE: user.referralCode,
          },
        });
      }
    }

    await authRepository.recordAuthAnalytics(user.id, isNewUser ? 'USER_SIGNUP' : 'USER_LOGIN', input.utmSource, {
      provider: input.provider ?? 'GOOGLE',
      ageGroup: input.ageGroup ?? '18-35',
      isAdultConfirmed: true,
    });

    if (user.isTwoFactorEnabled) {
      if (user.twoFactorMethod === 'EMAIL' && user.email) {
        const otp = generateOtpCode(6);
        const hashedOtp = await hashValue(otp);
        await authRepository.updateTwoFactor(user.id, {
          isTwoFactorEnabled: true,
          twoFactorMethod: 'EMAIL',
          twoFactorSecret: hashedOtp,
        });
        await enqueueEmail({
          to: user.email,
          subject: 'Votre code de connexion 2FA - BlockLucky',
          templateName: 'otp-code',
          variables: { CODE: otp, EXPIRES_MINUTES: '10' },
        });
      }

      return {
        requiresTwoFactor: true,
        twoFactorMethod: user.twoFactorMethod,
        userId: user.id,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          email: user.email,
          role: user.role,
        },
      };
    }

    const token = this.signToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      twoFactorVerified: true,
    });

    const refreshedUser = await authRepository.findById(user.id);

    return {
      requiresTwoFactor: false,
      token,
      isNewUser,
      user: {
        id: refreshedUser!.id,
        walletAddress: refreshedUser!.walletAddress,
        email: refreshedUser!.email,
        role: refreshedUser!.role,
        pointsBalance: refreshedUser!.pointsBalance,
        referralCode: refreshedUser!.referralCode,
        isTwoFactorEnabled: refreshedUser!.isTwoFactorEnabled,
      },
    };
  }

  public async setup2FA(userId: string, method: 'APP' | 'EMAIL') {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    if (method === 'APP') {
      const secret = totpService.generateSecret();
      const accountName = user.email || user.walletAddress;
      const otpAuthUrl = totpService.generateOtpAuthUrl(accountName, secret);
      const qrCodeDataUrl = await totpService.generateQrCodeDataUrl(otpAuthUrl);
      const backupCodes = totpService.generateBackupCodes(5);

      await authRepository.updateTwoFactor(user.id, {
        isTwoFactorEnabled: false,
        twoFactorMethod: 'APP',
        twoFactorSecret: secret,
      });

      if (user.email) {
        await enqueueEmail({
          to: user.email,
          subject: 'Vos codes de secours 2FA - BlockLucky',
          templateName: '2fa-backup-codes',
          variables: { BACKUP_CODES: backupCodes.join('<br/>') },
        });
      }

      return {
        method: 'APP',
        secret,
        otpAuthUrl,
        qrCodeDataUrl,
        backupCodes,
      };
    }

    if (!user.email) {
      throw new AppError('Une adresse email est requise pour activer la 2FA par Email', 400);
    }

    const otp = generateOtpCode(6);
    const hashedOtp = await hashValue(otp);

    await authRepository.updateTwoFactor(user.id, {
      isTwoFactorEnabled: false,
      twoFactorMethod: 'EMAIL',
      twoFactorSecret: hashedOtp,
    });

    await enqueueEmail({
      to: user.email,
      subject: 'Activation 2FA - Votre code OTP BlockLucky',
      templateName: 'otp-code',
      variables: { CODE: otp, EXPIRES_MINUTES: '10' },
    });

    return {
      method: 'EMAIL',
      message: `Un code à 6 chiffres a été envoyé à ${user.email}`,
      ...(env.NODE_ENV !== 'production' && { devOtpPreview: otp }),
    };
  }

  public async verify2FA(userId: string, code: string) {
    const user = await authRepository.findById(userId);
    if (!user || !user.twoFactorSecret || !user.twoFactorMethod) {
      throw new AppError("La double authentification n'est pas configurée pour cet utilisateur", 400);
    }

    let isValid = false;
    if (user.twoFactorMethod === 'APP') {
      isValid = totpService.verifyToken(code, user.twoFactorSecret);
    } else if (user.twoFactorMethod === 'EMAIL') {
      isValid = await compareHash(code, user.twoFactorSecret);
    }

    if (!isValid) {
      throw new AppError('Code 2FA invalide ou expiré', 401);
    }

    if (!user.isTwoFactorEnabled) {
      await authRepository.updateTwoFactor(user.id, {
        isTwoFactorEnabled: true,
        twoFactorMethod: user.twoFactorMethod,
        twoFactorSecret: user.twoFactorSecret,
      });
    }

    const token = this.signToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      twoFactorVerified: true,
    });

    return {
      verified: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        role: user.role,
        isTwoFactorEnabled: true,
        twoFactorMethod: user.twoFactorMethod,
      },
    };
  }

  public async disable2FA(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    await authRepository.updateTwoFactor(user.id, {
      isTwoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorSecret: null,
    });

    return { isTwoFactorEnabled: false };
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
        title: 'Achat 1-Clic Sans Frais de Réseau (Gasless)',
        description:
          "Achetez votre ticket en un clic sans vous soucier des frais techniques de la blockchain. Si l'événement est annulé, vous êtes automatiquement remboursé.",
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
