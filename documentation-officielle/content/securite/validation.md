# Validation des entrées

Toute donnée qui entre dans le backend par un corps de requête passe par un schéma Zod avant d'atteindre un contrôleur. Les sorties sensibles (emails HTML, exports CSV, journaux) sont neutralisées. Cette page décrit le mécanisme, les bornes appliquées et les zones qui échappent encore à la validation.

## Le middleware `validate`

[`backend/src/middlewares/validate.middleware.ts`](src:backend/src/middlewares/validate.middleware.ts) reçoit un schéma de forme `{ body, query, params }` et appelle `schema.parseAsync`.

| Cas | Réponse |
|---|---|
| Données valides | `req.body` est **remplacé** par la valeur analysée : champs inconnus retirés, valeurs converties (`z.coerce`), valeurs par défaut appliquées |
| Erreur Zod | 400 `Erreur de validation des données`, avec la liste `{ path, message }` |
| Autre erreur | Transmise au gestionnaire d'erreurs |

```json
{
  "success": false,
  "message": "Erreur de validation des données",
  "errors": [
    { "path": "body.walletAddress", "message": "Adresse de portefeuille invalide" }
  ]
}
```

Les objets Zod sont non stricts par défaut : un champ non déclaré n'est pas rejeté, il est retiré. C'est ce qui protège contre l'affectation de masse. Un client qui ajoute `"role": "ADMIN"` au corps de `/api/auth/login` n'a aucun effet, puisque `role` ne figure pas dans `socialLoginSchema`.

Seul `req.body` est réécrit. Les paramètres d'URL et de requête (`req.params`, `req.query`) peuvent être vérifiés par un schéma, mais le contrôleur lit toujours la valeur brute. Les schémas des routes de vérification d'identité de l'administration sont les seuls à déclarer `query` et `params` ; ailleurs, ces valeurs sont converties à la main dans les contrôleurs (voir [Limites connues](#limites-connues)).

## Schémas et bornes

Chaque module a son fichier `*.validators.ts`. Le tableau résume les règles de sécurité qu'ils imposent.

| Schéma | Fichier | Règles notables |
|---|---|---|
| `socialLoginSchema` | [`backend/src/api/auth/auth.validators.ts`](src:backend/src/api/auth/auth.validators.ts) | Adresse `^0x[0-9a-fA-F]{40}$` mise en minuscules ; email de 254 caractères au plus ; `isAdultConfirmed` doit valoir `true` ; `provider` et `ageGroup` en énumération ; code de parrainage 64 et UTM 100 caractères au plus |
| `signupSchema`, `resetPasswordSchema` | idem | Mot de passe de 10 à 128 caractères avec au moins une lettre et un chiffre (`passwordPolicy`) ; email de 254 caractères au plus, mis en minuscules ; `acceptTerms` doit valoir `true` à l'inscription ; code de réinitialisation de 6 chiffres |
| `signinSchema` | idem | Mot de passe de 1 à 128 caractères, refusé au-delà avec le message générique « Email ou mot de passe incorrect. » |
| `googleOAuthSchema`, `appleOAuthSchema` | idem | Jeton de 20 à 8 192 caractères ; nom Apple de 200 caractères au plus |
| `verify2FASchema`, `disable2FASchema` | idem | Code de 6 à 16 caractères `[0-9A-Za-z-]`, `userId` en UUID |
| `buyTicketSchema` | [`backend/src/api/lottery/lottery.validators.ts`](src:backend/src/api/lottery/lottery.validators.ts) | Quantité égale à 1 : « Un seul ticket par participant et par grand tirage. » |
| `giftTicketSchema` | idem | Email du bénéficiaire, message personnel de 250 caractères au plus |
| `claimPrizeSchema` | idem | Numéro de tour de 1 à 1 000 000 |
| `claimRewardSchema`, `usePromoCodeSchema` | [`backend/src/api/marketplace/marketplace.validators.ts`](src:backend/src/api/marketplace/marketplace.validators.ts) | UUID ; code promo de 4 à 64 caractères |
| `scratchTicketSchema` | idem | Offre `violet` ou `lucky` |
| `createPartnerSchema` | [`backend/src/api/partners/partners.validators.ts`](src:backend/src/api/partners/partners.validators.ts) | Nom de 2 à 100 caractères ; logo en URL **HTTPS** de 500 caractères au plus |
| `createRewardOfferSchema` | idem | Coût de 10 à 100 000 points, stock de 1 à 100 000, date ISO 8601 avec fuseau |
| `uploadCodesBatchSchema` | idem | Au plus 5 000 codes de 3 à 64 caractères, ou un CSV de 200 000 caractères au plus |
| `submitIdentitySchema` | [`backend/src/api/user/user.validators.ts`](src:backend/src/api/user/user.validators.ts) | Recto et verso obligatoires, chaînes de 16 caractères au moins et de la taille d'une image de 4 Mo encodée en base64 au plus |
| `setResponsibleGamingLimitSchema` | [`backend/src/api/user/user.validators.ts`](src:backend/src/api/user/user.validators.ts) | Limite entière de 1 à 500 tickets |
| `updatePreferencesSchema`, `completeSocialQuestSchema` | idem | Énumérations fermées |
| `confirmGdprDeletionSchema` | idem | Jeton de 10 à 128 caractères |
| `trackEventSchema` | [`backend/src/api/analytics/analytics.validators.ts`](src:backend/src/api/analytics/analytics.validators.ts) | Type `^[A-Za-z0-9_:.-]{2,64}$`, préfixes réservés refusés, au plus 20 métadonnées de types simples, chaînes de 200 caractères au plus |
| `circuitBreakerSchema`, `treasuryWithdrawalSchema` | [`backend/src/api/admin/admin.validators.ts`](src:backend/src/api/admin/admin.validators.ts) | Motif d'au moins 5 caractères ; adresse Ethereum ; montant positif plafonné à 1 000 ETH ; note de 500 caractères au plus |
| `listIdentityVerificationsSchema`, `identityDecisionSchema` | idem | Statut en énumération ; identifiant de demande en UUID ; décision booléenne ; motif de refus de 3 à 500 caractères obligatoire quand `approved` vaut `false` |
| `blockchainWebhookSchema` | [`backend/src/api/webhooks/webhooks.validators.ts`](src:backend/src/api/webhooks/webhooks.validators.ts) | Union discriminée sur `eventType` ; hash `^0x[0-9a-fA-F]{64}$` ; adresses vérifiées ; prix plafonné à 10 ETH |

Les variables d'environnement sont elles aussi validées par Zod au démarrage, dans [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) : le processus s'arrête si une valeur est invalide (voir [Cryptographie et secrets](cryptographie-secrets.md#secrets-refuses-en-production)).

### Pièces d'identité

Le schéma de `POST /api/user/identity` ne borne que la longueur. Le contenu est contrôlé ensuite par `decodeIdentityImage` de [`backend/src/utils/identity-image.util.ts`](src:backend/src/utils/identity-image.util.ts), pour le recto comme pour le verso :

| Contrôle | Refus |
|---|---|
| Préfixe `data:image/jpeg;base64,` ou `data:image/png;base64,` facultatif, puis base64 strict (longueur multiple de 4, alphabet standard) | 400 |
| Taille décodée de 4 Mo au plus | 413 « Image recto trop volumineuse : 4 Mo au plus. » |
| Taille décodée d'au moins 1 Ko | 400 |
| Signature binaire : `FF D8 FF` pour JPEG, `89 50 4E 47 0D 0A 1A 0A` pour PNG | 400, quel que soit le type déclaré dans le préfixe |

Le type déclaré par le client n'est jamais cru : seuls les premiers octets décident. Les images sont chiffrées dès la validation (voir [Cryptographie et secrets](cryptographie-secrets.md#chiffrement-aes-256-gcm)) et ne sont jamais écrites sur disque ni dans les journaux. Elles ne sont pas réencodées : les métadonnées EXIF d'une photo envoyée par un autre client que le mobile, qui demande `exif: false`, sont conservées jusqu'à l'effacement. Le test `refuse une image trop lourde, un format inconnu ou une face manquante` de [`backend/__tests__/api/identity.test.ts`](src:backend/__tests__/api/identity.test.ts) couvre ces règles.

### Le cas des événements analytiques

`POST /api/analytics/track` est ouvert aux anonymes. Sans contrôle, un client pourrait insérer de faux événements `ADMIN_AUDIT:...`, qui apparaîtraient dans le journal d'administration puisque celui-ci est stocké dans la même table. Le schéma refuse donc tout type commençant, sans tenir compte de la casse, par `ADMIN_AUDIT`, `USER_SIGNUP` ou `USER_LOGIN`. Le test `refuse les événements analytiques qui imitent le journal d'administration` le vérifie.

## Limites de taille

| Limite | Valeur | Où |
|---|---|---|
| Corps JSON | 1 Mo | `globalJsonParser` de [`backend/src/middlewares/body-parser.middleware.ts`](src:backend/src/middlewares/body-parser.middleware.ts), monté dans [`backend/src/app.ts`](src:backend/src/app.ts) |
| Corps JSON de `POST /api/user/identity` | 12 Mo, analysé seulement après `authenticate` et la limite de 10 envois par heure | `identityUploadJsonParser` |
| Corps URL-encodé | 1 Mo | `express.urlencoded` |
| Corps trop gros | 413 `Corps de requête trop volumineux` | [`backend/src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts) |
| JSON mal formé | 400 `Corps de requête JSON invalide` | idem |
| Pagination | 1 à 100 éléments par page | `getPaginationParams` de [`backend/src/utils/pagination.util.ts`](src:backend/src/utils/pagination.util.ts) |
| Message de chat | 280 caractères | [`backend/src/socket/events/chat.events.ts`](src:backend/src/socket/events/chat.events.ts) |
| Identifiant de requête entrant | `^[A-Za-z0-9._-]{8,128}$`, sinon remplacé | [`backend/src/middlewares/request-context.middleware.ts`](src:backend/src/middlewares/request-context.middleware.ts) |
| Corps sur le site de l'Office de Tourisme | 16 Ko, méthodes `GET` et `HEAD` seules | [`frontend-office-tourisme/docker/nginx.conf`](src:frontend-office-tourisme/docker/nginx.conf) |

## Injections

| Type | Situation |
|---|---|
| SQL | Toutes les requêtes passent par Prisma, qui paramètre les valeurs. La seule requête brute, `SELECT 1` du contrôle de santé, utilise la forme littérale balisée `` prisma.$queryRaw`...` `` sans aucune interpolation. |
| NoSQL et Redis | Les clés Redis sont construites à partir d'identifiants internes (UUID, `jti`) ou de valeurs validées ; aucune commande n'est construite à partir d'une chaîne fournie par le client. |
| Commandes système | Le backend n'exécute aucune commande système. |
| Chemins de fichier | Les modèles d'email sont choisis dans une liste fermée (`EmailTemplateName`). Le fichier POAP est filtré par l'expression `^(\d{1,9})\.json$` ou `.svg`. |
| Requêtes sortantes | Les seules URL appelées par le backend sont configurées par l'environnement (RPC, SMTP, S3). Le logo d'un partenaire est une URL HTTPS stockée, jamais téléchargée par le serveur. |

## Échappement des sorties

### Emails

[`backend/src/services/email.service.ts`](src:backend/src/services/email.service.ts) remplace chaque `{{VARIABLE}}` des modèles HTML par sa valeur échappée :

```typescript
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char
  );
```

Un message personnel de cadeau contenant `<script>` arrive donc sous forme de texte dans la boîte du destinataire. Les modèles sont dans [`backend/src/templates/emails`](src:backend/src/templates/emails).

### Exports CSV

L'export comptable (`GET /api/admin/reports/export`) passe chaque cellule par `neutralizeSpreadsheetCell` de [`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) :

- la cellule est entourée de guillemets doubles et ses guillemets internes sont doublés ;
- si elle commence par `=`, `+`, `-`, `@`, une tabulation ou un retour chariot, une apostrophe est ajoutée devant pour qu'un tableur ne l'interprète pas comme une formule.

### Journaux

Les adresses email sont masquées par `maskEmail` (`j***@domaine`) dans les journaux d'envoi. Aucun code, jeton ou secret n'est journalisé. Les erreurs non gérées renvoient en production le message générique `Erreur interne du serveur` et l'identifiant `requestId`, sans trace technique.

### Frontends

Le web (React) et le mobile (React Native) affichent les données comme du texte. Le code ne contient aucun appel à `dangerouslySetInnerHTML` sur une donnée reçue de l'API. Le site de l'Office de Tourisme est traité dans [Navigateur et mobile](navigateur-mobile.md).

## Limites connues

| Limite | Détail |
|---|---|
| Paramètres de requête non bornés | `GET /api/lottery/leaderboard?limit=` est public et transmet `Number(req.query.limit)` (20 par défaut) à Prisma sans plafond. Une valeur très grande déclenche une requête lourde. `GET /api/admin/audit-logs?limit=` a le même défaut, réservé aux administrateurs. |
| Événements Socket.IO | `chat:send` et `chat:react` ne passent pas par Zod. `chat:react` appelle `emoji.slice(0, 8)` sans vérifier le type : une valeur non textuelle lève une exception dans le gestionnaire. Le champ `emoji` de `chat:send` n'est pas borné. |
| Motif du disjoncteur | `reason` a une longueur minimale mais pas de maximum (le corps reste limité à 1 Mo). |
| Modèle d'email de secours | Si un fichier de modèle manque, `loadTemplate` renvoie `JSON.stringify(variables)` dans un paragraphe HTML **sans échappement**. Ce cas ne se produit pas avec les modèles livrés. |
| En-tête `Host` | Les métadonnées POAP construisent leur URL à partir de `req.get('host')` et sont mises en cache `immutable`. Derrière un proxy qui ne réécrit pas l'en-tête, un client peut faire apparaître un autre domaine dans la réponse. |

Ces points figurent dans la synthèse des [audits](audits.md). Pour ajouter un schéma à une nouvelle route, suivre le guide [Ajouter un endpoint](../guides/ajouter-endpoint.md).
