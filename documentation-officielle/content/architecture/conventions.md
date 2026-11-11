# Conventions de code

Cette page décrit les conventions telles qu'elles sont appliquées dans le code et dans les fichiers de configuration du dépôt. Elle ne prescrit rien qui ne soit déjà observable. Les règles de contribution (branches, revues, commits) sont dans [Standards de code](../contribuer/standards.md) et [Workflow Git](../contribuer/workflow-git.md). Les conventions de nommage des fichiers et des identifiants sont dans [Organisation du dépôt](organisation-depot.md#conventions-de-nommage).

## Mise en forme

| Règle | Source | Portée |
|---|---|---|
| UTF-8, fins de ligne LF, indentation de 2 espaces, ligne finale, pas d'espaces en fin de ligne (sauf Markdown) | [`.editorconfig`](src:.editorconfig) | Tout le dépôt |
| Scripts shell forcés en LF | [`.gitattributes`](src:.gitattributes) | `*.sh` |
| Guillemets simples, largeur de 100 caractères | [`mobile-app/.prettierrc`](src:mobile-app/.prettierrc) | Application mobile : `eslint-config-universe` active la règle `prettier/prettier` en avertissement lors de `npm run lint` |

Le backend et le frontend web n'ont pas de configuration Prettier ni de commande de formatage. Le style y est néanmoins homogène : guillemets simples, points-virgules, virgules finales dans les listes et objets multilignes. Les fichiers Solidity sont indentés de 4 espaces, contrairement à la règle de `.editorconfig`, et utilisent des guillemets doubles.

## TypeScript

Tous les projets TypeScript sont en mode `strict`.

| Projet | Fichier | Options notables |
|---|---|---|
| Backend | [`backend/tsconfig.json`](src:backend/tsconfig.json) | `strict`, `noUncheckedIndexedAccess` (un accès indexé est de type `T \| undefined`), `exactOptionalPropertyTypes` (une propriété facultative ne reçoit pas `undefined` explicitement), sortie `CommonJS` en `ES2022`, `resolveJsonModule` pour importer les ABI |
| Backend, build | [`backend/tsconfig.build.json`](src:backend/tsconfig.build.json) | Hérite du précédent, compile `src/` seul, sans les tests |
| Web | [`frontend-web/tsconfig.json`](src:frontend-web/tsconfig.json) | `strict`, `isolatedModules`, alias `@/*` vers `./src/*`, `noEmit` (Next.js compile) |
| Mobile | [`mobile-app/tsconfig.json`](src:mobile-app/tsconfig.json) | Hérite de `expo/tsconfig.base`, `strict`, `noEmit` |
| Contrats | [`smart-contract/tsconfig.json`](src:smart-contract/tsconfig.json) | Scripts et tests Hardhat en modules ES |

Conséquences visibles dans le code :

- `exactOptionalPropertyTypes` explique les écritures conditionnelles comme `...(data.email ? { email: data.email } : {})` dans [`backend/src/api/auth/auth.repo.ts`](src:backend/src/api/auth/auth.repo.ts), au lieu de passer `email: undefined`.
- `noUncheckedIndexedAccess` impose de vérifier les éléments de tableau : `const purchase = purchases[0]; if (!purchase) throw ...` dans [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts).
- Le type `any` est autorisé par les trois configurations ESLint. Il apparaît surtout pour passer le client ioredis à BullMQ (`connection: rawRedis as any`) et pour les métadonnées JSON de Prisma.

## ESLint

| Projet | Configuration | Règles ajoutées ou modifiées |
|---|---|---|
| Backend | [`backend/eslint.config.mjs`](src:backend/eslint.config.mjs), format plat, `@eslint/js` et `typescript-eslint` recommandés | `@typescript-eslint/no-floating-promises` en erreur avec analyse typée ; `no-misused-promises` sans `checksVoidReturn` ; `no-explicit-any` désactivée ; `no-unused-vars` en erreur sauf pour les noms commençant par `_` ; `no-empty` qui autorise un `catch` vide |
| Web | [`frontend-web/eslint.config.mjs`](src:frontend-web/eslint.config.mjs), `eslint-config-next/core-web-vitals` et `eslint-config-next/typescript` | `@next/next/no-img-element` désactivée |
| Mobile | [`mobile-app/.eslintrc.js`](src:mobile-app/.eslintrc.js), format historique d'ESLint 8, `universe/native` et `universe/shared/typescript-analysis` | `no-explicit-any` désactivée, dossier `__tests__/` ignoré |
| Contrats | [`smart-contract/.solhint.json`](src:smart-contract/.solhint.json), `solhint:recommended` | `compiler-version ^0.8.28`, `no-global-import` et `gas-custom-errors` en erreur, `use-natspec` et `reason-string` désactivées, zéro avertissement toléré (`--max-warnings 0`) |

La règle `no-floating-promises` impose que toute promesse soit attendue ou explicitement ignorée par `void`. D'où les appels comme `void lotteryIndexer.syncOnce()` dans [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts) ou `void redis.set(...)` dans [`backend/src/middlewares/idempotency.middleware.ts`](src:backend/src/middlewares/idempotency.middleware.ts). Une promesse lancée volontairement sans attente porte un `.catch` qui journalise, comme `walletService.grantWelcomeEthers(user).catch(...)` dans [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts).

## Absence de commentaires

Le code livré ne contient pas de commentaires explicatifs : c'est une règle de [`CONTRIBUTING.md`](src:CONTRIBUTING.md), et elle est respectée. Les noms de fonctions, de variables et de tests portent l'intention. Les seules exceptions observées sont fonctionnelles :

| Exception | Où | Raison |
|---|---|---|
| Blocs `/** @openapi ... */` | Fichiers `*.routes.ts` du backend | Lus par `swagger-jsdoc` pour générer `/api/docs` ([`backend/src/config/swagger.config.ts`](src:backend/src/config/swagger.config.ts)) |
| `// SPDX-License-Identifier: MIT` | Première ligne de chaque fichier Solidity | Exigée par le compilateur |
| `-- CreateTable`, `-- AlterTable`, etc. | Fichiers `migration.sql` | Générés par Prisma Migrate |

Les contrats n'ont pas de NatSpec (`use-natspec` désactivée). Leur documentation est dans [Référence de BlockLucky](../smart-contracts/reference-blocklucky.md).

> [!NOTE]
> Le frontend web et l'application mobile contiennent 16 expressions JSX vides `{}` seules sur leur ligne, par exemple dans [`frontend-web/src/app/connexion/page.tsx`](src:frontend-web/src/app/connexion/page.tsx). Ce sont les restes de commentaires JSX supprimés. Elles n'ont aucun effet et peuvent être retirées.

## Découpage du backend

Chaque domaine de [`backend/src/api/`](src:backend/src/api/) suit le même découpage en cinq fichiers. Le module `lottery` sert d'exemple.

| Fichier | Responsabilité | Ce qu'il ne fait pas |
|---|---|---|
| `lottery.routes.ts` | Crée un `Router`, enchaîne les middlewares et appelle une méthode du controller par une fonction fléchée `(req, res, next) => controller.methode(req, res, next)` | Aucune logique |
| `lottery.validators.ts` | Exporte des schémas Zod `z.object({ body, query, params })` nommés `<action>Schema` | Aucun accès aux données |
| `lottery.controllers.ts` | Classe `LotteryController` : lit `req.user`, `req.body`, `req.query`, appelle le service, répond par `sendSuccess` | Aucun accès direct à Prisma |
| `lottery.services.ts` | Classe `LotteryService` : règles métier, orchestration des repositories, des services transverses et de la passerelle blockchain, lève des `AppError` | Aucune connaissance de `req` ou `res` |
| `lottery.repo.ts` | Classe `LotteryRepository` : requêtes Prisma uniquement | Aucune règle métier |

Exemple de chaîne complète tiré de [`backend/src/api/lottery/lottery.routes.ts`](src:backend/src/api/lottery/lottery.routes.ts) :

```typescript
router.post(
  '/buy',
  authenticate,
  idempotency,
  validate(buyTicketSchema),
  (req, res, next) => lotteryController.buyTicket(req, res, next)
);
```

Et le controller correspondant, dans [`backend/src/api/lottery/lottery.controllers.ts`](src:backend/src/api/lottery/lottery.controllers.ts) :

```typescript
public async buyTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentification requise', 401);
    const result = await lotteryService.buyTickets(userId, req.body);
    sendSuccess(res, result, 'Ticket acheté avec succès', 201);
  } catch (error) {
    next(error);
  }
}
```

Chaque fichier de couche se termine par l'export d'une instance unique, nommée et par défaut :

```typescript
export const lotteryController = new LotteryController();
export default lotteryController;
```

Les modules importent ces instances par leur export par défaut (`import lotteryService from './lottery.services'`). Le même modèle s'applique aux services transverses de [`backend/src/services/`](src:backend/src/services/) et aux composants de [`backend/src/blockchain/`](src:backend/src/blockchain/). Les modules `system` et `webhooks` sont plus courts : pas de repository, et `system` n'a pas de controller.

L'ordre des middlewares dans une route est constant : `authenticate`, `requireRoles(...)`, `idempotency`, `validate(schema)`. Un routeur entièrement réservé à un rôle applique les deux premiers une fois pour toutes, comme `router.use(authenticate, requireRoles('ADMIN'))` dans [`backend/src/api/admin/admin.routes.ts`](src:backend/src/api/admin/admin.routes.ts).

## Réponses et erreurs

### Réponse de succès

`sendSuccess(res, data, message, statusCode, meta)` ([`backend/src/utils/response.util.ts`](src:backend/src/utils/response.util.ts)) produit toujours la même enveloppe, typée par `ApiResponse` ([`backend/src/types/api.types.ts`](src:backend/src/types/api.types.ts)) :

```json
{
  "success": true,
  "message": "Ticket acheté avec succès",
  "data": { "tickets": [], "pointsAwarded": 50 },
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

`data` et `meta` sont omis quand ils sont absents. `meta` est construit par `buildPaginationMeta` ([`backend/src/utils/pagination.util.ts`](src:backend/src/utils/pagination.util.ts)) pour les listes paginées. Le message est une phrase en français destinée à l'utilisateur. Le statut par défaut est 200 ; les créations répondent 201.

Les exceptions à l'enveloppe sont les sondes (`/health/*`), `/api/config` (qui construit l'enveloppe à la main), `/metrics` et les métadonnées POAP (`/lottery/poap/:file`), qui doivent respecter le format ERC-721.

### Réponse d'erreur

Une erreur métier est levée par `throw new AppError(message, statusCode, details)`. Le statut par défaut est 400. `details` est facultatif et sert à transmettre des informations exploitables par les clients, comme `{ canRetry: true }` ou `{ contractError: 'RoundSoldOut' }`.

`errorHandler` ([`backend/src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts)) transforme toute erreur en réponse par `sendError` :

```json
{
  "success": false,
  "message": "Tous les tickets de ce tour ont été vendus.",
  "errors": { "contractError": "RoundSoldOut" }
}
```

| Erreur reçue | Réponse |
|---|---|
| `AppError` | Son statut, son message, `details` dans `errors` |
| JSON mal formé, corps trop gros | 400, 413 |
| Code Prisma ou PostgreSQL connu (`P2002`, `23505`, `23514`, `40001`, `57014`, etc.) | 404, 409 ou 503 avec un message générique |
| Toute autre erreur | 500, message masqué en production, `requestId` dans `errors` |

Les middlewares qui refusent une requête (`authenticate`, `requireRoles`, `validate`, `idempotency`) appellent `sendError` directement sans lever d'exception. Le détail complet est dans [Réponses et erreurs](../backend/reponses-erreurs.md).

## Nommage dans le code

| Élément | Convention | Exemples |
|---|---|---|
| Fonctions, méthodes, variables | camelCase, verbe pour les actions | `buyTickets`, `ensureWallet`, `recordFailure`, `syncOnce` |
| Booléens | Préfixe `is` ou `has` | `isOnchain`, `isTwoFactorEnabled`, `hasPending`, `isUniqueViolation` |
| Classes, interfaces, types | PascalCase, sans préfixe `I` | `LotteryGateway`, `IndexedPurchase`, `ChainActionJob`, `OnchainRound` |
| Constantes de module | Majuscules et tirets bas | `POINTS_PER_TICKET`, `MAX_BLOCK_RANGE`, `CACHE_COMMAND_TIMEOUT_MS`, `LOCK_KEY` |
| Unités dans le nom | Suffixe explicite | `KEEPER_INTERVAL_MS`, `GRANT_LOCK_TTL_SECONDS`, `ticketPriceWei`, `walletBalanceEth` |
| Types d'action et statuts | Chaînes en majuscules | `'TICKET_PURCHASE'`, `'CLAIM_PRIZE'`, `'MINT_PENDING'` |
| Contrats Solidity | Erreurs personnalisées et événements en PascalCase, rôles en majuscules | `RoundSoldOut`, `TicketsPurchased`, `OPERATOR_ROLE` |

Un seul écart a été relevé : la méthode `CancelAndAutoRefundRound` de [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts) commence par une majuscule.

Les noms du code sont en anglais ; les messages destinés aux utilisateurs, les journaux et les segments d'URL du frontend web sont en français.

## Autres pratiques observées

- **Configuration.** Aucun fichier de `backend/src/` ne lit `process.env` en dehors de [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts). Tout passe par l'objet `env` validé par Zod. Côté clients, les variables publiques sont lues dans [`frontend-web/src/lib/config.ts`](src:frontend-web/src/lib/config.ts) et [`mobile-app/src/services/api.client.ts`](src:mobile-app/src/services/api.client.ts).
- **Délais.** Chaque appel sortant a un délai : RPC 15 s ([`backend/src/blockchain/chain.client.ts`](src:backend/src/blockchain/chain.client.ts)), SMTP 10 s pour la connexion et 20 s pour la socket ([`backend/src/config/mailer.config.ts`](src:backend/src/config/mailer.config.ts)), S3 3 s et 10 s, Redis 500 ms, requêtes PostgreSQL `DB_STATEMENT_TIMEOUT_MS` (15 s), clients HTTP web et mobile 15 s.
- **Journaux.** Le backend n'utilise jamais `console` : tout passe par le logger winston de [`backend/src/utils/logger.util.ts`](src:backend/src/utils/logger.util.ts), qui ajoute `requestId` et `userId` depuis le contexte de requête et écrit en JSON hors développement.
- **`catch` vides.** Ils sont autorisés par ESLint et utilisés pour les replis volontaires, par exemple la bascule vers la mémoire locale dans [`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts) ou la bascule vers l'envoi direct dans [`backend/src/queues/emails.queue.ts`](src:backend/src/queues/emails.queue.ts).
- **Montants.** Les montants en ethers circulent en `bigint` de wei dans le code blockchain et sont convertis par `formatEther` seulement pour l'affichage ou la base (`prizePool` en ETH).
- **Adresses.** Les adresses Ethereum sont toujours stockées et comparées en minuscules (`toLowerCase()`).
