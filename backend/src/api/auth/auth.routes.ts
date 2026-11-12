import { Router } from 'express';
import authController from './auth.controllers';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import {
  socialLoginSchema,
  setup2FASchema,
  verify2FASchema,
  disable2FASchema,
  logoutSchema,
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleOAuthSchema,
  appleOAuthSchema,
  emailChangeRequestSchema,
  emailChangeConfirmSchema,
  changePasswordSchema,
} from './auth.validators';

const router = Router();

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Créer un compte avec email et mot de passe, puis recevoir un code à 6 chiffres par email (le compte est créé à la vérification du code via /auth/2fa/verify)
 */
router.post(
  '/signup',
  authRateLimiter,
  validate(signupSchema),
  (req, res, next) => authController.signup(req, res, next)
);

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion par email et mot de passe, avec étape 2FA si elle est activée sur le compte
 */
router.post(
  '/signin',
  authRateLimiter,
  validate(signinSchema),
  (req, res, next) => authController.signin(req, res, next)
);

/**
 * @openapi
 * /api/auth/password/forgot:
 *   post:
 *     tags: [Auth]
 *     summary: Demander un code de réinitialisation du mot de passe par email (réponse identique que le compte existe ou non)
 */
router.post(
  '/password/forgot',
  authRateLimiter,
  validate(forgotPasswordSchema),
  (req, res, next) => authController.forgotPassword(req, res, next)
);

/**
 * @openapi
 * /api/auth/password/reset:
 *   post:
 *     tags: [Auth]
 *     summary: Définir un nouveau mot de passe avec le code reçu par email et révoquer toutes les sessions du compte
 */
router.post(
  '/password/reset',
  authRateLimiter,
  validate(resetPasswordSchema),
  (req, res, next) => authController.resetPassword(req, res, next)
);

/**
 * @openapi
 * /api/auth/password/change:
 *   post:
 *     tags: [Auth]
 *     summary: Modifier son mot de passe (mot de passe actuel exigé s'il en existe un, sinon définition d'un premier mot de passe), révoquer toutes les sessions et recevoir une nouvelle session
 */
router.post(
  '/password/change',
  authRateLimiter,
  authenticate,
  validate(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);

/**
 * @openapi
 * /api/auth/email/change:
 *   post:
 *     tags: [Auth]
 *     summary: Demander le changement d'adresse email (mot de passe exigé s'il en existe un) et recevoir un code à 6 chiffres sur la nouvelle adresse
 */
router.post(
  '/email/change',
  authRateLimiter,
  authenticate,
  validate(emailChangeRequestSchema),
  (req, res, next) => authController.requestEmailChange(req, res, next)
);

/**
 * @openapi
 * /api/auth/email/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Confirmer la nouvelle adresse email avec le code reçu, puis prévenir l'ancienne adresse
 */
router.post(
  '/email/confirm',
  authRateLimiter,
  authenticate,
  validate(emailChangeConfirmSchema),
  (req, res, next) => authController.confirmEmailChange(req, res, next)
);

/**
 * @openapi
 * /api/auth/oauth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion ou inscription avec un jeton d'identité Google vérifié côté serveur
 */
router.post(
  '/oauth/google',
  authRateLimiter,
  validate(googleOAuthSchema),
  (req, res, next) => authController.googleSignIn(req, res, next)
);

/**
 * @openapi
 * /api/auth/oauth/apple:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion ou inscription avec un jeton Sign in with Apple vérifié contre les clés publiques d'Apple
 */
router.post(
  '/oauth/apple',
  authRateLimiter,
  validate(appleOAuthSchema),
  (req, res, next) => authController.appleSignIn(req, res, next)
);

/**
 * @openapi
 * /api/auth/onboarding:
 *   get:
 *     tags: [Auth]
 *     summary: Récupérer les écrans illustrés de l'onboarding interactif
 */
router.get('/onboarding', (req, res, next) => authController.getOnboarding(req, res, next));

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion sans mot de passe avec déclaration de majorité (18+), avec envoi d'un code à 6 chiffres par email
 */
router.post(
  '/login',
  authRateLimiter,
  validate(socialLoginSchema),
  (req, res, next) => authController.socialLogin(req, res, next)
);

/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Initialiser la configuration 2FA (QR Code Google Authenticator ou Email OTP)
 */
router.post(
  '/2fa/setup',
  authenticate,
  validate(setup2FASchema),
  (req, res, next) => authController.setup2FA(req, res, next)
);

/**
 * @openapi
 * /api/auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Vérifier le code OTP à 6 chiffres (App ou Email)
 */
router.post(
  '/2fa/verify',
  authRateLimiter,
  optionalAuthenticate,
  validate(verify2FASchema),
  (req, res, next) => authController.verify2FA(req, res, next)
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Révoquer la session courante, ou toutes les sessions du compte avec allDevices=true
 */
router.post(
  '/logout',
  authenticate,
  validate(logoutSchema),
  (req, res, next) => authController.logout(req, res, next)
);

/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Désactiver la double authentification 2FA
 */
router.post(
  '/2fa/disable',
  authRateLimiter,
  authenticate,
  validate(disable2FASchema),
  (req, res, next) => authController.disable2FA(req, res, next)
);

export default router;
