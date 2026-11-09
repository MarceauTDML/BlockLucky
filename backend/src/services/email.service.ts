import fs from 'fs';
import path from 'path';
import transporter from '../config/mailer.config';
import { env } from '../config/env.config';
import logger from '../utils/logger.util';

export type EmailTemplateName =
  | 'otp-code'
  | '2fa-backup-codes'
  | 'gdpr-deletion'
  | 'reward-claim'
  | 'welcome';

export class EmailService {
  private loadTemplate(templateName: EmailTemplateName, variables: Record<string, string>): string {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
      let content = fs.readFileSync(templatePath, 'utf8');
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return content;
    } catch (error) {
      logger.warn(`Fallback template used for ${templateName}`, { error });
      return `<p>${JSON.stringify(variables)}</p>`;
    }
  }

  public async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: EmailTemplateName,
    variables: Record<string, string>
  ): Promise<boolean> {
    const html = this.loadTemplate(templateName, variables);
    if (env.NODE_ENV === 'test') {
      return true;
    }
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
      });
      logger.info(`Email [${templateName}] envoyé à ${to}`);
      return true;
    } catch (error) {
      logger.warn(`Mode simulation d'envoi d'email [${templateName}] à ${to} (SMTP non disponible en local)`, {
        reason: (error as Error).message,
      });
      return false;
    }
  }

  public async sendOtpEmail(to: string, code: string, expiresMinutes = 10): Promise<boolean> {
    return this.sendTemplateEmail(to, 'Votre code de sécurité 2FA BlockLucky', 'otp-code', {
      CODE: code,
      EXPIRES_MINUTES: String(expiresMinutes),
    });
  }

  public async sendBackupCodesEmail(to: string, codes: string[]): Promise<boolean> {
    return this.sendTemplateEmail(to, 'Vos codes de secours 2FA BlockLucky', '2fa-backup-codes', {
      BACKUP_CODES: codes.join('<br/>'),
    });
  }

  public async sendGdprDeletionEmail(to: string, token: string): Promise<boolean> {
    const confirmUrl = `${env.FRONTEND_URL}/gdpr/confirm-delete?token=${token}`;
    return this.sendTemplateEmail(
      to,
      'Confirmation de suppression de compte (RGPD) - BlockLucky',
      'gdpr-deletion',
      {
        CONFIRM_URL: confirmUrl,
        TOKEN: token,
      }
    );
  }

  public async sendRewardClaimEmail(
    to: string,
    rewardTitle: string,
    partnerName: string,
    promoCode: string
  ): Promise<boolean> {
    return this.sendTemplateEmail(
      to,
      `Votre code promo ${partnerName} - BlockLucky`,
      'reward-claim',
      {
        REWARD_TITLE: rewardTitle,
        PARTNER_NAME: partnerName,
        PROMO_CODE: promoCode,
      }
    );
  }

  public async sendWelcomeEmail(to: string, walletAddress: string, referralCode: string): Promise<boolean> {
    return this.sendTemplateEmail(
      to,
      "Bienvenue à la Grande Loterie d'EtherBay !",
      'welcome',
      {
        WALLET_ADDRESS: walletAddress,
        REFERRAL_CODE: referralCode,
      }
    );
  }
}

export const emailService = new EmailService();
export default emailService;
