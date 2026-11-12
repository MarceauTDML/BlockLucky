# Objectifs de service et métriques

Cette page fixe les objectifs de service de BlockLucky pour la période de la Grande Loterie citoyenne, décrit les métriques que le backend expose et donne les règles de dimensionnement. Les objectifs servent de référence aux seuils des [tests de charge](tests-charge.md).

> [!NOTE]
> Le dépôt expose les métriques au format Prometheus mais ne fournit ni serveur Prometheus, ni tableau de bord, ni règle d'alerte. Les requêtes PromQL de cette page sont prêtes à l'emploi le jour où une collecte est branchée.

## Indicateurs et objectifs

Fenêtre glissante de 28 jours.

| Parcours | Indicateur (SLI) | Objectif (SLO) | Source |
| --- | --- | --- | --- |
| Consultation de la loterie (`GET /api/v1/lottery/status`) | part des requêtes en 2xx servies en moins de 250 ms | 99,5 % | `http_request_duration_seconds` |
| Achat de ticket (`POST /api/v1/lottery/buy`) | part des requêtes non 5xx servies en moins de 800 ms | 99,9 % | `http_request_duration_seconds` |
| Échange de récompense (`POST /api/v1/marketplace/claim`) | part des requêtes non 5xx | 99,9 % | `http_request_duration_seconds` |
| Emails transactionnels | part des jobs terminés sans échec définitif | 99 % | `queue_jobs_total{queue="emails-queue"}` |
| Indexation de la chaîne | retard du curseur d'indexation sur la tête de chaîne | moins de 10 blocs, 99 % du temps | table `ChainCursor`, pas encore de métrique |

L'ancienne version de ces objectifs fixait 300 ms pour la consultation. Les seaux de l'histogramme (`0.25` puis `0.5`) ne permettent pas de mesurer ce seuil exactement : l'objectif est ramené au seuil mesurable le plus proche, 250 ms. Pour revenir à 300 ms, il faut ajouter `0.3` à la liste `buckets` de [`metrics.ts`](src:backend/src/observability/metrics.ts).

L'achat de ticket attend la confirmation de la transaction sur la chaîne (`tx.wait()` dans [`lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts)). Sur le nœud Hardhat local, le minage est immédiat et l'objectif de 800 ms est réaliste. Sur Sepolia, un bloc est produit environ toutes les 12 secondes : cet objectif de latence n'a pas de sens et seul l'objectif de disponibilité s'applique.

### Budget d'erreur

Un objectif de 99,9 % sur 28 jours autorise 0,1 % de requêtes en échec, soit l'équivalent d'environ 40 minutes d'indisponibilité totale (28 × 24 × 60 × 0,001 = 40,3 minutes). Quand le budget est consommé, les livraisons de fonctionnalités s'arrêtent au profit des corrections de fiabilité.

### Alertes

Une alerte se déclenche sur la vitesse de consommation du budget (burn rate), jamais sur une cause seule comme le processeur ou la mémoire. Une règle courante : alerter quand le taux d'erreur dépasse 14,4 fois le rythme nominal à la fois sur 1 heure et sur 5 minutes. À ce rythme, 2 % du budget mensuel part en une heure ; la fenêtre courte évite une alerte qui continuerait de sonner après la fin du problème.

```text
(
  sum(rate(http_request_duration_seconds_count{route=~"/api(/v1)?/lottery/buy",status_code=~"5.."}[1h]))
  / sum(rate(http_request_duration_seconds_count{route=~"/api(/v1)?/lottery/buy"}[1h]))
) > 14.4 * 0.001
and
(
  sum(rate(http_request_duration_seconds_count{route=~"/api(/v1)?/lottery/buy",status_code=~"5.."}[5m]))
  / sum(rate(http_request_duration_seconds_count{route=~"/api(/v1)?/lottery/buy"}[5m]))
) > 14.4 * 0.001
```

## Métriques exposées

Les métriques sont définies dans [`backend/src/observability/metrics.ts`](src:backend/src/observability/metrics.ts) avec `prom-client`, dans un registre qui ajoute à chaque série les étiquettes `service="blocklucky-backend"` et `environment` (valeur de `NODE_ENV`).

| Métrique | Type | Étiquettes | Contenu |
| --- | --- | --- | --- |
| `http_request_duration_seconds` | histogramme | `method`, `route`, `status_code` | Durée de chaque requête HTTP. Seaux : 10, 25, 50, 100, 250, 500, 800 ms, 1, 2,5 et 5 s |
| `http_requests_in_flight` | jauge | aucune | Requêtes en cours de traitement |
| `queue_jobs_total` | compteur | `queue`, `status` | Jobs BullMQ terminés (`completed`) ou en échec (`failed`) par file : `emails-queue`, `ledger-queue`, `chain-actions` |
| `business_events_total` | compteur | `event` | Événements métier, voir ci-dessous |
| métriques par défaut | divers | | Processus Node.js : mémoire, processeur, ramasse-miettes, descripteurs, lag de l'event loop (`nodejs_eventloop_lag_p99_seconds`, précision 20 ms) |

Les métriques par défaut ne sont pas collectées quand `METRICS_ENABLED=false` ou quand `NODE_ENV=test`.

### Étiquette route

L'étiquette `route` vaut `req.baseUrl` suivi du chemin déclaré dans le routeur, par exemple `/api/v1/lottery/rewards/:id` et non l'identifiant réel : le nombre de séries reste borné. Comme les routes sont montées deux fois, sous `/api/v1` et sous `/api`, une même route produit deux valeurs selon le préfixe appelé par le client ; les requêtes PromQL utilisent donc l'expression `/api(/v1)?/…`. Une requête qui ne correspond à aucune route (404) est étiquetée `unmatched`.

### Événements métier

| Valeur de `event` | Émis par | Moment |
| --- | --- | --- |
| `ticket_purchased` | [`lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts) | achat ou cadeau réussi, incrémenté de la quantité |
| `ticket_indexed` | [`lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts) | tickets créés en base depuis un événement `TicketsPurchased` |
| `reward_claimed` | [`marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) | échange d'une récompense |
| `scratch_ticket_bought` | [`marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) | achat d'un ticket à gratter en EtherPoints |
| `points_credited_<action>`, `points_debited_<action>` | [`ledger.service.ts`](src:backend/src/services/ledger.service.ts) | mouvement d'EtherPoints, `<action>` étant le type d'action en minuscules (par exemple `ticket_purchase`) |

### Où lire les métriques

| Processus | Adresse | Protection |
| --- | --- | --- |
| API | `GET /metrics` sur le port 2053 | si `METRICS_TOKEN` est défini, en-tête `Authorization: Bearer <METRICS_TOKEN>` exigé, sinon 401 ; obligatoire en production |
| Worker | `GET /metrics` sur le port `PORT + 1` (2054) | aucune ; le port n'est pas publié par Compose et n'est joignable que depuis le réseau interne |

```bash
curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:2053/metrics | grep http_request_duration_seconds_count
```

> [!IMPORTANT]
> Dans la stack Docker, l'API tourne avec `RUN_WORKERS=false` : les compteurs `queue_jobs_total` et `ticket_indexed` sont incrémentés dans le processus `worker`, pas dans l'API. Le `/metrics` de l'API ne les montre donc pas. Une collecte complète doit interroger aussi `worker:2054/metrics` depuis le réseau Compose. En développement, un seul processus porte tout.

### Requêtes utiles

Taux de réussite de la consultation sous 250 ms, sur 5 minutes :

```text
sum(rate(http_request_duration_seconds_bucket{route=~"/api(/v1)?/lottery/status",status_code=~"2..",le="0.25"}[5m]))
/
sum(rate(http_request_duration_seconds_count{route=~"/api(/v1)?/lottery/status"}[5m]))
```

95e centile de la latence par route :

```text
histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
```

Taux d'échec des emails :

```text
sum(rate(queue_jobs_total{queue="emails-queue",status="failed"}[1h]))
/
sum(rate(queue_jobs_total{queue="emails-queue"}[1h]))
```

`status="failed"` compte chaque tentative en échec, y compris celles qui seront réessayées (cinq tentatives par job). C'est une borne haute du taux d'échec définitif.

## Sondes de santé

Définies dans [`system.routes.ts`](src:backend/src/api/system/system.routes.ts), hors rate limiting et hors mode maintenance :

| Route | Vérifie | Codes | Usage |
| --- | --- | --- | --- |
| `/health/live` | le processus répond | 200 | sonde Docker de l'API |
| `/health/ready` | PostgreSQL répond à `SELECT 1` en moins de 2 s, et l'arrêt n'est pas commencé | 200 ou 503 | retirer une instance d'un équilibreur |
| `/health/deep` | PostgreSQL, Redis (`ping` en 1 s) et état du réseau blockchain, mis en cache 5 s | 200 ou 503 | diagnostic ; le détail n'est visible qu'avec le jeton `METRICS_TOKEN` en production |
| `/health` | état du disjoncteur et du RPC de secours | 200 | historique ; interroge le contrat mais ne teste ni la base ni Redis |
| `/api/config` | version mobile minimale, mode maintenance | 200 | prévu pour les clients, qui ne l'appellent pas encore |

`/health/deep` répond `pass` si tout va bien, `warn` si Redis est absent (l'API fonctionne en mode dégradé, voir l'[ADR 0002](../architecture/adr/0002-redis-files-et-repli-memoire.md)) et `fail` avec un statut 503 si PostgreSQL est injoignable.

## Capacité

### PostgreSQL

Chaque processus (API ou worker) ouvre un pool de `DB_POOL_MAX` connexions, 10 par défaut ([`prisma.config.ts`](src:backend/src/config/prisma.config.ts)). Le serveur accepte `max_connections=100`, dont 3 réservées par défaut aux superutilisateurs. Au-delà de 8 processus, il faut réduire `DB_POOL_MAX` ou placer PgBouncer en mode transaction devant PostgreSQL.

Chaque connexion de l'application est ouverte avec :

| Paramètre | Valeur | Variable |
| --- | --- | --- |
| `statement_timeout` | 15 s | `DB_STATEMENT_TIMEOUT_MS` |
| `lock_timeout` | 5 s | codé en dur |
| `idle_in_transaction_session_timeout` | 60 s | codé en dur, aussi fixé côté serveur |
| délai de connexion | 5 s | `DB_CONNECTION_TIMEOUT_MS` |
| fermeture d'une connexion inactive du pool | 30 s | `DB_IDLE_TIMEOUT_MS` |

### HTTP

Réglés dans [`server.ts`](src:backend/src/server.ts) :

| Réglage | Valeur | Raison |
| --- | --- | --- |
| `keepAliveTimeout` | 65 s (`HTTP_KEEP_ALIVE_TIMEOUT_MS`) | supérieur au délai d'inactivité de 60 s des équilibreurs courants, pour que ce soit toujours l'équilibreur qui ferme la connexion |
| `headersTimeout` | 66 s | doit dépasser `keepAliveTimeout` |
| `requestTimeout` | 30 s (`HTTP_REQUEST_TIMEOUT_MS`) | coupe une requête trop longue |
| corps JSON | 1 Mo | `express.json({ limit: '1mb' })` |
| tas V8 | 384 Mo | `--max-old-space-size=384` dans l'image |

### Redis

256 Mo avec la politique `noeviction` : une fois plein, Redis refuse les écritures. Les jobs terminés sont gardés 24 heures (1 000 au plus par file), les jobs en échec 14 jours ([`queue.options.ts`](src:backend/src/queues/queue.options.ts)). Surveiller `used_memory` avec `redis-cli INFO memory`.

### Blockchain

Le keeper interroge le contrat toutes les `KEEPER_INTERVAL_MS` (10 s) et l'indexeur lit les journaux toutes les `INDEXER_INTERVAL_MS` (3 s), par tranches de 2 000 blocs au plus. Les actions on-chain (versement de cagnotte, remboursements, badges) sont traitées une à une (`concurrency: 1`) pour ne pas désordonner les nonces du compte opérateur.

## Arrêt propre

Sur `SIGTERM` ou `SIGINT`, [`shutdown.ts`](src:backend/src/observability/shutdown.ts) :

1. marque l'arrêt : `/health/ready` répond 503 (et la sonde du worker aussi) ;
2. ferme dans l'ordre le serveur HTTP (connexions inactives coupées), le relais d'événements Socket.IO, Socket.IO, l'indexeur et le keeper, les workers BullMQ, les files, le client blockchain, Prisma et Redis ;
3. quitte avec le code 0, ou force l'arrêt avec le code 1 après `SHUTDOWN_TIMEOUT_MS` (25 s).

Une promesse rejetée non gérée déclenche aussi l'arrêt en production, et une exception non capturée dans tous les environnements.
