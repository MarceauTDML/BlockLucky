# BlockLucky Backend — Ville d'EtherBay

Backend API officiel de **BlockLucky**, la loterie citoyenne decentralisee de fin d'annee organisee par la **Ville d'EtherBay**.  
Ce serveur est developpe en **Node.js**, **Express 5** et **TypeScript 6**, propulse par **Prisma 7** (PostgreSQL), **Redis / BullMQ**, **Socket.IO**, **Ethers.js v6** et **Nodemailer (Mailpit)**.

---

## 1. Architecture et Stack Technique

- **Framework HTTP** : Express `5.3.x` + TypeScript `6.0.x`
- **ORM & Base de donnees** : Prisma `7.10.x` avec adaptateur natif `@prisma/adapter-pg` sur PostgreSQL 15
- **Cache & Files d'attente asynchrones** : Redis 7 (`ioredis` + `bullmq`) avec bascule memoire automatique de secours
- **Temps Reel (WebSockets)** : Socket.IO `4.8.x` (Salle d'attente 10 minutes avant tirage, Roulette Live, Chat en direct avec reactions)
- **Web3 & Smart Contracts** : Ethers.js `6.17.x` branché sur les contrats Solidity de `../smart-contract` (portefeuille Ethereum intégré par citoyen, dotation de bienvenue en ethers fictifs, tirage Chainlink VRF, POAP ERC-721, disjoncteur `pause`). Voir l'[ADR 0004](../docs/adr/0004-smart-contract-ethereum-portefeuille-integre.md).
- **Emails Transactionnels** : Nodemailer `10.3.x` + serveur SMTP local **Mailpit** sous Docker (5 templates HTML : OTP 2FA, Codes de secours, Suppression RGPD, Code Promo gagne, Bienvenue)
- **Securite & Conformite RGPD** : Helmet, CORS, Rate Limiting, Validation stricte Zod v4, Authentification JWT, RBAC (`USER`, `PARTNER`, `ADMIN`), 2FA (`TOTP` Google Authenticator & `EMAIL`), Verification legale `18+`, Export JSON RGPD et Anonymisation de compte.
- **Documentation API** : OpenAPI 3.0 / Swagger UI disponible sur `/api/docs`.

---

## 2. Arborescence du Dossier `backend/`

```text
backend/
├── .env.example
├── Dockerfile
├── eslint.config.mjs
├── nodemon.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── tsconfig.build.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── server.ts
│   ├── worker.ts
│   ├── app.ts
│   ├── config/
│   │   ├── env.config.ts
│   │   ├── prisma.config.ts
│   │   ├── redis.config.ts
│   │   ├── mailer.config.ts
│   │   └── swagger.config.ts
│   ├── api/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── lottery/
│   │   ├── marketplace/
│   │   ├── partners/
│   │   ├── user/
│   │   └── webhooks/
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── error.middleware.ts
│   ├── blockchain/
│   │   ├── abi/                     (ABI exportées par smart-contract, npm run export:abi)
│   │   ├── chain.client.ts          (fournisseur RPC, compte opérateur, repli RPC)
│   │   ├── wallet.service.ts        (portefeuilles citoyens chiffrés, dotation de bienvenue)
│   │   ├── lottery.gateway.ts       (appels au contrat et traduction des erreurs)
│   │   ├── lottery.indexer.ts       (projection des événements du contrat en base)
│   │   ├── lottery.keeper.ts        (tirage et clôture automatiques)
│   │   ├── chain-actions.ts         (file BullMQ : POAP, cagnotte, remboursements)
│   │   └── poap.metadata.ts         (métadonnées et visuel des badges)
│   ├── services/
│   │   ├── email.service.ts
│   │   ├── totp.service.ts
│   │   ├── blockchain.service.ts
│   │   ├── ledger.service.ts
│   │   └── s3.service.ts
│   ├── templates/
│   │   └── emails/
│   │       ├── otp-code.html
│   │       ├── 2fa-backup-codes.html
│   │       ├── gdpr-deletion.html
│   │       ├── reward-claim.html
│   │       └── welcome.html
│   ├── queues/
│   │   ├── emails.queue.ts
│   │   └── ledger.queue.ts
│   ├── workers/
│   │   ├── email.worker.ts
│   │   ├── ledger.worker.ts
│   │   └── blockchain-indexer.worker.ts
│   ├── socket/
│   │   ├── socket.handler.ts
│   │   ├── socket.middleware.ts
│   │   └── events/
│   │       ├── live-draw.events.ts
│   │       └── chat.events.ts
│   │   └── event-bridge.ts          (relais Redis des événements émis par le worker)
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── express.d.ts
│   │   └── socket.types.ts
│   └── utils/
│       ├── crypto.util.ts
│       ├── logger.util.ts
│       ├── pagination.util.ts
│       └── response.util.ts
└── __tests__/
    ├── __mocks__/
    ├── api/
    ├── chain/                       (tests sur un vrai nœud Hardhat, npm run test:chain)
    ├── integration/
    └── services/
```

---

## 3. Installation et Initialisation de A a Z

### Etape 1 : Demarrer l'infrastructure Docker (PostgreSQL, Redis, Mailpit, blockchain locale)

Depuis la racine du depot (`BlockLucky/`) :

```bash
docker compose up -d --wait
```

Services demarres :
- **Blockchain locale (nœud Hardhat)** : `http://127.0.0.1:8545`, chain ID `31337`, avec `BlockLucky`, `BlockLuckyPOAP` et un oracle Chainlink VRF simulé déjà déployés aux adresses par défaut de `.env.example`
- **PostgreSQL 15** : `localhost:5434` (Base : `blocklucky_db`)
- **Redis 7** : `localhost:6380`
- **Mailpit (Serveur SMTP + Interface Web d'emails)** :
  - Serveur SMTP : `localhost:1025`
  - Boite de reception Web : `http://localhost:8025`

### Etape 2 : Installer les dependances et configurer l'environnement

Placez-vous dans le dossier `backend` :

```bash
cd backend
cp .env.example .env
npm ci
```

### Etape 3 : Generer le client Prisma, appliquer les migrations et peupler la base (Seed)

```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

Le script de seed cree automatiquement :
- Le compte **Administrateur Mairie / DSI** (`maire@etherbay.fr` / role `ADMIN`)
- Le compte **Commercant Partenaire** (`boulangerie@etherbay.fr` / role `PARTNER`)
- Le compte **Citoyen Joueur** (`citoyen@etherbay.fr` / role `USER`)
- La session de **Loterie #1** ouverte (`OPEN`)
- Deux entreprises locales partenaires d'EtherBay avec leurs offres de recompenses en EtherPoints.

### Etape 4 : Demarrer le serveur Backend

En mode developpement (rechargement a chaud) :

```bash
npm run dev
```

En mode production :

```bash
npm run compile
npm start
```

Les workers BullMQ (emails, ledger) tournent par défaut dans le process de l'API. Pour les séparer, démarrer l'API avec `RUN_WORKERS=false` puis le process dédié :

```bash
npm run start:worker
```

Le process worker expose ses sondes sur le port `PORT + 1` (`/health/live`, `/metrics`).

Toute la configuration est validée au démarrage (`src/config/env.config.ts`). Une variable invalide arrête le serveur avec un message explicite. En `NODE_ENV=production`, les secrets de développement (`JWT_SECRET`, `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY`, `WEBHOOK_SECRET`) sont refusés.

- **Healthcheck API** : `http://localhost:2053/health`
- **Sondes** : `/health/live` (process), `/health/ready` (PostgreSQL joignable), `/health/deep` (diagnostic détaillé)
- **Métriques Prometheus** : `http://localhost:2053/metrics` (protégées par `METRICS_TOKEN` si défini)
- **Documentation Swagger UI** : `http://localhost:2053/api/docs`
- **Interface Web Mailpit (Emails recus)** : `http://localhost:8025`

---

## 4. Verification, Qualite et Tests

Verifier le typage TypeScript et le lint (dont `no-floating-promises`) :

```bash
npm run typecheck
npm run lint
npm run env:check
```

`env:check` vérifie que `.env.example` contient exactement les variables du schéma de configuration.

Les tests unitaires tournent en `BLOCKCHAIN_MODE=simulated`. Le test d'intégration sur une vraie blockchain enchaîne les étapes suivantes :

1. achat et cadeau signés par les portefeuilles intégrés ;
2. tirage Chainlink VRF ;
3. versement de la cagnotte et frappe des POAP ;
4. pause par le disjoncteur.

Il demande PostgreSQL, Redis et la blockchain locale démarrés, sur une base migrée et vierge :

```bash
npm run test:chain
```

| Variable | Rôle |
|---|---|
| `BLOCKCHAIN_MODE` | `onchain` (défaut, obligatoire en production) ou `simulated` (tests unitaires, développement sans nœud) |
| `RPC_URL`, `FALLBACK_RPC_URL`, `CHAIN_ID` | Nœud principal, nœud de secours et réseau attendu |
| `CHAIN_START_BLOCK`, `CHAIN_CONFIRMATIONS` | Bloc de déploiement du contrat et nombre de confirmations attendues par l'indexeur |
| `LOTTERY_CONTRACT_ADDRESS`, `POAP_CONTRACT_ADDRESS` | Adresses des contrats (`smart-contract/deployments/<réseau>.json`) |
| `RELAYER_PRIVATE_KEY` | Compte opérateur : rôles opérateur, pause et frappe sur les contrats, dotations de bienvenue |
| `WELCOME_GRANT_WEI` | Dotation versée une fois à chaque citoyen (0,1 ETH fictif par défaut) |
| `EXPLORER_URL` | Explorateur des liens de transaction (`https://sepolia.etherscan.io` sur Sepolia, vide en local) |
| `INDEXER_INTERVAL_MS`, `KEEPER_INTERVAL_MS` | Cadence de l'indexeur et du keeper |

Après un redémarrage de la blockchain locale, l'état de la chaîne est perdu : réinitialiser aussi la base (`npx prisma migrate reset`). Sinon, l'indexeur signale que son curseur dépasse la tête de chaîne.

Lancer la suite complete de tests unitaires et d'integration (Jest + Supertest) :

```bash
npm test
```

---

## 5. Resume des Endpoints Principaux

| Module | Methode | Route | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health` | Etat du serveur et indicateur de reseau RPC Fallback |
| **System** | `GET` | `/health/live`, `/health/ready`, `/health/deep` | Sondes de vivacite, de disponibilite et diagnostic detaille |
| **System** | `GET` | `/api/config` | Configuration runtime des clients (version mobile minimale, maintenance) |
| **System** | `GET` | `/metrics` | Metriques Prometheus (latence par route, event loop, files BullMQ) |
| **Auth** | `GET` | `/api/auth/onboarding` | Ecrans illustres de l'onboarding interactif |
| **Auth** | `POST` | `/api/auth/login` | Connexion sans mot de passe + verification legale 18+ : envoie un code a 6 chiffres par email |
| **Auth** | `POST` | `/api/auth/2fa/setup` | Configuration 2FA (QR Code TOTP ou Email OTP) |
| **Auth** | `POST` | `/api/auth/2fa/verify` | Validation du code email, TOTP ou de secours, delivre la session |
| **Auth** | `POST` | `/api/auth/logout` | Revocation de la session courante, ou de toutes avec `allDevices: true` |
| **Lottery** | `GET` | `/api/lottery/status` | Compte a rebours, jauge 10k FOMO, paliers et garanties |
| **Lottery** | `POST` | `/api/lottery/buy` | Achat de ticket en 1 clic signé par le portefeuille intégré + 50 EtherPoints + POAP |
| **Lottery** | `GET` | `/api/lottery/wallet` | Adresse, solde en ethers fictifs et dotation de bienvenue du portefeuille intégré |
| **Lottery** | `POST` | `/api/lottery/claim-prize` | Retrait de la cagnotte par le gagnant (normalement automatique) |
| **Lottery** | `GET` | `/api/lottery/poap/{tour}.json` | Métadonnées ERC-721 du badge POAP d'un tour (et visuel `{tour}.svg`) |
| **Lottery** | `POST` | `/api/lottery/gift` | Offrir un ticket a un proche par email (Cadeau viral) |
| **Lottery** | `GET` | `/api/lottery/my-tickets` | Historique des transactions (liens vers l'explorateur) et galerie POAP |
| **Lottery** | `GET` | `/api/lottery/leaderboard` | Classement anonymise des meilleurs ambassadeurs |
| **Lottery** | `POST` | `/api/lottery/draw` | Tirage au sort certifie Chainlink VRF (`ADMIN`) |
| **Lottery** | `POST` | `/api/lottery/refund` | Annulation et remboursement automatique Auto-Refund (`ADMIN`) |
| **Marketplace** | `GET` | `/api/marketplace/catalog` | Catalogue des commercants partenaires d'EtherBay |
| **Marketplace** | `GET` | `/api/marketplace/points` | Solde dynamique d'EtherPoints et historique du Ledger |
| **Marketplace** | `POST` | `/api/marketplace/claim` | Grattage virtuel (Scratch Card) et generation de code promo |
| **Marketplace** | `GET` | `/api/marketplace/my-codes` | Wallet de recompenses avec QR Codes a scanner en magasin |
| **Marketplace** | `POST` | `/api/marketplace/redeem` | Validation d'un code promo client en magasin (`PARTNER`/`ADMIN`) |
| **Partners** | `POST` | `/api/partners/offers` | Creation d'une offre partenaire locale |
| **Partners** | `POST` | `/api/partners/codes/upload` | Injection de codes promos uniques par lot CSV / JSON |
| **Partners** | `GET` | `/api/partners/:partnerId/consumption` | Indicateur circulaire de consommation des codes |
| **User & RGPD** | `GET` | `/api/user/profile` | Profil citoyen, statistiques et preferences |
| **User & RGPD** | `GET` | `/api/user/referrals` | Lien de parrainage unique et boutons WhatsApp/Twitter/SMS |
| **User & RGPD** | `POST` | `/api/user/quests/complete` | Validation d'une quete sociale pour gagner des EtherPoints |
| **User & RGPD** | `PUT` | `/api/user/responsible-limit` | Jauge d'auto-limitation d'achat (Jeu Responsable) |
| **User & RGPD** | `GET` | `/api/user/gdpr/export` | Export complet des donnees personnelles au format JSON |
| **User & RGPD** | `POST` | `/api/user/gdpr/delete-request` | Demande de suppression RGPD avec email de confirmation |
| **User & RGPD** | `POST` | `/api/user/gdpr/confirm-delete` | Anonymisation et suppression definitive du compte |
| **Analytics** | `POST` | `/api/analytics/track` | Suivi d'evenements et tags UTM |
| **Analytics** | `GET` | `/api/analytics/dashboard` | Graphiques demographiques (18-35 ans) et courbes UTM (`ADMIN`) |
| **Admin Mairie** | `GET` | `/api/admin/dashboard` | Tableau de bord central Mairie (KPIs globaux) (`ADMIN`) |
| **Admin Mairie** | `POST` | `/api/admin/circuit-breaker` | Interrupteur d'urgence du Smart Contract (`ADMIN`) |
| **Admin Mairie** | `POST` | `/api/admin/treasury/withdraw` | Retrait de tresorerie vers portefeuille Multi-Sig (`ADMIN`) |
| **Admin Mairie** | `GET` | `/api/admin/reports/export` | Export des rapports comptables en CSV ou PDF (`ADMIN`) |
| **Admin Mairie** | `GET` | `/api/admin/audit-logs` | Journal chronologique des actions d'administration (`ADMIN`) |
| **Webhooks** | `POST` | `/api/webhooks/blockchain` | Indexation des evenements en mode `simulated` uniquement (signature HMAC `x-webhook-signature` obligatoire) ; en mode `onchain`, l'indexeur lit directement la chaine et ce webhook repond 409 |

Toutes les routes `/api/*` sont aussi servies sous le préfixe versionné `/api/v1/*`. Les nouveaux clients doivent utiliser `/api/v1`.

Le webhook blockchain doit être signé : `x-webhook-signature: t=<timestamp unix>,v1=<HMAC-SHA-256 hexadécimal de "t.corps brut" avec WEBHOOK_SECRET>`. Une signature de plus de 5 minutes est refusée et un même envoi rejoué est ignoré pendant 7 jours. La fonction `signWebhookPayload` de `src/api/webhooks/webhook-signature.ts` produit cet en-tête.

La connexion exige un code envoyé par email (`LOGIN_EMAIL_CODE_REQUIRED`) et les routes d'administration exigent la double authentification (`ADMIN_MFA_REQUIRED`). Ces deux protections ne peuvent pas être désactivées en production ; la suite de tests les désactive dans `__tests__/setup-env.ts` et les vérifie dans `__tests__/api/auth-security.test.ts`. Les mesures de sécurité sont détaillées dans [docs/securite.md](../docs/securite.md).

Les endpoints `POST /api/lottery/buy`, `POST /api/lottery/gift` et `POST /api/marketplace/claim` acceptent un en-tête `Idempotency-Key` (8 à 128 caractères `[A-Za-z0-9_-]`) : une requête rejouée avec la même clé renvoie la réponse initiale (en-tête `Idempotent-Replayed: true`) au lieu de créer un doublon.
