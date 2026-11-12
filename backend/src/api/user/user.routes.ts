import { Router } from 'express';
import userController from './user.controllers';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { identityUploadRateLimiter, supportRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { identityUploadJsonParser } from '../../middlewares/body-parser.middleware';
import {
  submitIdentitySchema,
  updatePreferencesSchema,
  setResponsibleGamingLimitSchema,
  completeSocialQuestSchema,
  confirmGdprDeletionSchema,
  updateProfileSchema,
  supportRequestSchema,
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
 * /api/user/profile:
 *   patch:
 *     tags: [User]
 *     summary: Modifier son prénom et son nom (50 caractères au plus, lettres, espaces, traits d'union et apostrophes ; une chaîne vide efface le champ)
 */
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  (req, res, next) => userController.updateProfile(req, res, next)
);

/**
 * @openapi
 * /api/user/support:
 *   post:
 *     tags: [User]
 *     summary: Envoyer un message au support de la Ville d'EtherBay (5 messages par heure au plus)
 */
router.post(
  '/support',
  authenticate,
  supportRateLimiter,
  validate(supportRequestSchema),
  (req, res, next) => userController.sendSupportRequest(req, res, next)
);

/**
 * @openapi
 * /api/user/identity:
 *   post:
 *     tags: [User]
 *     summary: Envoyer le recto et le verso de sa pièce d'identité (JPEG ou PNG en base64, 4 Mo au plus chacun) pour la vérification d'âge par la Mairie
 */
router.post(
  '/identity',
  identityUploadRateLimiter,
  authenticate,
  identityUploadJsonParser,
  validate(submitIdentitySchema),
  (req, res, next) => userController.submitIdentity(req, res, next)
);

/**
 * @openapi
 * /api/user/identity:
 *   get:
 *     tags: [User]
 *     summary: Consulter le statut de sa vérification d'âge (date d'envoi, date de décision et motif d'un refus)
 */
router.get('/identity', authenticate, (req, res, next) => userController.getIdentity(req, res, next));

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
 *     summary: Modifier le thème (clair, sombre ou système), la langue (FR/EN), l'interrupteur général des notifications et leurs catégories (rappels de tirage, résultats, récompenses, parrainage)
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
 *     summary: Consulter le centre de notifications (contenu de démonstration, aucun envoi push), sans les catégories désactivées dans les préférences
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
