import { Router } from 'express';
import userController from './user.controllers';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  updatePreferencesSchema,
  setResponsibleGamingLimitSchema,
  completeSocialQuestSchema,
  confirmGdprDeletionSchema,
} from './user.validators';

const router = Router();

/**
 * @openapi
 * /api/user/profile:
 *   get:
 *     tags: [User]
 *     summary: Obtenir le profil complet du citoyen connecté
 */
router.get('/profile', authenticate, (req, res, next) =>
  userController.getProfile(req, res, next)
);

/**
 * @openapi
 * /api/user/referrals:
 *   get:
 *     tags: [User]
 *     summary: Obtenir son lien de parrainage unique et les boutons de partage rapide (SMS, WhatsApp, Twitter)
 */
router.get('/referrals', authenticate, (req, res, next) =>
  userController.getReferrals(req, res, next)
);

/**
 * @openapi
 * /api/user/quests:
 *   get:
 *     tags: [User]
 *     summary: Obtenir la liste des quêtes sociales (Tasks) disponibles
 */
router.get('/quests', authenticate, (req, res, next) =>
  userController.getQuests(req, res, next)
);

/**
 * @openapi
 * /api/user/quests/complete:
 *   post:
 *     tags: [User]
 *     summary: Valider une quête sociale et gagner des EtherPoints bonus
 */
router.post(
  '/quests/complete',
  authenticate,
  validate(completeSocialQuestSchema),
  (req, res, next) => userController.completeQuest(req, res, next)
);

/**
 * @openapi
 * /api/user/responsible-limit:
 *   put:
 *     tags: [User]
 *     summary: Définir sa limite personnelle d'achat de tickets (Jeu Responsable)
 */
router.put(
  '/responsible-limit',
  authenticate,
  validate(setResponsibleGamingLimitSchema),
  (req, res, next) => userController.setResponsibleLimit(req, res, next)
);

/**
 * @openapi
 * /api/user/preferences:
 *   put:
 *     tags: [User]
 *     summary: Modifier le thème (Sombre/Clair) et la langue (FR/EN)
 */
router.put(
  '/preferences',
  authenticate,
  validate(updatePreferencesSchema),
  (req, res, next) => userController.updatePreferences(req, res, next)
);

/**
 * @openapi
 * /api/user/notifications:
 *   get:
 *     tags: [User]
 *     summary: Consulter le centre de notifications push
 */
router.get('/notifications', authenticate, (req, res, next) =>
  userController.getNotifications(req, res, next)
);

/**
 * @openapi
 * /api/user/gdpr/export:
 *   get:
 *     tags: [User]
 *     summary: Exporter l'intégralité de ses données personnelles au format JSON (RGPD)
 */
router.get('/gdpr/export', authenticate, (req, res, next) =>
  userController.exportGdpr(req, res, next)
);

/**
 * @openapi
 * /api/user/gdpr/delete-request:
 *   post:
 *     tags: [User]
 *     summary: Demander la suppression/anonymisation de son compte avec envoi d'email de confirmation
 */
router.post('/gdpr/delete-request', authenticate, (req, res, next) =>
  userController.requestGdprDeletion(req, res, next)
);

/**
 * @openapi
 * /api/user/gdpr/confirm-delete:
 *   post:
 *     tags: [User]
 *     summary: Confirmer définitivement la suppression/anonymisation RGPD via le jeton reçu par email
 */
router.post(
  '/gdpr/confirm-delete',
  validate(confirmGdprDeletionSchema),
  (req, res, next) => userController.confirmGdprDeletion(req, res, next)
);

export default router;
