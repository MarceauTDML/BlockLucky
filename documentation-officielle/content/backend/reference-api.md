# Référence de l'API

Cette page liste toutes les routes HTTP du backend. Le tableau est généré à la construction de la documentation en lisant [`backend/src/app.ts`](src:backend/src/app.ts) et chaque fichier `*.routes.ts` : méthode, chemin complet, accès requis, middlewares de contrôle et résumé OpenAPI. Les règles métier, les corps de requête et les erreurs de chaque route sont détaillés dans les pages [Modules métier](modules/index.md).

## Swagger UI

Le serveur publie une interface Swagger sur `/api/docs`, par exemple `http://localhost:2053/api/docs` en local. La spécification OpenAPI 3.0 est construite au démarrage par `swagger-jsdoc` à partir des blocs `@openapi` placés au-dessus de chaque route ([`backend/src/config/swagger.config.ts`](src:backend/src/config/swagger.config.ts)). Elle lit les fichiers `src/api/**/*.routes.ts` en développement et `dist/src/api/**/*.routes.js` après compilation.

| Élément | Valeur |
|---|---|
| Titre | `BlockLucky EtherBay API`, version `1.0.0` |
| Serveur déclaré | `http://localhost:<PORT>` uniquement |
| Sécurité | schéma `bearerAuth` (HTTP, `bearer`, format JWT) appliqué par défaut à toutes les opérations |
| Chemins documentés | sous le préfixe `/api/...` non versionné |

Les blocs OpenAPI ne contiennent qu'une étiquette et un résumé : ni paramètres, ni corps, ni réponses. Swagger UI sert donc d'index cliquable et de console pour envoyer une requête avec un jeton (bouton `Authorize`), pas de contrat d'interface. La route `/api/docs` est servie dans tous les environnements, production comprise, et passe par le rate limiting global.

## Préfixes

| Préfixe | Usage |
|---|---|
| `/api/v1/...` | préfixe recommandé pour tout nouveau client |
| `/api/...` | même routeur, monté une seconde fois pour compatibilité ; c'est celui qu'utilisent aujourd'hui le web (`NEXT_PUBLIC_API_URL=http://localhost:2053/api` dans la stack Docker) et les blocs OpenAPI |
| racine | sondes `/health*`, `/api/config` et `/metrics`, hors routeur versionné |

Les deux préfixes partagent les mêmes compteurs de rate limiting et les mêmes clés d'idempotence par utilisateur, mais pas le même chemin : une clé d'idempotence utilisée sur `/api/lottery/buy` n'est pas reconnue sur `/api/v1/lottery/buy`.

## Authentification

Les routes protégées attendent un jeton de session dans l'en-tête `Authorization` :

```http
GET /api/v1/user/profile HTTP/1.1
Host: localhost:2053
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMTlhN2MzZS...
```

Le jeton s'obtient par `POST /auth/login` puis `POST /auth/2fa/verify` (voir [Authentification](modules/auth.md)). Il n'y a ni cookie de session, ni jeton de rafraîchissement : à l'expiration (12 heures par défaut), le client doit se reconnecter. Le préfixe `Bearer ` est sensible à la casse.

| Colonne « Accès » du tableau | Signification |
|---|---|
| `public` | aucun jeton requis ; certaines routes l'exploitent s'il est fourni (`optionalAuthenticate`) |
| `connecté` | `authenticate` : jeton valide et non révoqué |
| `rôle ...` | `authenticate` puis `requireRoles(...)` : rôle vérifié dans le jeton et relu en base |

## Idempotence

Cinq routes acceptent l'en-tête `Idempotency-Key` : `POST /lottery/buy`, `POST /lottery/gift`, `POST /lottery/claim-prize`, `POST /marketplace/claim` et `POST /marketplace/scratch`. Le middleware [`backend/src/middlewares/idempotency.middleware.ts`](src:backend/src/middlewares/idempotency.middleware.ts) protège contre le double clic et les nouvelles tentatives réseau d'une opération qui dépense des ethers ou des points.

```http
POST /api/v1/lottery/buy HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
Idempotency-Key: 6b0f3c2e-9d41-4a7e-b5a8-1c2d3e4f5a6b

{"quantity":1}
```

| Règle | Détail |
|---|---|
| Format | 8 à 128 caractères `[A-Za-z0-9_-]`, sinon `400 En-tête Idempotency-Key invalide` |
| Portée | clé Redis `idempotency:<userId>:<méthode>:<chemin>:<clé>` : propre à l'utilisateur, à la méthode et au chemin exact |
| Première requête | verrou `__pending__` posé pour 60 secondes, puis la réponse est mémorisée 24 heures si son statut est inférieur à 500 |
| Requête identique en cours | `409 Une requête identique est déjà en cours de traitement` avec `Retry-After: 1` |
| Requête rejouée | réponse d'origine, même statut et même corps, avec l'en-tête `Idempotent-Replayed: true` |
| Réponse 5xx | la clé est effacée : la requête peut être retentée avec la même clé |
| Sans en-tête | aucun contrôle |

Le corps de la requête ne fait pas partie de la clé : la même clé avec un autre corps rejoue la première réponse. Une erreur 400 ou 409 est mémorisée comme un succès ; après une erreur de validation, il faut une nouvelle clé. Sans Redis, les clés sont gardées dans la mémoire du process et ne protègent plus contre un rejeu reçu par une autre instance.

## Limites de débit

| Limiteur | Portée | Limite |
|---|---|---|
| `globalRateLimiter` | toutes les routes après la maintenance, sauf sondes, `/api/config` et `/metrics` | 300 requêtes par 15 minutes et par IP |
| `authRateLimiter` | `/auth/login`, `/signup`, `/signin`, `/password/forgot`, `/password/reset`, `/password/change`, `/email/change`, `/email/confirm`, `/oauth/google`, `/2fa/verify`, `/2fa/disable` | 30 requêtes par 10 minutes et par IP pour l'ensemble de ces routes, en plus de la limite globale |
| `identityUploadRateLimiter` | `POST /user/identity` | 10 requêtes par heure et par IP, en plus de la limite globale |
| `supportRateLimiter` | `POST /user/support` | 5 messages par heure et par compte (par IP à défaut), en plus de la limite globale |

Les réponses portent les en-têtes `RateLimit` et `RateLimit-Policy` (format draft-7 de l'IETF), exposés aux navigateurs par CORS. Au-delà de la limite, la réponse est un `429` au format habituel, par exemple `{ "success": false, "message": "Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard." }`. Les compteurs sont dans Redis (`ratelimit:global:`, `ratelimit:auth:`, `ratelimit:identity:` et `ratelimit:support:`) ; si Redis répond en erreur, la requête passe (`passOnStoreError`). Derrière un proxy, `TRUST_PROXY` doit être réglé, sinon tous les clients partagent l'IP du proxy.

## Corps et formats

Les corps sont en JSON (`Content-Type: application/json`) ou en formulaire URL-encodé, 1 Mo au plus, sauf `POST /user/identity`, qui accepte 12 Mo de JSON pour les deux photos encodées en base64. Un JSON mal formé renvoie `400 Corps de requête JSON invalide`, un corps trop gros `413 Corps de requête trop volumineux`. Les réponses suivent le format décrit dans [Réponses et erreurs](reponses-erreurs.md), sauf trois exceptions : les sondes `/health*`, les métadonnées POAP `GET /lottery/poap/:file` et `/metrics`.

## Lire les résumés OpenAPI

La colonne « Résumé » du tableau reprend le `summary` du bloc `@openapi` placé au-dessus de chaque route, celui qu'affiche aussi Swagger. Les résumés ont été alignés sur le comportement réel du code. Quelques nuances ne tiennent pas dans une ligne : elles sont détaillées dans les pages de modules.

| Route | Nuance |
|---|---|
| `POST /auth/login` | La déclaration de majorité est déclarative ; l'achat exige en plus la vérification d'âge par pièce d'identité. |
| `POST /auth/2fa/verify` | Un code d'application n'est accepté qu'avec le `loginTicket` reçu après le premier facteur ou avec une session du compte. |
| `POST /auth/oauth/google` | Répond 503 tant que `GOOGLE_CLIENT_IDS` est vide, ce qui est le cas par défaut. |
| `POST /lottery/gift` | Le destinataire est désigné par son email, mais aucun email ne lui est envoyé ; seul l'âge de l'expéditeur est vérifié. |
| `POST /lottery/refund` | En mode simulé, seul le statut du tour change ; le remboursement réel n'existe qu'en mode onchain. |
| `GET /lottery/my-tickets` | En mode simulé, les badges POAP sont fictifs. |
| `POST /partners/offers` | La date d'expiration est enregistrée dans Redis mais n'est jamais appliquée. |
| `GET /user/notifications` | Les trois notifications renvoyées sont codées en dur. |
| `GET /analytics/dashboard` | En l'absence de données, la répartition par âge affichée est fictive. |
| `POST /admin/treasury/withdraw` | Le montant `amountEth` envoyé est ignoré : toute la commission accumulée est versée. |
| `GET /admin/reports/export` | Le format `pdf` produit en réalité un fichier JSON. |

## Routes

{{generated:reference-api}}
