# Autorisations et matrice des droits

Le backend applique un contrôle d'accès par rôles (RBAC) complété par des contrôles de propriété. Cette page donne la matrice complète, route par route, relevée dans les fichiers `*.routes.ts` de [`backend/src/api`](src:backend/src/api). Elle explique ensuite les contrôles de propriété qui empêchent un partenaire d'agir sur les données d'un autre.

## Rôles

| Rôle | Attribution | Usage |
|---|---|---|
| Anonyme | Aucun jeton | Consultation publique, connexion |
| `USER` | Valeur par défaut de `User.role` à la création du compte | Citoyen : tickets, points, profil |
| `PARTNER` | Modification du rôle en base (aucune route ne le permet) | Commerçant : entreprises, offres, codes promo |
| `ADMIN` | Modification du rôle en base (aucune route ne le permet) | Mairie : tirage, trésorerie, disjoncteur, analytique ; 2FA obligatoire |

Aucune route ne permet de changer un rôle : cela se fait par le seed ([`backend/prisma/seed.ts`](src:backend/prisma/seed.ts)) ou par une requête en base. L'élévation de privilèges par l'API est donc impossible par construction.

## Briques de contrôle

| Brique | Fichier | Effet |
|---|---|---|
| `authenticate` | [`backend/src/middlewares/auth.middleware.ts`](src:backend/src/middlewares/auth.middleware.ts) | Exige un jeton valide et non révoqué, sinon 401 |
| `optionalAuthenticate` | idem | Lit le jeton s'il est présent et valide, sans jamais refuser |
| `requireRoles(...roles)` | [`backend/src/middlewares/rbac.middleware.ts`](src:backend/src/middlewares/rbac.middleware.ts) | 403 si le rôle du jeton n'est pas dans la liste, si le rôle en base diffère, si le compte est supprimé, ou si un ADMIN n'a pas activé la 2FA ; 503 si la base ne répond pas |
| `requireWebhookSignature` | [`backend/src/api/webhooks/webhook-signature.ts`](src:backend/src/api/webhooks/webhook-signature.ts) | 401 si la signature HMAC est absente, fausse ou expirée |
| Jeton `METRICS_TOKEN` | [`backend/src/api/system/system.routes.ts`](src:backend/src/api/system/system.routes.ts), [`backend/src/observability/metrics.ts`](src:backend/src/observability/metrics.ts) | Protège `/metrics` et le détail de `/health/deep` |
| `assertPartnerAccess` | [`backend/src/api/partners/partners.services.ts`](src:backend/src/api/partners/partners.services.ts) | Contrôle de propriété sur une entreprise partenaire |

`requireRoles()` sans argument refuse tout le monde : l'oubli d'un rôle aboutit à un refus, pas à une ouverture.

Toutes les routes `/api/...` existent aussi sous `/api/v1/...` avec les mêmes contrôles, car le même routeur est monté deux fois dans [`backend/src/app.ts`](src:backend/src/app.ts).

## Matrice complète

Légende : **oui** accès accordé, **non** refusé (401 sans jeton, 403 avec un rôle insuffisant), **propre** limité aux données du compte ou de ses entreprises.

### Système et documentation

| Route | Contrôle | Anonyme | USER | PARTNER | ADMIN |
|---|---|---|---|---|---|
| `GET /health`, `/health/live`, `/health/ready` | Aucun | oui | oui | oui | oui |
| `GET /health/deep` | Détail réservé au porteur de `METRICS_TOKEN` (ou à tous hors production si le jeton est vide) | résumé | résumé | résumé | résumé |
| `GET /metrics` | `Authorization: Bearer <METRICS_TOKEN>` quand le jeton est défini, obligatoire en production | jeton | jeton | jeton | jeton |
| `GET /api/config` | Aucun | oui | oui | oui | oui |
| `GET /api/docs` (Swagger UI) | Aucun | oui | oui | oui | oui |

### Authentification

| Route | Contrôle | Anonyme | USER | PARTNER | ADMIN |
|---|---|---|---|---|---|
| `GET /api/auth/onboarding` | Aucun | oui | oui | oui | oui |
| `POST /api/auth/login` | `authRateLimiter` | oui | oui | oui | oui |
| `POST /api/auth/2fa/verify` | `authRateLimiter`, `optionalAuthenticate` | oui | oui | oui | oui |
| `POST /api/auth/2fa/setup` | `authenticate` | non | propre | propre | propre |
| `POST /api/auth/2fa/disable` | `authRateLimiter`, `authenticate`, preuve récente | non | propre | propre | propre |
| `POST /api/auth/logout` | `authenticate` | non | propre | propre | propre |

### Loterie

| Route | Contrôle | Anonyme | USER | PARTNER | ADMIN |
|---|---|---|---|---|---|
| `GET /api/lottery/status` | Aucun | oui | oui | oui | oui |
| `GET /api/lottery/transparency-charter` | Aucun | oui | oui | oui | oui |
| `GET /api/lottery/leaderboard` | Aucun | oui | oui | oui | oui |
| `GET /api/lottery/poap/:file` | Aucun (nom de fichier `<n>.json` ou `<n>.svg`, au plus 9 chiffres) | oui | oui | oui | oui |
| `POST /api/lottery/buy` | `authenticate`, `idempotency` | non | propre | propre | propre |
| `POST /api/lottery/gift` | `authenticate`, `idempotency` | non | propre | propre | propre |
| `GET /api/lottery/my-tickets` | `authenticate` | non | propre | propre | propre |
| `GET /api/lottery/wallet` | `authenticate` | non | propre | propre | propre |
| `POST /api/lottery/claim-prize` | `authenticate`, `idempotency` ; le contrat vérifie que l'appelant est le gagnant | non | propre | propre | propre |
| `POST /api/lottery/draw` | `authenticate`, `requireRoles('ADMIN')` | non | non | non | oui |
| `POST /api/lottery/refund` | `authenticate`, `requireRoles('ADMIN')` | non | non | non | oui |

### Boutique et partenaires

| Route | Contrôle | Anonyme | USER | PARTNER | ADMIN |
|---|---|---|---|---|---|
| `GET /api/marketplace/catalog` | Aucun | oui | oui | oui | oui |
| `GET /api/marketplace/rewards/:id` | Aucun | oui | oui | oui | oui |
| `GET /api/marketplace/points` | `authenticate` | non | propre | propre | propre |
| `POST /api/marketplace/claim` | `authenticate`, `idempotency` | non | propre | propre | propre |
| `GET /api/marketplace/my-codes` | `authenticate` | non | propre | propre | propre |
| `POST /api/marketplace/redeem` | `requireRoles('PARTNER', 'ADMIN')`, propriété du code | non | non | propre | oui |
| `GET /api/partners` | Aucun | oui | oui | oui | oui |
| `POST /api/partners` | `requireRoles('PARTNER', 'ADMIN')` | non | non | propre | oui |
| `POST /api/partners/offers` | `requireRoles('PARTNER', 'ADMIN')`, propriété de l'entreprise | non | non | propre | oui |
| `POST /api/partners/codes/upload` | `requireRoles('PARTNER', 'ADMIN')`, propriété de l'offre | non | non | propre | oui |
| `GET /api/partners/:partnerId/consumption` | `requireRoles('PARTNER', 'ADMIN')`, propriété de l'entreprise | non | non | propre | oui |

### Utilisateur et RGPD

| Route | Contrôle | Anonyme | USER | PARTNER | ADMIN |
|---|---|---|---|---|---|
| `GET /api/user/profile` | `authenticate` | non | propre | propre | propre |
| `GET /api/user/referrals` | `authenticate` | non | propre | propre | propre |
| `GET /api/user/quests` | `authenticate` | non | propre | propre | propre |
| `POST /api/user/quests/complete` | `authenticate` | non | propre | propre | propre |
| `PUT /api/user/responsible-limit` | `authenticate` | non | propre | propre | propre |
| `PUT /api/user/preferences` | `authenticate` | non | propre | propre | propre |
| `GET /api/user/notifications` | `authenticate` | non | propre | propre | propre |
| `GET /api/user/gdpr/export` | `authenticate` | non | propre | propre | propre |
| `POST /api/user/gdpr/delete-request` | `authenticate` | non | propre | propre | propre |
| `POST /api/user/gdpr/confirm-delete` | Jeton de suppression reçu par email (haché en base, valide 24 heures) | jeton | jeton | jeton | jeton |

Les routes « propres » de ce module n'acceptent aucun identifiant de compte en paramètre : elles utilisent toujours `req.user.userId`. Il n'existe donc pas de vecteur IDOR sur le profil ou l'export.

### Analytique, administration et webhooks

| Route | Contrôle | Anonyme | USER | PARTNER | ADMIN |
|---|---|---|---|---|---|
| `POST /api/analytics/track` | `optionalAuthenticate`, types `ADMIN_AUDIT`, `USER_SIGNUP` et `USER_LOGIN` refusés | oui | oui | oui | oui |
| `GET /api/analytics/dashboard` | `authenticate`, `requireRoles('ADMIN')` | non | non | non | oui |
| `GET /api/admin/dashboard` | `router.use(authenticate, requireRoles('ADMIN'))` | non | non | non | oui |
| `POST /api/admin/circuit-breaker` | idem, journalisé | non | non | non | oui |
| `POST /api/admin/treasury/withdraw` | idem, journalisé | non | non | non | oui |
| `PATCH /api/admin/partners/:partnerId/status` | idem, journalisé | non | non | non | oui |
| `GET /api/admin/reports/export` | idem, journalisé | non | non | non | oui |
| `GET /api/admin/audit-logs` | idem | non | non | non | oui |
| `POST /api/webhooks/blockchain` | Signature HMAC `x-webhook-signature` | signature | signature | signature | signature |

Toutes les routes ADMIN, y compris `/api/lottery/draw`, `/api/lottery/refund` et `/api/analytics/dashboard`, passent par `requireRoles('ADMIN')` et exigent donc la 2FA active sur le compte.

## Contrôles de propriété (IDOR partenaires)

Une entreprise partenaire appartient au compte qui l'a créée, par la colonne `Partner.ownerId` (clé étrangère vers `User`, `ON DELETE SET NULL`). Le rôle `PARTNER` ne suffit pas : chaque opération sur une entreprise, une offre ou un code vérifie la propriété.

```typescript
export const assertPartnerAccess = (
  partner: { ownerId?: string | null } | null | undefined,
  actor: PartnerActor
): void => {
  if (!partner) throw new AppError('Entreprise partenaire introuvable', 404);
  if (actor.role === 'ADMIN') return;
  if (!partner.ownerId || partner.ownerId !== actor.userId) {
    throw new AppError("Accès refusé : cette entreprise partenaire n'est pas rattachée à votre compte", 403);
  }
};
```

| Opération | Ressource vérifiée | Réponse en cas d'accès refusé |
|---|---|---|
| `createPartner` | Un PARTNER devient toujours propriétaire ; le champ `ownerId` du corps n'est pris en compte que pour un ADMIN | Sans objet |
| `createOffer` | Entreprise désignée par `partnerId` | 403 |
| `uploadPromoCodesBatch` | Entreprise de l'offre `rewardId` | 403 |
| `getPartnerConsumptionStats` | Entreprise `partnerId` | 403 |
| `validateAndRedeemStoreCode` | Entreprise de l'offre du code | **404** « Code promo introuvable », pour ne pas révéler l'existence d'un code appartenant à un autre commerçant |

Une entreprise sans propriétaire (`ownerId` nul, par exemple après la suppression du compte propriétaire) n'est plus accessible qu'aux administrateurs. Le test `empêche un partenaire d'agir sur l'entreprise d'un autre partenaire` de [`backend/__tests__/api/auth-security.test.ts`](src:backend/__tests__/api/auth-security.test.ts) couvre ces contrôles ; [`backend/__tests__/api/partners.test.ts`](src:backend/__tests__/api/partners.test.ts) et [`backend/__tests__/api/admin.test.ts`](src:backend/__tests__/api/admin.test.ts) complètent la couverture des rôles.

## Autres contrôles d'appartenance

| Ressource | Contrôle |
|---|---|
| Tickets, points, codes obtenus | Lus par `req.user.userId`, jamais par un identifiant fourni |
| Retrait de la cagnotte | Signé avec la clé du compte appelant ; `claimPrize` du contrat refuse tout autre que `round.winner` |
| Identifiants | UUID v7 générés par la base (`@default(uuid(7))`) : non séquentiels, mais leur début reflète l'horodatage |

## Limites connues

| Limite | Détail |
|---|---|
| Swagger exposé | `/api/docs` est servi sans authentification, y compris en production. La documentation ne contient pas de secret, mais elle facilite la reconnaissance. |
| Validation d'un code promo non atomique | `validateAndRedeemStoreCode` lit `isUsed` puis met à jour sans condition. Deux validations simultanées du même code peuvent toutes deux réussir. Une mise à jour conditionnelle (`updateMany` avec `isUsed: false`) fermerait cette fenêtre. |
| Rôle non relu hors `requireRoles` | Voir [Sessions](sessions.md#droits-relus-a-chaque-requete). |
| Pas de revue périodique des accès | Aucun outil ne liste les comptes ADMIN et PARTNER ; la revue se fait en base. |
