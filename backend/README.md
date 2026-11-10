# BlockLucky Backend — Ville d'EtherBay

Backend API officiel de **BlockLucky**, la loterie citoyenne decentralisee de fin d'annee organisee par la **Ville d'EtherBay**.  
Ce serveur est developpe en **Node.js**, **Express 5** et **TypeScript 6**, propulse par **Prisma 7** (PostgreSQL), **Redis / BullMQ**, **Socket.IO**, **Ethers.js v6** et **Nodemailer (Mailpit)**.

---

## 1. Architecture et Stack Technique

- **Framework HTTP** : Express `5.3.x` + TypeScript `6.0.x`
- **ORM & Base de donnees** : Prisma `7.10.x` avec adaptateur natif `@prisma/adapter-pg` sur PostgreSQL 15
- **Cache & Files d'attente asynchrones** : Redis 7 (`ioredis` + `bullmq`) avec bascule memoire automatique de secours
- **Temps Reel (WebSockets)** : Socket.IO `4.8.x` (Salle d'attente 10 minutes avant tirage, Roulette Live, Chat en direct avec reactions)
- **Web3 & Smart Contracts** : Ethers.js `6.17.x` (Relayer d'achat Gasless 1-clic, Tirage certifie Chainlink VRF, Galerie NFT POAP, Circuit Breaker, Retrait Multi-Signatures)
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
    ├── integration/
    └── services/
```

---

## 3. Installation et Initialisation de A a Z

### Etape 1 : Demarrer l'infrastructure Docker (PostgreSQL, Redis, Mailpit)

Depuis la racine du depot (`BlockLucky/`) :

```bash
docker compose up -d
```

Services demarres :
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
| **Auth** | `POST` | `/api/auth/login` | Social Login Web3Auth + Verification legale 18+ |
| **Auth** | `POST` | `/api/auth/2fa/setup` | Configuration 2FA (QR Code TOTP ou Email OTP) |
| **Auth** | `POST` | `/api/auth/2fa/verify` | Validation du code OTP a 6 chiffres |
| **Lottery** | `GET` | `/api/lottery/status` | Compte a rebours, jauge 10k FOMO, paliers et garanties |
| **Lottery** | `POST` | `/api/lottery/buy` | Achat de ticket en 1 clic (Gasless) + 50 EtherPoints + POAP |
| **Lottery** | `POST` | `/api/lottery/gift` | Offrir un ticket a un proche par email (Cadeau viral) |
| **Lottery** | `GET` | `/api/lottery/my-tickets` | Historique de transparence Etherscan & Galerie POAP |
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
| **Webhooks** | `POST` | `/api/webhooks/blockchain` | Indexation temps reel des evenements Smart Contract (en-tete `x-webhook-secret` obligatoire) |

Toutes les routes `/api/*` sont aussi servies sous le préfixe versionné `/api/v1/*`. Les nouveaux clients doivent utiliser `/api/v1`.

Les endpoints `POST /api/lottery/buy`, `POST /api/lottery/gift` et `POST /api/marketplace/claim` acceptent un en-tête `Idempotency-Key` (8 à 128 caractères `[A-Za-z0-9_-]`) : une requête rejouée avec la même clé renvoie la réponse initiale (en-tête `Idempotent-Replayed: true`) au lieu de créer un doublon.
