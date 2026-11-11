# Architecture

Diagrammes au format C4 (contexte, conteneurs), versionnés en Mermaid. Ils se mettent à jour dans la même pull request que le changement d'architecture.

## Niveau 1 : contexte

```mermaid
flowchart LR
  citoyen([Citoyen d'EtherBay])
  partenaire([Commerçant partenaire])
  mairie([Mairie / DSI])
  visiteur([Visiteur])

  blocklucky[[BlockLucky<br/>Loterie citoyenne et fidélité]]
  tourisme[[Office de Tourisme<br/>Site vitrine]]

  blockchain[(Réseau Ethereum<br/>Sepolia / Hardhat local)]
  smtp[(Serveur SMTP)]
  s3[(Stockage objet S3)]

  citoyen -->|achète des tickets, échange ses EtherPoints| blocklucky
  partenaire -->|publie des offres, valide des codes| blocklucky
  mairie -->|pilote le tirage, la trésorerie et les rapports| blocklucky
  visiteur -->|découvre la ville, réserve| tourisme
  tourisme -->|lien vers la loterie| blocklucky
  blocklucky -->|transactions des portefeuilles intégrés, indexation des événements| blockchain
  vrf[(Chainlink VRF)]
  blockchain <-->|demande et preuve d'aléa| vrf
  blocklucky -->|emails transactionnels| smtp
  blocklucky -->|exports, visuels| s3
```

## Niveau 2 : conteneurs

```mermaid
flowchart TB
  subgraph clients[Clients]
    web[frontend-web<br/>Next.js 16]
    mobile[mobile-app<br/>Expo / React Native]
    office[frontend-office-tourisme<br/>HTML statique]
  end

  subgraph backend[backend]
    api[API Express 5<br/>REST /api/v1 + Socket.IO]
    worker[Worker<br/>BullMQ emails, ledger, actions on-chain<br/>indexeur et keeper de la loterie]
  end

  pg[(PostgreSQL 15<br/>données métier)]
  redis[(Redis 7<br/>files BullMQ, état, rate limit)]
  mail[(Mailpit / SMTP)]
  chain[(Nœud Ethereum RPC<br/>principal + fallback)]
  contracts[[Smart contracts<br/>BlockLucky, BlockLuckyPOAP]]

  web -->|HTTPS JSON, WebSocket| api
  mobile -->|HTTPS JSON, WebSocket| api
  office -.->|lien| web
  api -->|Prisma, pool pg| pg
  api -->|ioredis| redis
  worker -->|consomme les jobs| redis
  worker -->|Prisma| pg
  worker -->|SMTP| mail
  api -->|ethers.js : achats signés, disjoncteur| chain
  worker -->|ethers.js : lecture des événements, tirage, POAP, cagnotte| chain
  chain --- contracts
  worker -.->|événements temps réel via Redis pub/sub| api
```

## Organisation du backend

Le backend est un monolithe modulaire : un dossier par domaine dans `backend/src/api/` (`auth`, `lottery`, `marketplace`, `partners`, `user`, `analytics`, `admin`, `webhooks`, `system`), chacun découpé en `routes` → `controllers` → `services` → `repo`. Les routes restent fines, la logique métier vit dans les services et l'accès aux données dans les repositories.

| Préoccupation | Emplacement |
|---|---|
| Configuration validée au démarrage | `src/config/env.config.ts` |
| Pools PostgreSQL et Redis | `src/config/prisma.config.ts`, `src/config/redis.config.ts` |
| Contexte de requête, logs, métriques, arrêt propre | `src/observability/` |
| Middlewares transverses (auth, RBAC, validation, rate limit, idempotence, erreurs) | `src/middlewares/` |
| Files et workers asynchrones | `src/queues/`, `src/workers/`, `src/worker.ts` |
| Blockchain : portefeuilles intégrés, appels au contrat, indexeur, keeper, actions on-chain | `src/blockchain/` (voir l'[ADR 0004](adr/0004-smart-contract-ethereum-portefeuille-integre.md)) |

## Flux d'une requête

1. `requestContextMiddleware` attribue un `X-Request-Id` (repris de l'appelant ou de `traceparent` s'il est valide), propagé dans tous les logs via `AsyncLocalStorage`.
2. Les métriques Prometheus enregistrent la durée par route paramétrée.
3. Helmet, CORS (liste blanche `FRONTEND_URL` + `CORS_ORIGINS`), parsing JSON borné, mode maintenance, rate limit partagé dans Redis.
4. Routeur `/api/v1` (alias `/api`), authentification JWT, RBAC, validation Zod, idempotence sur les POST sensibles.
5. Le middleware d'erreur unique traduit les erreurs métier (`AppError`), JSON invalide, contraintes PostgreSQL (unicité, CHECK, timeouts) et masque les messages internes en production.
