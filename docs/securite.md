# Sécurité

Mesures appliquées dans le dépôt. Chaque mesure est vérifiée par un test automatisé, la CI ou une configuration versionnée, indiqués dans la colonne Preuve.

## Authentification

| Mesure | Détail | Preuve |
|---|---|---|
| Connexion sans mot de passe par code email | Code à 6 chiffres (CSPRNG), stocké sous forme de HMAC-SHA-256 dans Redis, valide 10 minutes, usage unique, invalidé après 5 essais. Obligatoire en production (`LOGIN_EMAIL_CODE_REQUIRED`). | `__tests__/api/auth-security.test.ts` |
| Compte créé après vérification de l'email | Une inscription n'existe qu'une fois le code vérifié : pas de points de bienvenue ni de parrainage sur une adresse non prouvée. `isEmailVerified` passe à vrai. | `auth-security.test.ts` |
| Blocage par compte | 10 codes erronés en une heure bloquent la vérification du compte pendant une heure (indépendamment de l'IP). Les tentatives sont aussi limitées par IP (30 / 10 min). | `src/services/otp-challenge.service.ts` |
| Double authentification TOTP | RFC 6238, secret de 160 bits chiffré en AES-256-GCM, tolérance ±1 pas, comparaison en temps constant, code refusé s'il a déjà servi. | `auth-security.test.ts` |
| Codes de secours | 10 codes de 10 caractères (50 bits), hachés en SHA-256, usage unique, affichés une seule fois, alerte email à chaque utilisation. Ils ne sont plus envoyés par email. | `auth-security.test.ts` |
| Double authentification obligatoire pour les administrateurs | Toute route réservée à l'ADMIN renvoie 403 tant que la 2FA n'est pas activée sur le compte (`ADMIN_MFA_REQUIRED`, obligatoire en production). | `auth-security.test.ts` |
| Ré-authentification avant action sensible | La désactivation de la 2FA exige un code valide ou une connexion de moins de 15 minutes. | `auth-security.test.ts` |
| Notifications de sécurité | Email à l'activation ou la désactivation de la 2FA et à l'utilisation d'un code de secours. | `src/templates/emails/security-alert.html` |

## Sessions et jetons

| Mesure | Détail |
|---|---|
| JWT signés et vérifiés strictement | Algorithme imposé (HS256, émetteur égal au vérificateur), `iss`, `aud`, `exp` et `jti` vérifiés, tolérance d'horloge de 30 s. Un jeton sans émetteur ou signé autrement est refusé. |
| Durée limitée | 12 heures par défaut (`JWT_EXPIRES_IN`). |
| Révocation | `POST /api/auth/logout` révoque la session courante (liste de révocation Redis jusqu'à l'expiration), `allDevices: true` révoque toutes les sessions du compte. Les sessions sont aussi révoquées à l'activation de la 2FA et à la suppression RGPD. Le web et le mobile appellent cet endpoint à la déconnexion. |
| Droits relus à chaque requête | Le rôle du jeton est comparé au rôle en base : un compte rétrogradé ou supprimé perd ses accès immédiatement. |
| Stockage mobile | Jeton dans le Keychain / Keystore (`expo-secure-store`, accessible uniquement appareil déverrouillé), effacé avec le profil à la déconnexion. |

Limite connue : sur le web, le jeton est conservé dans `localStorage` (voir la liste des points non traités dans le rapport d'audit).

## Matrice des droits

| Ressource | Anonyme | USER | PARTNER | ADMIN (2FA obligatoire) |
|---|---|---|---|---|
| `GET /health`, `/health/live`, `/health/ready`, `/api/config` | oui | oui | oui | oui |
| `GET /health/deep`, `/metrics` (détail) | jeton `METRICS_TOKEN` | jeton | jeton | jeton |
| `POST /api/auth/login`, `/api/auth/2fa/verify`, `GET /api/auth/onboarding` | oui | oui | oui | oui |
| `POST /api/auth/2fa/setup`, `/2fa/disable`, `/logout` | non | oui | oui | oui |
| `GET /api/lottery/status`, `/transparency-charter`, `/leaderboard` | oui | oui | oui | oui |
| `POST /api/lottery/buy`, `/gift`, `GET /my-tickets` | non | oui | oui | oui |
| `POST /api/lottery/draw`, `/refund` | non | non | non | oui |
| `GET /api/marketplace/catalog`, `/rewards/:id`, `GET /api/partners` | oui | oui | oui | oui |
| `GET /api/marketplace/points`, `POST /claim`, `GET /my-codes` | non | oui | oui | oui |
| `POST /api/marketplace/redeem` | non | non | codes de ses entreprises | oui |
| `POST /api/partners`, `/offers`, `/codes/upload`, `GET /:id/consumption` | non | non | ses entreprises uniquement | oui |
| `/api/user/*` (profil, RGPD, préférences) | non | son compte | son compte | son compte |
| `POST /api/user/gdpr/confirm-delete` | jeton reçu par email | idem | idem | idem |
| `POST /api/analytics/track` | oui (types réservés refusés) | oui | oui | oui |
| `GET /api/analytics/dashboard`, `/api/admin/*` | non | non | non | oui |
| `POST /api/webhooks/blockchain` | signature HMAC | idem | idem | idem |

Une entreprise partenaire appartient au compte PARTNER qui l'a créée (`Partner.ownerId`). Un partenaire qui tente d'agir sur l'entreprise d'un autre reçoit 403 (404 pour la validation d'un code promo, pour ne pas révéler son existence).

## Entrées, sorties et API

- Validation Zod de chaque corps de requête, avec bornes de longueur et formats (adresses Ethereum, emails, montants plafonnés, listes de codes limitées à 5 000).
- Corps JSON limité à 1 Mo, en-têtes `RateLimit` partagés dans Redis, `Idempotency-Key` sur l'achat et l'échange.
- Webhook blockchain : signature `x-webhook-signature: t=<timestamp>,v1=<HMAC-SHA-256(secret, "t.corps brut")>`, horodatage accepté pendant 5 minutes, rejeu ignoré pendant 7 jours, corps validé par schéma.
- Export CSV : chaque cellule est encadrée de guillemets et neutralisée si elle commence par `=`, `+`, `-`, `@`, tabulation ou retour chariot.
- Templates d'email : toutes les variables sont échappées en HTML.
- Erreurs : message générique et `requestId` en production, sans trace technique.
- Événements analytiques : types réservés au serveur (`ADMIN_AUDIT`, `USER_LOGIN`, `USER_SIGNUP`) refusés, métadonnées limitées à 20 valeurs simples.
- Logs : adresses email masquées (`j***@domaine`), aucun code, jeton ou secret journalisé.

## Navigateur

| En-tête | Frontend web | Office de Tourisme |
|---|---|---|
| Content-Security-Policy | En production : `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `connect-src` limité à l'API | Stricte : `script-src 'self'` sans `unsafe-inline` |
| Strict-Transport-Security | 2 ans, sous-domaines inclus | 2 ans, sous-domaines inclus |
| X-Frame-Options, X-Content-Type-Options, Referrer-Policy | oui | oui |
| Permissions-Policy | caméra, micro, géolocalisation, paiement, USB désactivés | idem |
| Cross-Origin-Opener-Policy | `same-origin` | `same-origin` (+ CORP) |

Le site de l'Office de Tourisme héberge ses polices : aucune requête vers Google Fonts.

## Infrastructure et chaîne logicielle

- Conteneurs non root, système de fichiers en lecture seule, aucune capability Linux, `no-new-privileges`.
- PostgreSQL, Redis et Mailpit exposés uniquement sur `127.0.0.1` en local.
- CI : gitleaks sur tout l'historique, `npm audit` bloquant sur les vulnérabilités hautes et critiques, Trivy sur les trois images, CodeQL (`security-extended`), recherche de secrets et de source maps dans le bundle web.
- Actions GitHub épinglées par SHA de commit complet, jeton GitHub en lecture seule, checkout sans persistance des identifiants.
- Dependabot hebdomadaire avec un délai de 5 jours avant d'adopter une nouvelle version.
