# Organisation du dépôt

Le dépôt `MarceauTDML/BlockLucky` est un monorepo sans gestionnaire d'espaces de travail : chaque projet possède son propre `package.json`, son `package-lock.json` et ses `node_modules`. Il n'y a ni `workspaces` npm, ni Turborepo, ni Nx. Chaque commande se lance depuis le dossier du projet concerné, et la CI installe chaque projet séparément avec `npm ci`.

## Vue d'ensemble

```text
BlockLucky/
├── smart-contract/            contrats Solidity, tests, déploiement
├── backend/                   API Express, worker, Prisma, intégration blockchain
├── frontend-web/              application Next.js (citoyen, partenaire, Mairie)
├── mobile-app/                application Expo (citoyen)
├── frontend-office-tourisme/  site statique de l'Office de Tourisme
├── documentation-officielle/  cette documentation (Markdown vers HTML)
├── load-tests/                scénarios k6
├── docker/                    fichiers montés dans les conteneurs d'infrastructure
├── .github/                   CI, Dependabot, CODEOWNERS, modèle de pull request
├── .vscode/                   configurations de débogage
├── docker-compose.yml         infrastructure locale et stack complète
└── fichiers racine            conventions d'éditeur, Node, Git, sécurité
```

## Fichiers racine

| Fichier | Rôle |
|---|---|
| [`docker-compose.yml`](src:docker-compose.yml) | Services `postgres`, `redis`, `mailpit`, `blockchain` (démarrés par défaut) et `migrate`, `backend`, `worker`, `web`, `tourisme` (profil `app`). Voir [Docker Compose](../infrastructure/docker-compose.md) |
| [`.nvmrc`](src:.nvmrc) | Version majeure de Node.js utilisée en local et par la CI : `22` |
| [`.editorconfig`](src:.editorconfig) | UTF-8, fins de ligne LF, indentation de 2 espaces, ligne finale, suppression des espaces de fin sauf dans le Markdown |
| [`.gitattributes`](src:.gitattributes) | Normalisation des fins de ligne, `*.sh` forcés en LF pour qu'ils s'exécutent dans les conteneurs Linux |
| [`.gitignore`](src:.gitignore) | Ignore les `.env`, journaux et fichiers d'éditeur. Chaque projet a aussi son propre `.gitignore` |
| [`.gitleaks.toml`](src:.gitleaks.toml) | Configuration de la recherche de secrets lancée par la CI sur tout l'historique |
| [`CONTRIBUTING.md`](src:CONTRIBUTING.md) | Résumé des règles de contribution, qui renvoie vers [Workflow Git](../contribuer/workflow-git.md) |
| [`SECURITY.md`](src:SECURITY.md) | Procédure de signalement de vulnérabilité. Voir [Signaler une vulnérabilité](../securite/signalement.md) |
| [`README.md`](src:README.md) | Présentation courte et démarrage rapide |

## `smart-contract/`

Projet Hardhat 3 en modules ES (`"type": "module"`).

| Chemin | Rôle |
|---|---|
| [`contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) | Contrat de loterie : tours, tickets, tirage VRF, cagnotte, remboursements, commission |
| [`contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) | Badge ERC-721 non transférable, un par participant et par tour |
| [`contracts/test/`](src:smart-contract/contracts/test/) | Contrats d'attaque utilisés par les tests uniquement (`ReentrantPlayer`, `RejectingPlayer`) |
| [`test/`](src:smart-contract/test/) | Tests TypeScript (Mocha et ethers), tests Solidity de fuzzing `BlockLucky.t.sol`, fixtures |
| [`scripts/`](src:smart-contract/scripts/) | Déploiement local et Sepolia, oracle VRF local, export des ABI vers le backend, contrôle de couverture, Slither |
| [`docker/start-local-chain.sh`](src:smart-contract/docker/start-local-chain.sh) | Démarre le nœud, déploie les contrats, crée le fichier de disponibilité, lance l'oracle VRF local |
| [`hardhat.config.ts`](src:smart-contract/hardhat.config.ts) | Compilateur 0.8.34, EVM `prague`, optimiseur 200 runs, réseaux `localhost` et `sepolia` |
| [`.solhint.json`](src:smart-contract/.solhint.json), [`slither.config.json`](src:smart-contract/slither.config.json), [`slither.db.json`](src:smart-contract/slither.db.json) | Règles de lint Solidity, configuration de Slither et constats acceptés |
| [`Dockerfile`](src:smart-contract/Dockerfile) | Image de la chaîne locale, pour le développement et la CI uniquement |

## `backend/`

Projet TypeScript compilé en CommonJS. La structure de `src/` suit l'[ADR 0001](adr/0001-monolithe-modulaire.md).

```text
backend/
├── src/
│   ├── server.ts              process API
│   ├── worker.ts              process worker
│   ├── app.ts                 application Express et ordre des middlewares
│   ├── api/<domaine>/         routes, controllers, services, repo, validators
│   ├── blockchain/            client RPC, portefeuilles, passerelle, indexeur, keeper, actions, ABI
│   ├── config/                env, Prisma, Redis, SMTP, Swagger
│   ├── middlewares/           auth, RBAC, validation, idempotence, rate limit, erreurs, contexte
│   ├── observability/         métriques, contexte de requête, cycle de vie, arrêt propre
│   ├── queues/                producteurs BullMQ et options par défaut des jobs
│   ├── workers/               consommateurs BullMQ et indexeur du webhook simulé
│   ├── services/              services partagés entre domaines
│   ├── socket/                serveur Socket.IO, événements, pont Redis
│   ├── templates/emails/      gabarits HTML des emails
│   ├── types/                 types partagés et augmentation de Express
│   └── utils/                 réponses, cryptographie, logs, pagination
├── prisma/                    schéma, migrations, seed
├── __tests__/                 tests Jest (api, services, integration, chain) et mocks
└── scripts/                   contrôle de .env.example
```

| Chemin | Rôle |
|---|---|
| [`src/api/`](src:backend/src/api/) | Un dossier par domaine : `admin`, `analytics`, `auth`, `lottery`, `marketplace`, `partners`, `system`, `user`, `webhooks`. Voir [Modules métier](../backend/modules/index.md) |
| [`src/blockchain/abi/`](src:backend/src/blockchain/abi/) | ABI de `BlockLucky` et `BlockLuckyPOAP`, générées par `npm run export:abi` dans `smart-contract/` et vérifiées en CI |
| [`src/workers/blockchain-indexer.worker.ts`](src:backend/src/workers/blockchain-indexer.worker.ts) | Malgré son nom, ce n'est pas un worker BullMQ : c'est l'indexeur appelé par le webhook de simulation |
| [`prisma/schema.prisma`](src:backend/prisma/schema.prisma) | Modèle de données. Voir [Modèle de données](../base-de-donnees/modele.md) |
| [`prisma/migrations/`](src:backend/prisma/migrations/) | Migrations SQL versionnées. Voir [Migrations](../base-de-donnees/migrations.md) |
| [`prisma.config.ts`](src:backend/prisma.config.ts) | Configuration de Prisma 7 : chemin du schéma et URL de la base (`DATABASE_URL`, avec la base locale par défaut) |
| [`__tests__/`](src:backend/__tests__/) | `api/` et `services/` pour les tests unitaires avec mocks Prisma et Redis, `integration/` pour les parcours complets, `chain/` pour les tests sur un vrai nœud (`npm run test:chain`) |
| [`scripts/check-env-example.mjs`](src:backend/scripts/check-env-example.mjs) | Vérifie que `.env.example` contient exactement les variables du schéma (`npm run env:check`) |
| [`Dockerfile`](src:backend/Dockerfile) | Image multi-étapes : cibles `migrator` (migrations) et `runtime` (API et worker) |
| [`.env.example`](src:backend/.env.example) | Modèle de configuration locale. Voir [Variables d'environnement](../backend/variables-environnement.md) |
| [`jest.chain.config.json`](src:backend/jest.chain.config.json), [`nodemon.json`](src:backend/nodemon.json) | Configuration Jest des tests de chaîne, configuration nodemon |

## `frontend-web/`

Application Next.js 16 avec App Router.

| Chemin | Rôle |
|---|---|
| [`src/app/`](src:frontend-web/src/app/) | Routes. Le groupe `(citoyen)` porte l'espace citoyen (`accueil`, `billetterie`, `tirage`, `boutique`, `historique`, `profil`), `mairie/` et `partenaire/` les deux espaces métiers, les autres dossiers les pages publiques |
| [`src/components/`](src:frontend-web/src/components/) | Composants par domaine : `auth`, `charts`, `layout`, `lottery`, `marketplace`, `partner`, `ui` |
| [`src/store/`](src:frontend-web/src/store/) | Store Redux : `api/` (RTK Query, un fichier par domaine d'API) et `slices/` (`auth`, `lottery`, `ui`) |
| [`src/hooks/`](src:frontend-web/src/hooks/) | Hooks applicatifs (`useAuth`, `useSocket`, `useBlockLuckyWallet`) |
| [`src/lib/`](src:frontend-web/src/lib/) | Fonctions sans état : configuration, formatage, stockage local, client Socket.IO, analytique |
| [`src/theme/`](src:frontend-web/src/theme/), [`src/types/`](src:frontend-web/src/types/) | Fournisseur de thème, types des réponses de l'API |
| [`__tests__/`](src:frontend-web/__tests__/) | Tests Vitest et Testing Library |
| [`next.config.mjs`](src:frontend-web/next.config.mjs) | En-têtes de sécurité et CSP, sortie `standalone` pour l'image Docker |

Le détail est dans [Stack et structure](../web/structure.md).

## `mobile-app/`

Application Expo en TypeScript.

| Chemin | Rôle |
|---|---|
| [`src/App.tsx`](src:mobile-app/src/App.tsx) | Point d'entrée déclaré dans `package.json` |
| [`src/navigation/`](src:mobile-app/src/navigation/) | Navigateurs React Navigation : pile racine, authentification, quatre onglets, hooks de navigation typés |
| [`src/screens/`](src:mobile-app/src/screens/) | Écrans par domaine : `auth`, `lottery`, `marketplace`, `settings`, `sponsors` |
| [`src/components/`](src:mobile-app/src/components/) | Composants `auth`, `draw`, `lottery`, `marketplace`, `profile`, `ui` (dont les icônes SVG), `web3` |
| [`src/services/`](src:mobile-app/src/services/) | Client HTTP axios, stockage sécurisé, client Socket.IO, collecteur d'erreurs local `sentry.client.ts` (sans SDK Sentry) |
| [`src/store/`](src:mobile-app/src/store/) | RTK Query et slices, même découpage que le web |
| [`app.json`](src:mobile-app/app.json), [`eas.json`](src:mobile-app/eas.json) | Configuration Expo et profils de build EAS |
| [`.expo/`](src:mobile-app/.expo/) | Dossier local d'Expo (`README.md`, `devices.json`) versionné alors qu'il est propre à chaque poste : il ne contient aucune configuration du projet |

Le détail est dans [Stack et structure](../mobile/structure.md).

## `frontend-office-tourisme/`

Site statique servi tel quel, sans étape de build.

| Chemin | Rôle |
|---|---|
| `*.html` à la racine | Une page par rubrique : `index`, `decouvrir`, `sortir`, `manger`, `dormir`, `fiche`, `article`, `billetterie`, `commande`, `favoris`, `infos-pratiques`, `mentions-legales`, `bientot`, `404` |
| [`assets/js/main.js`](src:frontend-office-tourisme/assets/js/main.js) | Point d'entrée commun, charge dynamiquement le module de la page |
| [`assets/js/data/`](src:frontend-office-tourisme/assets/js/data/), [`modules/`](src:frontend-office-tourisme/assets/js/modules/), [`pages/`](src:frontend-office-tourisme/assets/js/pages/), [`vendor/`](src:frontend-office-tourisme/assets/js/vendor/) | Contenus codés en dur, modules réutilisables, scripts par page, générateur de QR code tiers |
| [`assets/css/`](src:frontend-office-tourisme/assets/css/) | Feuilles découpées : jetons, base, mise en page, composants, pages |
| [`docker/`](src:frontend-office-tourisme/docker/) | Configuration nginx et en-têtes de sécurité de l'image |

Voir [Architecture JavaScript](../office-tourisme/architecture.md).

## Autres dossiers

| Chemin | Rôle |
|---|---|
| [`documentation-officielle/`](src:documentation-officielle/) | Sources Markdown (`content/`), générateur (`scripts/`), gabarit (`theme/`). Voir [Écrire la documentation](../contribuer/documentation.md) |
| [`load-tests/`](src:load-tests/) | Scénarios k6 `smoke.js` et `load.js`. Voir [Tests de charge](../infrastructure/tests-charge.md) |
| [`docker/postgres/init/`](src:docker/postgres/init/) | Script exécuté à la création de la base : active `pg_stat_statements` |
| [`.github/workflows/`](src:.github/workflows/) | `ci.yml` (jobs par projet modifié) et `codeql.yml`. Voir [Intégration continue](../infrastructure/ci.md) |
| [`.github/dependabot.yml`](src:.github/dependabot.yml) | Mises à jour automatiques. Voir [Versions de la stack](versions.md) |
| [`.github/CODEOWNERS`](src:.github/CODEOWNERS), [`.github/pull_request_template.md`](src:.github/pull_request_template.md) | Propriétaires des dossiers et modèle de pull request |
| [`.vscode/launch.json`](src:.vscode/launch.json) | Lancement de l'API et du worker avec `tsx`, tests Jest du fichier courant, attachement au port 9229 |

## Conventions de nommage

### Dossiers et fichiers

| Projet | Convention observée | Exemples |
|---|---|---|
| Backend | `<domaine>.<couche>.ts` dans `src/api/<domaine>/` | `lottery.routes.ts`, `lottery.controllers.ts`, `lottery.services.ts`, `lottery.repo.ts`, `lottery.validators.ts` |
| Backend | `<nom>.<rôle>.ts` hors des modules | `auth.middleware.ts`, `redis.config.ts`, `ledger.service.ts`, `emails.queue.ts`, `email.worker.ts`, `response.util.ts`, `api.types.ts` |
| Backend | Tests en `*.test.ts`, tests de chaîne en `*.chain.ts` | `__tests__/api/lottery.test.ts`, `__tests__/chain/onchain-lottery.chain.ts` |
| Contrats | PascalCase, un contrat par fichier ; tests TypeScript en `*.test.ts`, fuzzing en `*.t.sol` | `BlockLucky.sol`, `BlockLucky.test.ts`, `BlockLucky.t.sol` |
| Web et mobile | Composants en PascalCase `.tsx`, hooks en `useX.ts`, slices en `xSlice.ts`, API en `xApi.ts` | `TicketCard.tsx`, `useSocket.ts`, `authSlice.ts`, `lotteryApi.ts` |
| Web | Segments de route en français, en minuscules | `app/(citoyen)/boutique/mes-codes/page.tsx`, `app/mairie/partenaires/page.tsx` |
| Mobile | Écrans suffixés `Screen`, navigateurs suffixés `Stack` ou `Tabs`, utilitaires en `*.util.ts` | `BuyTicketScreen.tsx`, `AuthStack.tsx`, `formatters.util.ts` |
| Office de Tourisme | Pages et modules en minuscules, mots séparés par des tirets | `infos-pratiques.html`, `pages/billetterie.js` |
| Migrations | Horodatage puis description en snake_case | `20261111150000_onchain_wallets_tickets_indexer` |

### Identifiants

| Élément | Convention | Exemples |
|---|---|---|
| Modèles Prisma | PascalCase au singulier, champs en camelCase | `LotteryRound.contractRoundId`, `ClaimedReward.uniqueCode` |
| Énumérations | Valeurs en majuscules | `Role.ADMIN`, `Status.LOCKED`, `TokenType.ACCOUNT_DELETION` |
| Variables d'environnement | Majuscules et tirets bas | `BLOCKCHAIN_MODE`, `WELCOME_GRANT_WEI`, `NEXT_PUBLIC_API_URL`, `EXPO_PUBLIC_API_URL` |
| Clés Redis | Segments séparés par `:`, préfixés automatiquement par `<REDIS_KEY_PREFIX>:<NODE_ENV>:` | `auth:otp:<id>`, `wallet:grant-lock:<id>`, `chain:keeper-lock`, `auth:login-ticket:<HMAC>` |
| Files BullMQ | Nom fixe dans le producteur | `emails-queue`, `ledger-queue`, `chain-actions` |
| Événements Socket.IO | `domaine:action` | `draw:winner`, `draw:waiting-room`, `chat:message`, `points:awarded` |
| Classes et singletons | Classe en PascalCase suffixée par la couche, instance exportée en camelCase et par défaut | `export class LotteryService`, `export const lotteryService = new LotteryService()` |

Les conventions de code elles-mêmes sont décrites dans [Conventions de code](conventions.md).
