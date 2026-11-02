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
} from './auth.validators';

const router = Router();

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
 *     summary: Connexion Social Login (Web3Auth) avec vérification légale 18+
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
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Désactiver la double authentification 2FA
 */
router.post(
  '/2fa/disable',
  authenticate,
  validate(disable2FASchema),
  (req, res, next) => authController.disable2FA(req, res, next)
);

export default router;
