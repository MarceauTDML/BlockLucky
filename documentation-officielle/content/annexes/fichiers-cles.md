# Index des fichiers clés

Les fichiers à lire en premier dans chaque projet, avec leur rôle. Ils suffisent pour comprendre le fonctionnement d'ensemble avant d'entrer dans un module. L'organisation complète du dépôt est décrite dans [Organisation du dépôt](../architecture/organisation-depot.md).

## Racine du dépôt

| Fichier | Rôle |
| --- | --- |
| [`docker-compose.yml`](src:docker-compose.yml) | Infrastructure locale et stack complète (profil `app`), voir [Docker Compose](../infrastructure/docker-compose.md) |
| [`docker/postgres/init/01-extensions.sql`](src:docker/postgres/init/01-extensions.sql) | Création de `pg_stat_statements` à l'initialisation de la base |
| [`.nvmrc`](src:.nvmrc) | Version de Node.js (22), lue par la CI |
| [`.gitleaks.toml`](src:.gitleaks.toml) | Règles de détection de secrets et valeurs publiques autorisées |
| [`.editorconfig`](src:.editorconfig), [`.gitattributes`](src:.gitattributes) | Indentation et fins de ligne communes |
| [`SECURITY.md`](src:SECURITY.md) | Politique de signalement des vulnérabilités |
| [`CONTRIBUTING.md`](src:CONTRIBUTING.md) | Règles de contribution |
| [`.vscode/launch.json`](src:.vscode/launch.json) | Configurations de débogage de l'éditeur |

## Intégration continue

| Fichier | Rôle |
| --- | --- |
| [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) | Contrôles par projet, intégration sur la chaîne, images Docker, gitleaks |
| [`.github/workflows/codeql.yml`](src:.github/workflows/codeql.yml) | Analyse CodeQL hebdomadaire et à chaque pull request |
| [`.github/dependabot.yml`](src:.github/dependabot.yml) | Mises à jour hebdomadaires des dépendances npm, Docker et Actions |
| [`.github/CODEOWNERS`](src:.github/CODEOWNERS) | Relecteurs obligatoires par dossier |
| [`.github/pull_request_template.md`](src:.github/pull_request_template.md) | Modèle de description des pull requests |
| [`.github/scripts/check-static-links.mjs`](src:.github/scripts/check-static-links.mjs) | Vérification des ressources locales du site de l'Office de Tourisme |

## Smart contracts

| Fichier | Rôle |
| --- | --- |
| [`contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) | Contrat de loterie : tours, tickets, tirage VRF, cagnotte, remboursements, commission, pause, rôles |
| [`contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) | Badge ERC-721 non transférable, un par participant et par tour |
| [`hardhat.config.ts`](src:smart-contract/hardhat.config.ts) | Compilateur 0.8.34, réseaux `localhost` et `sepolia`, clé Etherscan |
| [`scripts/deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) | Déploiement local avec coordinateur VRF simulé et habilitation de l'opérateur |
| [`scripts/local-vrf-responder.ts`](src:smart-contract/scripts/local-vrf-responder.ts) | Oracle VRF simulé qui répond aux demandes d'aléa |
| [`scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) | Déploiement Sepolia avec contrôles du coordinateur et de l'abonnement |
| [`scripts/lib/deployment.ts`](src:smart-contract/scripts/lib/deployment.ts) | Configuration des tours par variables d'environnement, écriture de `deployments/` |
| [`scripts/export-abi.mjs`](src:smart-contract/scripts/export-abi.mjs) | Copie des ABI vers le backend, mode `--check` pour la CI |
| [`docker/start-local-chain.sh`](src:smart-contract/docker/start-local-chain.sh) | Démarrage du conteneur : nœud, déploiement, oracle |
| [`test/BlockLucky.test.ts`](src:smart-contract/test/BlockLucky.test.ts) | Tests unitaires du contrat de loterie |
| [`test/BlockLucky.t.sol`](src:smart-contract/test/BlockLucky.t.sol) | Tests de fuzzing en Solidity |
| [`test/BlockLuckyPOAP.test.ts`](src:smart-contract/test/BlockLuckyPOAP.test.ts) | Tests du badge |
| [`scripts/check-coverage.mjs`](src:smart-contract/scripts/check-coverage.mjs) | Exigence de 100 % de couverture des lignes |
| [`slither.config.json`](src:smart-contract/slither.config.json) | Configuration de l'analyse statique Slither |

Voir [Smart contracts](../smart-contracts/index.md).

## Backend

### Démarrage et configuration

| Fichier | Rôle |
| --- | --- |
| [`src/server.ts`](src:backend/src/server.ts) | Point d'entrée de l'API : serveur HTTP, Socket.IO, workers si `RUN_WORKERS`, arrêt propre |
| [`src/worker.ts`](src:backend/src/worker.ts) | Point d'entrée du worker : files, indexeur, keeper, sonde sur `PORT + 1` |
| [`src/app.ts`](src:backend/src/app.ts) | Application Express : middlewares globaux, CORS, maintenance, rate limiting, montage des routes sous `/api/v1` et `/api` |
| [`src/config/env.config.ts`](src:backend/src/config/env.config.ts) | Schéma Zod de toutes les variables d'environnement et contrôles de production |
| [`src/config/prisma.config.ts`](src:backend/src/config/prisma.config.ts) | Client Prisma, pool et délais PostgreSQL |
| [`src/config/redis.config.ts`](src:backend/src/config/redis.config.ts) | Client Redis avec préfixe, délais et repli en mémoire |
| [`prisma/schema.prisma`](src:backend/prisma/schema.prisma) | Modèle de données |
| [`prisma/seed.ts`](src:backend/prisma/seed.ts) | Données de démonstration |
| [`.env.example`](src:backend/.env.example) | Valeurs de développement de chaque variable |
| [`Dockerfile`](src:backend/Dockerfile) | Image multi-étapes, cibles `migrator` et `runtime` |

### Blockchain

| Fichier | Rôle |
| --- | --- |
| [`src/blockchain/chain.client.ts`](src:backend/src/blockchain/chain.client.ts) | Fournisseurs RPC, compte opérateur, instances des contrats |
| [`src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) | Lecture des tours, achats, tirage, retrait, traduction des erreurs du contrat |
| [`src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts) | Projection des événements du contrat dans PostgreSQL |
| [`src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts) | Keeper du tirage et démarrage des services blockchain |
| [`src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) | File des actions on-chain (cagnotte, remboursement, badge) |
| [`src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) | Création, chiffrement et dotation des portefeuilles intégrés |
| [`src/blockchain/poap.metadata.ts`](src:backend/src/blockchain/poap.metadata.ts) | Métadonnées et visuel des badges |
| [`src/blockchain/abi/BlockLucky.json`](src:backend/src/blockchain/abi/BlockLucky.json) | ABI du contrat, générée |

### Transverse

| Fichier | Rôle |
| --- | --- |
| [`src/middlewares/auth.middleware.ts`](src:backend/src/middlewares/auth.middleware.ts) | Vérification du JWT |
| [`src/middlewares/rbac.middleware.ts`](src:backend/src/middlewares/rbac.middleware.ts) | Contrôle des rôles en base et 2FA des administrateurs |
| [`src/middlewares/idempotency.middleware.ts`](src:backend/src/middlewares/idempotency.middleware.ts) | En-tête `Idempotency-Key` |
| [`src/middlewares/rateLimiter.middleware.ts`](src:backend/src/middlewares/rateLimiter.middleware.ts) | Limites de débit partagées dans Redis |
| [`src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts) | Format unique des erreurs |
| [`src/services/session.service.ts`](src:backend/src/services/session.service.ts) | Émission et révocation des sessions |
| [`src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts) | Mouvements d'EtherPoints |
| [`src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) | Chiffrement AES-256-GCM, HMAC, comparaison à temps constant |
| [`src/observability/metrics.ts`](src:backend/src/observability/metrics.ts) | Métriques Prometheus |
| [`src/observability/shutdown.ts`](src:backend/src/observability/shutdown.ts) | Arrêt propre |
| [`src/api/system/system.routes.ts`](src:backend/src/api/system/system.routes.ts) | Sondes de santé et configuration des clients |
| [`src/socket/socket.handler.ts`](src:backend/src/socket/socket.handler.ts) | Serveur Socket.IO |
| [`src/socket/event-bridge.ts`](src:backend/src/socket/event-bridge.ts) | Relais des événements du worker vers les clients |
| [`src/queues/queue.options.ts`](src:backend/src/queues/queue.options.ts) | Tentatives et rétention des jobs |

### Modules métier

Chaque dossier de `src/api/` suit le même découpage : `*.routes.ts` (routes et validation), `*.controllers.ts` (HTTP), `*.services.ts` (règles métier), `*.repo.ts` (Prisma), `*.validators.ts` (schémas Zod). Le plus central est [`lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts). Voir [Modules métier](../backend/modules/index.md).

### Tests

| Fichier | Rôle |
| --- | --- |
| [`__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts) | Environnement commun des tests |
| [`__tests__/chain/onchain-lottery.chain.ts`](src:backend/__tests__/chain/onchain-lottery.chain.ts) | Scénarios sur une vraie chaîne (`npm run test:chain`) |
| [`jest.chain.config.json`](src:backend/jest.chain.config.json) | Configuration Jest de ces scénarios |
| [`scripts/check-env-example.mjs`](src:backend/scripts/check-env-example.mjs) | Cohérence entre `.env.example` et le schéma |

## Frontend web

| Fichier | Rôle |
| --- | --- |
| [`next.config.mjs`](src:frontend-web/next.config.mjs) | En-têtes de sécurité, CSP calculée depuis les URL de l'API, sortie `standalone` |
| [`src/app/layout.tsx`](src:frontend-web/src/app/layout.tsx) | Mise en page racine |
| [`src/app/providers.tsx`](src:frontend-web/src/app/providers.tsx) | Store Redux, restauration de la session, thème, capture de la source UTM, fenêtres globales |
| [`src/lib/config.ts`](src:frontend-web/src/lib/config.ts) | URL de l'API et constantes de la loterie |
| [`src/store/api/baseApi.ts`](src:frontend-web/src/store/api/baseApi.ts) | Client RTK Query, en-tête d'authentification |
| [`src/store/index.ts`](src:frontend-web/src/store/index.ts) | Store Redux |
| [`src/hooks/useBlockLuckyWallet.ts`](src:frontend-web/src/hooks/useBlockLuckyWallet.ts) | Portefeuille intégré et achat de tickets |
| [`src/hooks/useSocket.ts`](src:frontend-web/src/hooks/useSocket.ts), [`src/lib/socket.ts`](src:frontend-web/src/lib/socket.ts) | Temps réel |
| [`src/components/layout/GlobalOverlays.tsx`](src:frontend-web/src/components/layout/GlobalOverlays.tsx) | Fenêtres globales : points gagnés, relance, file d'attente, informations réseau |
| [`src/theme/ThemeProvider.tsx`](src:frontend-web/src/theme/ThemeProvider.tsx) | Thème clair ou sombre et traductions |
| [`src/app/mairie/page.tsx`](src:frontend-web/src/app/mairie/page.tsx) | Tableau de bord de la Mairie |
| [`src/app/(citoyen)/billetterie/page.tsx`](src:frontend-web/src/app/(citoyen)/billetterie/page.tsx) | Achat et cadeau de tickets |
| [`src/app/(citoyen)/tirage/page.tsx`](src:frontend-web/src/app/(citoyen)/tirage/page.tsx) | Salle de tirage en direct |
| [`Dockerfile`](src:frontend-web/Dockerfile) | Image de production |

Voir [Frontend web](../web/structure.md).

## Application mobile

| Fichier | Rôle |
| --- | --- |
| [`src/App.tsx`](src:mobile-app/src/App.tsx) | Point d'entrée |
| [`app.json`](src:mobile-app/app.json) | Configuration Expo |
| [`eas.json`](src:mobile-app/eas.json) | Profils de build EAS (`development`, `preview`, `production`) |
| [`src/navigation/RootNavigator.tsx`](src:mobile-app/src/navigation/RootNavigator.tsx) | Navigation racine et bascule authentifié ou non |
| [`src/services/api.client.ts`](src:mobile-app/src/services/api.client.ts) | Client HTTP et URL de l'API |
| [`src/services/socket.client.ts`](src:mobile-app/src/services/socket.client.ts) | Client Socket.IO |
| [`src/services/secureStorage.ts`](src:mobile-app/src/services/secureStorage.ts) | Stockage sécurisé du jeton de session |
| [`src/store/api/baseApi.ts`](src:mobile-app/src/store/api/baseApi.ts) | Client RTK Query |
| [`src/hooks/useCitizenWallet.ts`](src:mobile-app/src/hooks/useCitizenWallet.ts) | Portefeuille intégré et achat |
| [`src/theme/ThemeProvider.tsx`](src:mobile-app/src/theme/ThemeProvider.tsx) | Thème et couleurs |

Voir [Application mobile](../mobile/structure.md).

## Office de Tourisme

| Fichier | Rôle |
| --- | --- |
| [`assets/js/main.js`](src:frontend-office-tourisme/assets/js/main.js) | Point d'entrée JavaScript commun |
| [`assets/js/data/site.js`](src:frontend-office-tourisme/assets/js/data/site.js) | Identité et coordonnées de l'Office, lien vers l'application de loterie (`lotteryAppUrl`), menus |
| [`assets/js/data/places.js`](src:frontend-office-tourisme/assets/js/data/places.js), [`events.js`](src:frontend-office-tourisme/assets/js/data/events.js), [`content.js`](src:frontend-office-tourisme/assets/js/data/content.js) | Contenus : lieux, événements, articles |
| [`assets/js/modules/cart.js`](src:frontend-office-tourisme/assets/js/modules/cart.js) | Panier de la billetterie |
| [`assets/js/modules/cookies.js`](src:frontend-office-tourisme/assets/js/modules/cookies.js) | Bandeau de consentement |
| [`assets/css/tokens.css`](src:frontend-office-tourisme/assets/css/tokens.css) | Variables de la charte graphique |
| [`docker/nginx.conf`](src:frontend-office-tourisme/docker/nginx.conf) | Configuration nginx |
| [`docker/security-headers.conf`](src:frontend-office-tourisme/docker/security-headers.conf) | En-têtes de sécurité et CSP |
| [`serve.json`](src:frontend-office-tourisme/serve.json) | En-têtes du serveur de développement |

Voir [Office de Tourisme](../office-tourisme/role.md).

## Tests de charge

| Fichier | Rôle |
| --- | --- |
| [`load-tests/smoke.js`](src:load-tests/smoke.js) | Test de fumée |
| [`load-tests/load.js`](src:load-tests/load.js) | Profils de charge, stress, pic et endurance |

Voir [Tests de charge](../infrastructure/tests-charge.md).

## Documentation officielle

| Fichier | Rôle |
| --- | --- |
| [`content/SUMMARY.md`](src:documentation-officielle/content/SUMMARY.md) | Liste et ordre des pages |
| [`scripts/build.mjs`](src:documentation-officielle/scripts/build.mjs) | Construction du site statique |
| [`scripts/lib/generators.mjs`](src:documentation-officielle/scripts/lib/generators.mjs) | Tableaux générés depuis le code |
| [`content/_data/`](src:documentation-officielle/content/_data/services-compose.json) | Descriptions des tableaux générés |

Voir [Écrire la documentation](../contribuer/documentation.md).
