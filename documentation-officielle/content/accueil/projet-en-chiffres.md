# Le projet en chiffres

Cette page donne la taille réelle du projet, mesurée dans le dépôt le 11 novembre 2026 sur la branche `marceau`. Chaque chiffre est accompagné de la méthode de comptage, pour pouvoir le recalculer après une évolution. Les commandes se lancent depuis la racine du dépôt, dans un terminal Bash (Git Bash sous Windows).

> [!NOTE]
> Les chiffres de l'API, des variables, de la base, des contrats, de Docker Compose et de la CI sont aussi présents dans les pages générées depuis le code ([référence de l'API](../backend/reference-api.md), [variables d'environnement](../backend/variables-environnement.md), [dictionnaire de données](../base-de-donnees/dictionnaire.md), [intégration continue](../infrastructure/ci.md)). En cas d'écart, ces pages générées font foi.

## Vue d'ensemble

| Indicateur | Valeur |
|---|---|
| Routes HTTP de l'API | 52, dans 9 modules |
| Pages du frontend web | 29 |
| Écrans de l'application mobile | 16 |
| Tables PostgreSQL (modèles Prisma) | 10, plus 4 énumérations |
| Migrations Prisma | 4 |
| Variables d'environnement du backend | 53 |
| Contrats Solidity de production | 2 (`BlockLucky`, `BlockLuckyPOAP`) |
| Lignes Solidity des contrats de production | 479 (398 hors lignes vides et commentaires) |
| Tests automatisés | 47 pour les contrats, 41 unitaires et d'intégration pour le backend, 2 sur une vraie chaîne, 13 pour le web, 8 écrits pour le mobile |
| Événements Socket.IO typés | 13 (9 du serveur vers les clients, 4 des clients vers le serveur) |
| Services Docker Compose | 9 (4 par défaut, 5 dans le profil `app`) |
| Jobs de CI | 11 (10 dans `ci.yml`, 1 dans `codeql.yml`) |
| Commits | 331 sur la branche `marceau`, dont 181 hors fusions |

## API

52 routes, comptées comme le fait le générateur de la [référence de l'API](../backend/reference-api.md) : chaque appel `router.get|post|put|patch|delete(` des fichiers `*.routes.ts`.

```bash
grep -cE "router\.(get|post|put|patch|delete)\(" backend/src/api/*/*.routes.ts
```

| Module | Fichier | Routes |
|---|---|---|
| Système (sondes, configuration) | [`backend/src/api/system/system.routes.ts`](src:backend/src/api/system/system.routes.ts) | 5 |
| Authentification | [`backend/src/api/auth/auth.routes.ts`](src:backend/src/api/auth/auth.routes.ts) | 6 |
| Loterie | [`backend/src/api/lottery/lottery.routes.ts`](src:backend/src/api/lottery/lottery.routes.ts) | 11 |
| Boutique (marketplace) | [`backend/src/api/marketplace/marketplace.routes.ts`](src:backend/src/api/marketplace/marketplace.routes.ts) | 6 |
| Partenaires | [`backend/src/api/partners/partners.routes.ts`](src:backend/src/api/partners/partners.routes.ts) | 5 |
| Utilisateur et RGPD | [`backend/src/api/user/user.routes.ts`](src:backend/src/api/user/user.routes.ts) | 10 |
| Analytique | [`backend/src/api/analytics/analytics.routes.ts`](src:backend/src/api/analytics/analytics.routes.ts) | 2 |
| Administration Mairie | [`backend/src/api/admin/admin.routes.ts`](src:backend/src/api/admin/admin.routes.ts) | 6 |
| Webhooks | [`backend/src/api/webhooks/webhooks.routes.ts`](src:backend/src/api/webhooks/webhooks.routes.ts) | 1 |

Les 47 routes métier sont servies deux fois : sous `/api/v1` (préfixe à utiliser) et sous `/api` (compatibilité). Les 5 routes système (`/health`, `/health/live`, `/health/ready`, `/health/deep`, `/api/config`) sont montées à la racine. `/metrics` et `/api/docs` sont montés directement dans [`backend/src/app.ts`](src:backend/src/app.ts) et ne sont pas comptés.

Répartition par niveau d'accès : 18 routes publiques (dont les 5 sondes et le webhook signé), 20 réservées à un utilisateur connecté, 5 aux rôles `PARTNER` ou `ADMIN`, 9 au rôle `ADMIN` seul.

## Interfaces

### Frontend web : 29 pages

Une page Next.js (App Router) est un fichier `page.tsx` sous `frontend-web/src/app/`.

```bash
git ls-files frontend-web/src/app | grep -cE "/page\.tsx$"
```

| Espace | Pages |
|---|---|
| Public (accueil municipal, transparence, confidentialité, mentions légales, connexion, vérification du code, invitation) | 7 |
| Citoyen (groupe de routes `(citoyen)`) | 13 |
| Dashboard Mairie (`/mairie`) | 5 |
| Espace partenaire (`/partenaire`) | 4 |

Les pages d'erreur (`error.tsx`, `global-error.tsx`, `not-found.tsx`) et les trois `layout.tsx` d'espace ne sont pas comptées. Le détail est dans [Pages et espaces](../web/pages.md).

### Application mobile : 16 écrans

```bash
git ls-files mobile-app/src/screens | wc -l
```

4 écrans d'authentification, 4 de loterie, 4 de boutique et 4 de réglages, déclarés dans les navigateurs de `mobile-app/src/navigation/`. L'application mobile ne couvre que l'espace citoyen : les espaces Mairie et partenaire sont uniquement sur le web. Voir [Navigation et écrans](../mobile/navigation-ecrans.md).

### Office de Tourisme

14 pages HTML statiques à la racine de `frontend-office-tourisme/`.

```bash
git ls-files frontend-office-tourisme | grep -cE "^frontend-office-tourisme/[^/]+\.html$"
```

## Données

| Élément | Valeur | Méthode |
|---|---|---|
| Modèles Prisma (tables) | 10 : `User`, `Token`, `LotteryRound`, `Ticket`, `ChainCursor`, `PointTransaction`, `Partner`, `RewardCatalog`, `ClaimedReward`, `Analytics` | `grep -c "^model " backend/prisma/schema.prisma` |
| Énumérations | 4 : `Role`, `TwoFactorMethod`, `TokenType`, `Status` | `grep -c "^enum " backend/prisma/schema.prisma` |
| Index et unicités composés | 14 attributs `@@index` ou `@@unique` | `grep -cE "@@index\|@@unique" backend/prisma/schema.prisma` |
| Contraintes CHECK | 5, toutes dans la migration du 9 novembre | `grep -c CHECK` sur les fichiers `migration.sql` |
| Migrations | 4, du 2 au 11 novembre 2026 | `ls backend/prisma/migrations` |
| Templates d'email | 5 | `ls backend/src/templates/emails` |

Le détail est dans le [modèle de données](../base-de-donnees/modele.md) et la page [Migrations](../base-de-donnees/migrations.md).

## Configuration

53 variables d'environnement, déclarées dans le schéma Zod de [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts). Le script `npm run env:check` du backend vérifie que [`backend/.env.example`](src:backend/.env.example) contient exactement ces variables. Le frontend web lit 2 variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`) et l'application mobile 3 (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`, `EXPO_PUBLIC_SENTRY_DSN`).

## Smart contracts

| Fichier | Lignes | Lignes de code |
|---|---|---|
| [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) | 415 | 350 |
| [`smart-contract/contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) | 64 | 48 |
| Contrats d'attaque des tests (`contracts/test/`) | 77 | 60 |
| Tests de fuzzing [`smart-contract/test/BlockLucky.t.sol`](src:smart-contract/test/BlockLucky.t.sol) | 131 | 114 |

« Lignes de code » exclut les lignes vides et les lignes de commentaire :

```bash
grep -cvE '^\s*$|^\s*//|^\s*/?\*' smart-contract/contracts/BlockLucky.sol
```

`BlockLucky` déclare 11 événements et 18 erreurs personnalisées ; `BlockLuckyPOAP` 2 événements et 3 erreurs. Avec les éléments hérités d'OpenZeppelin et de Chainlink, l'ABI de `BlockLucky` expose 46 fonctions, 19 événements et 26 erreurs. Le contrat est compilé avec Solidity 0.8.34 ([`smart-contract/hardhat.config.ts`](src:smart-contract/hardhat.config.ts)).

## Tests

Un cas de test est un appel `it(` ou `test(` (TypeScript) ou une fonction `test...` (Solidity).

```bash
grep -cE "^\s*(it|test)\(\s*['\"\`]" backend/__tests__/api/*.ts
```

| Projet | Fichiers | Cas | Commande |
|---|---|---|---|
| Smart contracts | 3 | 47 : 38 dans `BlockLucky.test.ts`, 5 dans `BlockLuckyPOAP.test.ts`, 4 fuzzing dans `BlockLucky.t.sol` | `npm test` |
| Backend, unitaires et intégration | 13 | 41 | `npm test` |
| Backend, vraie blockchain locale | 1 | 2 | `npm run test:chain` |
| Frontend web | 2 | 13 | `npm test` |
| Application mobile | 3 | 8 | aucune |

> [!WARNING]
> Les 8 tests de l'application mobile (`mobile-app/__tests__/`) ne peuvent pas s'exécuter : `mobile-app/package.json` ne déclare ni script `test` ni dépendance Jest, et la CI mobile se limite au typecheck, au lint et à la validation de la configuration Expo. Voir [Dette technique et limites](../annexes/dette-technique.md).

La couverture des contrats de production est de 100 % des lignes, contrôlée par `npm run coverage:check` ([`smart-contract/scripts/check-coverage.mjs`](src:smart-contract/scripts/check-coverage.mjs)). Le détail des suites est dans [Tests, fuzzing et couverture](../smart-contracts/tests.md) et [Tests du backend](../backend/tests.md).

## Temps réel

13 événements sont typés dans [`backend/src/types/socket.types.ts`](src:backend/src/types/socket.types.ts) : 9 du serveur vers les clients et 4 des clients vers le serveur (`draw:join`, `draw:leave`, `chat:send`, `chat:react`).

Le serveur n'émet réellement que 5 des 9 événements déclarés : `draw:waiting-room`, `draw:winner`, `chat:message`, `chat:reaction` et `points:awarded`. Les événements `draw:countdown`, `draw:started`, `queue:position` et `network:fallback` sont déclarés mais jamais émis ni écoutés.

```bash
grep -rnoE "emit\(\s*'[a-z:-]+'" backend/src | sort -u
```

## Infrastructure

| Élément | Valeur |
|---|---|
| Services Docker Compose | 9 : `postgres`, `redis`, `mailpit`, `blockchain` par défaut ; `migrate`, `backend`, `worker`, `web`, `tourisme` dans le profil `app` |
| Dockerfile | 4 : backend (cibles `migrator` et `runtime`), frontend web, Office de Tourisme, blockchain locale |
| Jobs de CI | 10 dans [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) : détection des projets modifiés, gitleaks, documentation, backend, contrats, intégration sur vraie chaîne, web, mobile, Office de Tourisme, images Docker ; 1 dans [`.github/workflows/codeql.yml`](src:.github/workflows/codeql.yml) |
| Scénarios de charge k6 | 2 scripts (`smoke.js`, `load.js` avec 4 profils) dans `load-tests/` |

## Code source

Fichiers TypeScript et JavaScript versionnés, hors tests et hors configuration :

| Dossier | Lignes |
|---|---|
| `backend/src/` | 8 101 |
| `frontend-web/src/` | 9 755 |
| `mobile-app/src/` | 8 701 |
| `smart-contract/scripts/` | 430 |
| `frontend-office-tourisme/` (JavaScript) | 4 010 |

```bash
git ls-files backend/src | grep -E '\.(ts|tsx|js|mjs)$' | xargs cat | wc -l
```

Le dépôt versionne 550 fichiers, hors dossier `documentation-officielle/`.

## Historique Git

| Indicateur | Valeur | Commande |
|---|---|---|
| Commits sur la branche `marceau` | 331 | `git rev-list --count HEAD` |
| Commits hors fusions | 181 | `git log --no-merges --oneline \| wc -l` |
| Fusions de pull requests | 150 | `git log --merges --oneline \| wc -l` |
| Premier commit | 2 novembre 2026 | `git log --reverse --format=%ad --date=short \| head -1` |
| Dernier commit | 11 novembre 2026 | `git log -1 --format=%ad --date=short` |
| Jours avec au moins un commit | 5 (2, 3, 9, 10 et 11 novembre) | `git log --format=%ad --date=short \| sort -u` |

Tous les commits de la branche sont signés du même auteur Git ; seuls 12 commits de Dependabot existent sur d'autres branches distantes. Les livrables UX, marketing et budget de l'équipe sont des documents PDF hors dépôt. Les grandes étapes sont résumées dans [Historique et feuille de route](../presentation/historique.md).
