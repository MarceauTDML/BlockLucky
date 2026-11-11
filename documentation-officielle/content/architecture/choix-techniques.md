# Choix techniques

Cette page justifie chaque brique de la stack : ce qu'elle apporte au projet, les alternatives qui n'ont pas été retenues et les conséquences concrètes pour qui maintient le code. Les décisions les plus structurantes ont leur propre [ADR](adr/index.md). Les versions exactes sont listées dans [Versions de la stack](versions.md).

## Synthèse

| Brique | Rôle | Décision liée |
|---|---|---|
| Express 5 | Serveur HTTP de l'API | [ADR 0001](adr/0001-monolithe-modulaire.md) |
| Prisma 7 | Accès à PostgreSQL, migrations | [ADR 0003](adr/0003-migrations-expand-contract.md) |
| PostgreSQL 15 | Données métier et projection de la chaîne | [ADR 0003](adr/0003-migrations-expand-contract.md) |
| Redis 7 et BullMQ | Files, état court, verrous, rate limit, relais temps réel | [ADR 0002](adr/0002-redis-files-et-repli-memoire.md) |
| Socket.IO | Temps réel du tirage et des EtherPoints | - |
| ethers v6 | Client Ethereum du backend | [ADR 0004](adr/0004-smart-contract-portefeuille-integre.md) |
| Solidity et Hardhat 3 | Contrats, tests, déploiement | [ADR 0004](adr/0004-smart-contract-portefeuille-integre.md) |
| Chainlink VRF v2.5 | Aléa prouvable du tirage | [ADR 0004](adr/0004-smart-contract-portefeuille-integre.md) |
| OpenZeppelin 5 | Rôles, pause, protection contre la réentrance, ERC-721 | [ADR 0004](adr/0004-smart-contract-portefeuille-integre.md) |
| Next.js 16 et React 19 | Frontend web | - |
| Tailwind 4 | Styles du frontend web | - |
| RTK Query | Appels API et cache côté clients | - |
| Expo et React Native | Application mobile | - |
| Zod | Validation des entrées et de la configuration | - |
| Site statique sans framework | Office de Tourisme | - |
| Docker | Infrastructure locale, images de production, CI | [ADR 0003](adr/0003-migrations-expand-contract.md) |

## Backend

### Express 5

**Pourquoi.** L'API est un ensemble de routes REST classiques avec des middlewares transverses (contexte de requête, métriques, Helmet, CORS, rate limit, authentification, RBAC, validation, idempotence). Express exprime exactement cet empilement, dans un ordre lisible dans [`backend/src/app.ts`](src:backend/src/app.ts). Son écosystème couvre tous les besoins du projet sans adaptation : `helmet`, `cors`, `express-rate-limit` avec `rate-limit-redis`, `swagger-ui-express`, et Socket.IO se branche sur le même serveur `http`.

**Alternatives écartées.**

- NestJS : injection de dépendances, décorateurs et modules apportent une structure, mais au prix d'un cadre plus lourd à apprendre pour une équipe unique. Le découpage par domaine du dossier `api/` donne la même lisibilité sans framework.
- Fastify : plus rapide sur les bancs d'essai, mais le goulot d'étranglement de BlockLucky est le réseau Ethereum (une transaction attend son reçu), pas le routeur HTTP.

**Conséquences.**

- Chaque controller entoure son code d'un `try/catch` qui transmet l'erreur à `next(error)`. Le middleware d'erreur unique ([`backend/src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts)) produit la réponse.
- Les délais du serveur sont réglés explicitement dans [`backend/src/server.ts`](src:backend/src/server.ts) (`keepAliveTimeout`, `headersTimeout`, `requestTimeout`).
- La documentation OpenAPI est produite par `swagger-jsdoc` à partir des blocs `@openapi` placés au-dessus des routes.

### Prisma 7 avec l'adaptateur `pg`

**Pourquoi.** Prisma génère un client typé à partir de [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) : une colonne renommée casse la compilation au lieu de casser la production. Prisma Migrate produit des fichiers SQL versionnés, relus et modifiables à la main, ce que l'[ADR 0003](adr/0003-migrations-expand-contract.md) exige (`SET lock_timeout`, contraintes `NOT VALID`). Depuis Prisma 7, le client passe par un adaptateur de pilote : [`backend/src/config/prisma.config.ts`](src:backend/src/config/prisma.config.ts) utilise `@prisma/adapter-pg`, ce qui donne la main sur le pool `pg` (`max`, `connectionTimeoutMillis`, `statement_timeout`, `lock_timeout`, `application_name`).

**Alternatives écartées.**

- TypeORM : décorateurs sur des classes d'entité et migrations moins prévisibles.
- Drizzle ou Kysely : plus proches du SQL, mais sans l'outil de dérive `prisma migrate diff` que la CI utilise pour vérifier que le schéma et les migrations concordent.
- SQL brut avec `pg` : aucun typage des résultats.

**Conséquences.**

- Les erreurs du pilote arrivent sous deux formes : code Prisma (`P2002`, `P2004`, `P2025`, `P2034`) ou code PostgreSQL d'origine dans `meta.driverAdapterError.cause.originalCode` (`23505`, `23514`, `40001`, `40P01`, `57014`). Le middleware d'erreur et l'indexeur (`isUniqueViolation`) traitent les deux.
- Les opérations multi-tables passent par `prisma.$transaction([...])` sous forme de tableau, comme dans [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts).

### PostgreSQL 15

**Pourquoi.** Les EtherPoints sont une monnaie interne : leur solde doit rester cohérent même en cas de bug applicatif. PostgreSQL garantit les transactions ACID entre domaines et porte les invariants en contraintes `CHECK` (solde, stock, cagnotte non négatifs), ajoutées par la migration `20261109213843_infra_indexes_timestamptz_checks`. Les dates sont en `TIMESTAMPTZ(3)`. L'extension `pg_stat_statements` est activée par [`docker/postgres/init/01-extensions.sql`](src:docker/postgres/init/01-extensions.sql) pour l'analyse des requêtes.

**Alternatives écartées.**

- MongoDB : pas de contraintes d'intégrité entre documents, alors que le modèle est fortement relationnel (utilisateur, tickets, tours, points, récompenses, partenaires).
- MySQL : viable, mais le projet s'appuie sur les tableaux natifs (`twoFactorBackupCodes String[]`), `jsonb` pour l'analytique et les identifiants `uuid(7)`.

**Conséquences.**

- La base n'est pas la source de vérité de la loterie : elle se reconstruit depuis la chaîne. Voir [Reconstruire depuis la chaîne](../base-de-donnees/reconstruction.md).
- Le conteneur local expose PostgreSQL sur `127.0.0.1:5434` pour ne pas entrer en conflit avec une installation existante.

### Redis 7 et BullMQ

**Pourquoi.** Plusieurs traitements ne doivent pas bloquer la requête HTTP ou doivent être rejoués en cas d'échec : envoi d'emails, frappe des badges POAP, retrait de la cagnotte et des remboursements. BullMQ fournit des files persistantes avec tentatives, backoff exponentiel et identifiants de job pour la déduplication. Redis sert aussi aux états courts avec expiration (défis OTP, révocation de sessions, réponses idempotentes, verrous), au rate limit partagé entre instances et au relais pub/sub des événements temps réel. Une seule technologie couvre ces besoins.

**Alternatives écartées.**

- RabbitMQ ou Kafka : un deuxième système à opérer, pour un volume qui ne le justifie pas.
- Files dans PostgreSQL (`pg-boss`, `SKIP LOCKED`) : aurait évité Redis, mais Redis reste nécessaire pour le rate limit et les clés à expiration.
- Memcached : pas de persistance ni de pub/sub.

**Conséquences.**

- Redis doit être configuré en `noeviction` : une éviction ferait disparaître des jobs. Voir l'[ADR 0002](adr/0002-redis-files-et-repli-memoire.md).
- Toutes les lectures et écritures applicatives passent par `RedisManager` ([`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts)), qui bascule sur une mémoire locale si Redis ne répond pas. Ce repli n'est pas partagé entre process.
- Les files BullMQ utilisent le client brut `getRawClient()` et leur propre préfixe (`bull:`), pas le préfixe applicatif.

### Socket.IO

**Pourquoi.** Le tirage se suit en direct : salle d'attente, chat, annonce du gagnant, EtherPoints crédités. Socket.IO gère la reconnexion, le repli en long polling quand un réseau bloque les WebSockets, les salles (`draw:<roundId>`) et une authentification par jeton à la poignée de main ([`backend/src/socket/socket.middleware.ts`](src:backend/src/socket/socket.middleware.ts)). Les types `ServerToClientEvents` et `ClientToServerEvents` ([`backend/src/types/socket.types.ts`](src:backend/src/types/socket.types.ts)) typent les deux sens.

**Alternatives écartées.**

- WebSocket natif (`ws`) : reconnexion, salles et repli à réécrire.
- Server-Sent Events : unidirectionnels, alors que le chat et `draw:join` vont du client au serveur.

**Conséquences.**

- Sans adaptateur Redis, une seule instance d'API est supportée pour les événements émis localement. Voir [Temps réel Socket.IO](../backend/socket-io.md).
- Un client sans jeton est accepté comme invité (`guest-<socket.id>`) : la salle d'attente et l'annonce du gagnant sont publiques.

### ethers v6

**Pourquoi.** ethers couvre tout ce dont le backend a besoin : `Wallet.createRandom` pour les portefeuilles intégrés, `JsonRpcProvider` avec timeout par `FetchRequest`, `NonceManager` pour le compte opérateur, `Contract` à partir des ABI exportées, `Interface.parseError` pour décoder les erreurs personnalisées du contrat. C'est aussi la bibliothèque du plugin Hardhat utilisé par les tests des contrats : une seule API à connaître.

**Alternatives écartées.**

- viem : moderne et typé à partir de l'ABI, mais il aurait introduit une deuxième bibliothèque à côté d'ethers, utilisé par Hardhat.
- web3.js : moins maintenu.

**Conséquences.**

- Les montants sont des `bigint` : la base stocke les wei en texte (`ticketPriceWei`, `prizeWei`) et la cagnotte en `Float` d'ETH pour l'affichage.
- Les fonctions du contrat sont appelées par nom (`getFunction('buyTickets')`), sans types générés. Une fonction renommée dans le contrat n'est détectée qu'à l'exécution ou par les tests de chaîne.

## Smart contracts

### Solidity et Hardhat 3

**Pourquoi.** Le kickoff impose Solidity et cite Hardhat et Remix. Hardhat 3 compile, teste en TypeScript avec Mocha et ethers, exécute des tests Solidity de fuzzing (`BlockLucky.t.sol`), mesure la couverture et déploie par scripts. Le compilateur est fixé à 0.8.34 avec l'EVM `prague` dans [`smart-contract/hardhat.config.ts`](src:smart-contract/hardhat.config.ts).

**Alternatives écartées.**

- Remix seul : pas de tests en CI, pas de couverture, pas de déploiement reproductible. Il reste utilisable pour la démonstration. Voir [Utiliser Remix](../smart-contracts/remix.md).
- Foundry : excellent pour le fuzzing, mais il sort de l'écosystème TypeScript partagé avec le backend. Hardhat 3 exécute les tests Solidity au format `forge-std`.

**Conséquences.**

- Les ABI consommées par le backend sont générées par `npm run export:abi` et contrôlées en CI (`node scripts/export-abi.mjs --check`).
- Le projet est en modules ES (`"type": "module"`), contrairement au backend en CommonJS.

### Chainlink VRF v2.5

**Pourquoi.** Le gagnant doit être tiré au hasard d'une manière que personne, Mairie comprise, ne peut influencer, et que chacun peut vérifier. VRF fournit un nombre aléatoire accompagné d'une preuve vérifiée par le coordinateur on-chain avant d'appeler `fulfillRandomWords`. Le contrat hérite de `VRFConsumerBaseV2Plus`.

**Alternatives écartées.** `block.prevrandao` ou un hash de bloc, manipulables par le producteur de bloc et non prouvables ; un tirage côté serveur, invérifiable.

**Conséquences.**

- Le tirage est asynchrone : la demande et le résultat sont dans deux transactions différentes. Voir [Tirage et versement de la cagnotte](flux/tirage.md).
- En local, un coordinateur simulé et un oracle de développement remplacent Chainlink. Sur Sepolia, l'abonnement VRF doit être financé.
- Si l'oracle ne répond pas, seule `retryDraw` (rôle opérateur, après `drawTimeout`) débloque le tour.

### OpenZeppelin 5

**Pourquoi.** Les mécanismes de sécurité du contrat sont des briques auditées plutôt que du code maison : `AccessControl` pour les rôles administrateur, opérateur et pause, `Pausable` pour le disjoncteur, `ReentrancyGuard` sur toutes les fonctions qui envoient des ethers, `ERC721` pour le badge POAP.

**Alternatives écartées.** Réécrire ces mécanismes, source classique de failles.

**Conséquences.** Les erreurs héritées (`EnforcedPause`, `AccessControlUnauthorizedAccount`) font partie de l'interface : le backend les traduit dans `CONTRACT_ERRORS` ([`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts)).

## Clients

### Next.js 16 et React 19

**Pourquoi.** Le frontend web regroupe trois espaces (citoyen, partenaire, Mairie) et des pages publiques. L'App Router organise les routes par dossiers et partage une mise en page par espace (`layout.tsx` de `(citoyen)`, `mairie`, `partenaire`). `next.config.mjs` porte les en-têtes de sécurité et la CSP. La sortie `standalone` produit une image Docker légère.

**Alternatives écartées.** Vite avec React Router : routage, en-têtes et build de production à assembler soi-même. Remix : écosystème plus restreint.

**Conséquences.** Les pages interactives sont des composants client (`'use client'`). Le JWT est géré côté client et envoyé en `Authorization: Bearer`, ce qui rend le rendu serveur des pages authentifiées inutile.

### Tailwind 4

**Pourquoi.** Des classes utilitaires évitent de maintenir une feuille de style par composant, et le thème clair ou sombre se pilote par variables. Tailwind 4 s'intègre par le plugin PostCSS `@tailwindcss/postcss` ([`frontend-web/postcss.config.mjs`](src:frontend-web/postcss.config.mjs)), sans fichier de configuration JavaScript.

**Alternatives écartées.** CSS Modules ou styled-components : plus de fichiers, et des styles à l'exécution pour le second.

**Conséquences.** L'application mobile n'utilise pas Tailwind : elle a son propre thème dans [`mobile-app/src/theme/`](src:mobile-app/src/theme/). Voir [Design system](../web/design-system.md).

### RTK Query

**Pourquoi.** Le web et le mobile consomment la même API. RTK Query, dans Redux Toolkit, fournit le cache, l'invalidation par étiquettes (`tagTypes` : `User`, `Lottery`, `Wallet`, etc.) et l'état de chargement, avec un découpage identique sur les deux clients (`baseApi.ts`, puis un fichier par domaine). Les slices Redux gardent l'état purement local (session, interface).

**Alternatives écartées.** TanStack Query : équivalent pour le cache, mais il aurait fallu un second outil pour l'état global déjà géré par Redux.

**Conséquences.** Le web intercepte les 401 dans `baseQueryWithAuthGuard` ([`frontend-web/src/store/api/baseApi.ts`](src:frontend-web/src/store/api/baseApi.ts)) pour déconnecter l'utilisateur. Le mobile garde aussi un client axios avec tentatives automatiques sur les méthodes sûres ([`mobile-app/src/services/api.client.ts`](src:mobile-app/src/services/api.client.ts)).

### Expo et React Native

**Pourquoi.** Une base de code TypeScript produit iOS et Android, avec les mêmes patterns que le web (Redux, RTK Query, Socket.IO). Expo fournit le stockage sécurisé du jeton (`expo-secure-store`), les notifications, les polices et les builds EAS ([`mobile-app/eas.json`](src:mobile-app/eas.json)) sans toucher aux projets natifs.

**Alternatives écartées.** Applications natives Swift et Kotlin : deux équipes. Flutter : un autre langage. Application web progressive : accès limité au stockage sécurisé et aux notifications sur iOS.

**Conséquences.** Les versions des paquets `expo-*` et `react-native*` sont liées au SDK : Dependabot ignore leurs mises à jour majeures. Voir [Versions de la stack](versions.md).

### Site statique sans framework

**Pourquoi.** Le site de l'Office de Tourisme est une vitrine sans compte ni backend. Des pages HTML, des feuilles CSS et des modules ES natifs chargés par `<script type="module">` suffisent. Aucune étape de build, aucune dépendance npm : le site se sert tel quel par nginx ou `serve`.

**Alternatives écartées.** Next.js ou Astro : une chaîne de build et des dépendances pour un contenu statique.

**Conséquences.** Les contenus sont codés en dur dans [`frontend-office-tourisme/assets/js/data/`](src:frontend-office-tourisme/assets/js/data/). La billetterie et la commande sont simulées dans le navigateur.

## Transverse

### Zod

**Pourquoi.** Zod valide les entrées HTTP (un fichier `*.validators.ts` par module, appliqué par `validate` dans [`backend/src/middlewares/validate.middleware.ts`](src:backend/src/middlewares/validate.middleware.ts)) et la configuration au démarrage ([`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts)). Le même outil transforme les données (adresse en minuscules, coercition des nombres, valeurs par défaut) et interdit les valeurs de développement en production.

**Alternatives écartées.** Joi ou Yup : moins bonne inférence des types TypeScript. class-validator : décorateurs, adapté à NestJS.

**Conséquences.** Le corps de la requête est remplacé par la version validée et transformée. Une erreur de validation renvoie 400 avec la liste `errors` des champs. Zod n'est pas utilisé par les clients.

### Docker

**Pourquoi.** Docker Compose démarre en une commande l'infrastructure locale (PostgreSQL, Redis, Mailpit, blockchain Hardhat avec contrats déployés et oracle VRF) et, avec le profil `app`, la stack complète. Les images de production sont multi-étapes, tournent avec l'utilisateur non privilégié et en système de fichiers en lecture seule (ancre `x-hardening` de [`docker-compose.yml`](src:docker-compose.yml)). Le service `migrate` applique les migrations une seule fois avant l'API.

**Alternatives écartées.** Installation manuelle des services : versions divergentes d'un poste à l'autre, et aucune chaîne locale prête à l'emploi.

**Conséquences.** La CI construit les images, les analyse avec Trivy (backend, web, tourisme) et valide `docker-compose.yml`. L'image de la chaîne locale ne sert qu'au développement et à la CI. Voir [Images Docker](../infrastructure/images.md).
