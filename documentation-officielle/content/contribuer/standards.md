# Standards de code

Ces règles s'appliquent à tout le code livré dans le dépôt. Une partie est vérifiée automatiquement (TypeScript strict, ESLint, solhint, synchronisation de `.env.example`), le reste relève de la revue. Les conventions d'organisation propres à chaque projet (découpage en modules, nommage des fichiers) sont détaillées dans [Conventions de code](../architecture/conventions.md).

## Règles communes

| Règle | Portée | Vérification |
| --- | --- | --- |
| TypeScript en mode `strict` | backend, frontend web, mobile, scripts des contrats | `strict: true` dans chaque `tsconfig.json`, `npm run typecheck` en CI |
| Aucun commentaire de code | tout le code livré | revue |
| Aucun émoji, ni dans le code ni dans les messages | tout le dépôt | revue |
| Indentation de 2 espaces, fin de ligne LF, encodage UTF-8, saut de ligne final | tous les fichiers | [`.editorconfig`](src:.editorconfig), [`.gitattributes`](src:.gitattributes) |
| Textes destinés aux utilisateurs en français | messages d'erreur de l'API, interfaces | revue |
| Aucun secret dans le dépôt | tout l'historique Git | gitleaks en CI, avec [`.gitleaks.toml`](src:.gitleaks.toml) |

### Pas de commentaires

Le code ne contient pas de commentaires explicatifs : les noms de variables, de fonctions et les tests portent l'intention. Une fonction qui a besoin d'un commentaire pour être comprise doit être renommée ou découpée. L'explication des choix revient à la documentation et aux ADR.

Trois exceptions sont nécessaires au fonctionnement des outils :

| Exception | Pourquoi |
| --- | --- |
| `// SPDX-License-Identifier: MIT` en tête des fichiers Solidity | Exigé par le compilateur, qui avertit en son absence |
| Blocs `/** @openapi ... */` au-dessus des routes Express | Lus par `swagger-jsdoc` pour la page `/api/docs`, et par le générateur de la [Référence de l'API](../backend/reference-api.md), qui en extrait le `summary` |
| Directives d'outils (`eslint-disable`) | À éviter ; si inévitable, limitées à une ligne et justifiées dans la pull request |

### Pas d'émojis

Ni dans le code, ni dans les messages d'API, ni dans les interfaces, ni dans les commits. Les icônes de l'interface sont des SVG.

## Backend

### Organisation d'un module

Chaque domaine de [`backend/src/api/`](src:backend/src/api/) suit le même découpage en cinq fichiers, par exemple pour les partenaires :

| Fichier | Responsabilité | Ne doit pas |
| --- | --- | --- |
| [`partners.routes.ts`](src:backend/src/api/partners/partners.routes.ts) | Déclarer les routes, empiler les middlewares (`authenticate`, `requireRoles`, `validate`, `idempotency`), porter le bloc `@openapi` | contenir de logique métier |
| [`partners.validators.ts`](src:backend/src/api/partners/partners.validators.ts) | Schémas Zod de `body`, `query` et `params` | accéder à la base |
| [`partners.controllers.ts`](src:backend/src/api/partners/partners.controllers.ts) | Lire la requête, appeler le service, répondre avec `sendSuccess`, transmettre les erreurs à `next` | contenir de requête Prisma |
| [`partners.services.ts`](src:backend/src/api/partners/partners.services.ts) | Règles métier, contrôles d'accès fins, orchestration | manipuler `req` ou `res` |
| [`partners.repo.ts`](src:backend/src/api/partners/partners.repo.ts) | Requêtes Prisma | contenir de règle métier |

Chaque fichier exporte une instance unique (`export const partnersService = new PartnersService()`) et l'exporte par défaut. Le guide [Ajouter un endpoint](../guides/ajouter-endpoint.md) montre le découpage sur un exemple complet.

### Réponses et erreurs

| Règle | Outil |
| --- | --- |
| Réponse réussie : `{ success: true, message, data, meta? }` | `sendSuccess(res, data, message, statusCode, meta)` de [`response.util.ts`](src:backend/src/utils/response.util.ts) |
| Erreur métier : lever une `AppError(message, statusCode, details)` | Convertie en réponse `{ success: false, message, errors }` par [`error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts) |
| Erreur de validation : 400 avec la liste `{ path, message }` | [`validate.middleware.ts`](src:backend/src/middlewares/validate.middleware.ts) |
| Erreur d'un contrat : décodée et traduite en message français avec un statut HTTP | `toAppError` de [`lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) |

Un contrôleur entoure toujours l'appel du service d'un `try` et passe l'erreur à `next(error)`. Le format complet est décrit dans [Réponses et erreurs](../backend/reponses-erreurs.md).

### Promesses

Toute promesse est attendue (`await`) ou explicitement ignorée avec `void`. ESLint l'impose dans `src/` et `prisma/` avec `@typescript-eslint/no-floating-promises` en erreur ([`backend/eslint.config.mjs`](src:backend/eslint.config.mjs)) :

```typescript
void lotteryIndexer.syncOnce();
```

Une promesse lancée en arrière-plan doit traiter son propre échec, sans quoi une erreur non gérée arrête le processus :

```typescript
walletService
  .grantWelcomeEthers(user)
  .catch((error: Error) => logger.warn(`Dotation de bienvenue différée : ${error.message}`));
```

### Configuration

- `process.env` n'est lu que dans [`backend/src/config/`](src:backend/src/config/). Le reste du code importe `env` depuis [`env.config.ts`](src:backend/src/config/env.config.ts), déjà typé et validé.
- Toute nouvelle variable est ajoutée au schéma Zod et à [`backend/.env.example`](src:backend/.env.example) ; `npm run env:check` vérifie la synchronisation. La procédure complète est dans [Ajouter une variable d'environnement](../guides/ajouter-variable.md).

### Appels sortants

Chaque appel vers un service extérieur a un délai maximal. C'est le cas aujourd'hui :

| Service | Délai | Fichier |
| --- | --- | --- |
| PostgreSQL | `statement_timeout` (`DB_STATEMENT_TIMEOUT_MS`, 15 s), `lock_timeout` 5 s, `idle_in_transaction_session_timeout` 60 s, délai de connexion `DB_CONNECTION_TIMEOUT_MS` | [`prisma.config.ts`](src:backend/src/config/prisma.config.ts) |
| Redis | 1 s par défaut pour la connexion et le `PING` | [`redis.config.ts`](src:backend/src/config/redis.config.ts) |
| SMTP | connexion et accueil 10 s, socket 20 s | [`mailer.config.ts`](src:backend/src/config/mailer.config.ts) |
| RPC Ethereum | 15 s par requête (`RPC_TIMEOUT_MS`) | [`chain.client.ts`](src:backend/src/blockchain/chain.client.ts) |
| S3 | connexion 3 s, requête 10 s | [`s3.service.ts`](src:backend/src/services/s3.service.ts) |

Un nouveau client HTTP ou SDK doit recevoir un délai du même ordre.

### Journalisation

Les journaux passent par [`logger.util.ts`](src:backend/src/utils/logger.util.ts) (winston), jamais par `console.log` dans `src/`. Une adresse email est masquée avec `maskEmail` avant d'être journalisée ; une clé privée, un jeton ou un code à usage unique ne sont jamais journalisés.

### Migrations

Toute migration Prisma respecte l'ADR 0003 : expand/contract, `SET lock_timeout = '5s'` en première ligne, contraintes ajoutées en `NOT VALID` puis validées. Voir [Ajouter une migration](../guides/ajouter-migration.md) et [Migrations expand et contract](../architecture/adr/0003-migrations-expand-contract.md).

## Frontend web

| Règle | Détail |
| --- | --- |
| ESLint | `eslint-config-next` (`core-web-vitals` et `typescript`), règle `@next/next/no-img-element` désactivée ([`frontend-web/eslint.config.mjs`](src:frontend-web/eslint.config.mjs)) |
| Appels API | uniquement par RTK Query, endpoints injectés dans `baseApi` ([`frontend-web/src/store/api/`](src:frontend-web/src/store/api/)) |
| Textes | toujours bilingues avec `t('français', 'english')` de `useAppTheme` |
| URL de l'API | lues dans [`frontend-web/src/lib/config.ts`](src:frontend-web/src/lib/config.ts), seul fichier qui lit `process.env` |
| Composants | ceux de `src/components/ui/` avant d'écrire du balisage neuf |

Voir [Stack et structure](../web/structure.md) et le guide [Ajouter une page web](../guides/ajouter-page-web.md).

## Application mobile

| Règle | Détail |
| --- | --- |
| ESLint | `eslint-config-universe` (`universe/native`, `universe/shared/typescript-analysis`), `no-explicit-any` désactivé ([`mobile-app/.eslintrc.js`](src:mobile-app/.eslintrc.js)) |
| Navigation | toute route est typée dans [`navigation.types.ts`](src:mobile-app/src/types/navigation.types.ts) |
| Textes et couleurs | `t()`, `colors`, `spacing`, `borderRadius` de `useAppTheme`, jamais de couleur en dur |
| Secrets | jamais dans `app.json` ni dans une variable `EXPO_PUBLIC_*`, qui est embarquée en clair dans l'application |

Voir le guide [Ajouter un écran mobile](../guides/ajouter-ecran-mobile.md).

## Smart contracts

| Règle | Détail |
| --- | --- |
| solhint `recommended`, zéro avertissement | [`smart-contract/.solhint.json`](src:smart-contract/.solhint.json), `npm run lint` |
| Version du compilateur | `^0.8.28` imposée par solhint, compilation en 0.8.34 avec l'EVM `prague` et l'optimiseur à 200 exécutions ([`hardhat.config.ts`](src:smart-contract/hardhat.config.ts)) |
| Erreurs personnalisées | `gas-custom-errors` en erreur : `revert NomErreur(...)`, jamais `require(condition, "message")` |
| Imports nommés | `no-global-import` en erreur : `import {AccessControl} from "..."` |
| Visibilité explicite | `func-visibility` en erreur, constructeurs exclus |
| Fonds | modèle de retrait (`claimPrize`, `claimRefund`), checks-effects-interactions et `nonReentrant` sur toute fonction qui envoie des ethers |
| Couverture | 100 % des lignes des contrats de production |

Règles volontairement désactivées dans `.solhint.json` : `reason-string` (remplacé par les erreurs personnalisées), `not-rely-on-time` (les tours sont bornés par `block.timestamp`), `avoid-low-level-calls` (les versements utilisent `call`), `use-natspec`, `gas-indexed-events`, `gas-strict-inequalities` et `gas-struct-packing`.

## Site de l'Office de Tourisme

| Règle | Détail |
| --- | --- |
| Pas de dépendance, pas de bundler | modules ES natifs |
| Toute valeur insérée dans du HTML passe par `escapeHtml` | [`frontend-office-tourisme/assets/js/modules/utils.js`](src:frontend-office-tourisme/assets/js/modules/utils.js) |
| Aucune ressource externe | la politique de sécurité de contenu la bloquerait |
| Couleurs et tailles par variables CSS | [`tokens.css`](src:frontend-office-tourisme/assets/css/tokens.css) |

Voir [Architecture JavaScript](../office-tourisme/architecture.md).

## Documentation

Un changement de comportement documenté met à jour la documentation dans la même pull request. Les règles de rédaction sont dans [Écrire la documentation](documentation.md).
