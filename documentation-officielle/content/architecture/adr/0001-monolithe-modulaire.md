# 0001 Monolithe modulaire plutôt que microservices

- Statut : accepté
- Date : 2026-11-10

## Contexte

L'équipe est une seule équipe projet. Le trafic attendu (une ville de 120 000 habitants, pic au moment du tirage) tient sur une instance d'API correctement dimensionnée. Les domaines (loterie, fidélité, partenaires, administration) partagent les mêmes utilisateurs et les mêmes transactions de points.

## Décision

Le backend reste un monolithe modulaire déployé comme une seule image, avec un découpage par domaine dans `backend/src/api/<domaine>` et une couche `repo` par domaine. Les traitements asynchrones (emails, ledger) tournent dans un process worker séparé construit à partir de la même image (`src/worker.ts`), pour pouvoir les dimensionner indépendamment de l'API.

## Conséquences

- Un seul déploiement, une seule base, des transactions ACID entre domaines.
- Un module ne sera extrait en service que s'il a des besoins de scaling ou d'équipe distincts, et cette extraction fera l'objet d'un nouvel ADR (pattern Strangler Fig).
- Les modules ne doivent pas importer les fichiers internes d'un autre module. Cette règle n'est pas encore outillée (dependency-cruiser) et repose sur la revue de code.

## Vérification dans le code

Cette section confronte la décision au dépôt actuel. Elle ne modifie pas la décision.

### Ce qui est conforme

| Élément de la décision | Constat | Où |
|---|---|---|
| Une seule image | Le Dockerfile du backend produit la cible `runtime`, utilisée par les services `backend` et `worker` de Docker Compose ; seule la commande change (`dist/src/server.js` ou `dist/src/worker.js`) | [`backend/Dockerfile`](src:backend/Dockerfile), [`docker-compose.yml`](src:docker-compose.yml) |
| Découpage par domaine | Neuf dossiers dans `src/api/` : `admin`, `analytics`, `auth`, `lottery`, `marketplace`, `partners`, `system`, `user`, `webhooks` | [`backend/src/api/`](src:backend/src/api/) |
| Une couche `repo` par domaine | Présente pour `admin`, `analytics`, `auth`, `lottery`, `marketplace`, `partners`, `user`. `system` et `webhooks` n'en ont pas : le premier interroge directement Prisma et Redis pour les sondes, le second délègue à l'indexeur de simulation | [`backend/src/api/system/system.routes.ts`](src:backend/src/api/system/system.routes.ts), [`backend/src/api/webhooks/blockchain.webhook.ts`](src:backend/src/api/webhooks/blockchain.webhook.ts) |
| Process worker séparé | `src/worker.ts` démarre les workers BullMQ et expose ses sondes sur `PORT + 1` | [`backend/src/worker.ts`](src:backend/src/worker.ts) |
| Une seule base | Un seul `DATABASE_URL`, un seul schéma Prisma | [`backend/src/config/prisma.config.ts`](src:backend/src/config/prisma.config.ts) |

### Écarts

**Le worker fait plus que les emails et le ledger.** Depuis l'[ADR 0004](0004-smart-contract-portefeuille-integre.md), il porte aussi la file `chain-actions` (`startChainActionsWorker` dans [`backend/src/workers/index.ts`](src:backend/src/workers/index.ts)), l'indexeur et le keeper de la loterie (`startChainServices` dans [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts)).

**Le process séparé n'est pas le comportement par défaut.** `RUN_WORKERS` vaut `true` par défaut dans [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) : lancé seul (`npm run dev`), le process API exécute aussi les workers, l'indexeur et le keeper. Seul Docker Compose fixe `RUN_WORKERS: "false"` sur le service `backend` et démarre un service `worker` distinct.

**La file `ledger-queue` n'a pas de producteur.** Le worker [`backend/src/workers/ledger.worker.ts`](src:backend/src/workers/ledger.worker.ts) consomme `ledger-queue`, mais aucune ligne de `src/` n'appelle `enqueueLedgerTransaction` ([`backend/src/queues/ledger.queue.ts`](src:backend/src/queues/ledger.queue.ts)). Tous les crédits et débits d'EtherPoints passent directement par `ledgerService`, de façon synchrone.

**Des modules importent les fichiers internes d'autres modules.** La règle de la troisième conséquence n'est pas respectée à quatre endroits :

| Fichier | Import |
|---|---|
| [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts) | `../auth/auth.repo` |
| [`backend/src/api/marketplace/marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) | `../auth/auth.repo` et `../partners/partners.services` (`assertPartnerAccess`) |
| [`backend/src/api/admin/admin.services.ts`](src:backend/src/api/admin/admin.services.ts) | `../analytics/analytics.services` |

Aucun outil (dependency-cruiser ou règle ESLint `no-restricted-imports`) n'est configuré dans [`backend/eslint.config.mjs`](src:backend/eslint.config.mjs). Pour respecter la règle, l'accès aux utilisateurs utilisé par plusieurs domaines pourrait être déplacé dans `src/services/`, à côté de `ledger.service.ts`.

## Pour aller plus loin

- [Vue d'ensemble](../vue-ensemble.md) : diagramme des conteneurs et répartition entre l'API et le worker.
- [Structure et cycle d'une requête](../../backend/structure.md) : découpage routes, controllers, services, repo.
- [Files et workers](../../backend/files-workers.md) : les trois files BullMQ.
