# Objectifs de service, sauvegardes et reprise

Objectifs cibles pour la période de la Grande Loterie citoyenne. Ils servent de référence aux seuils des tests de charge (`load-tests/`) et aux futures alertes.

## Indicateurs et objectifs (SLI / SLO)

Fenêtre glissante de 28 jours.

| Parcours | Indicateur (SLI) | Objectif (SLO) | Source |
|---|---|---|---|
| Consultation de la loterie (`GET /api/v1/lottery/status`) | Requêtes réussies en moins de 300 ms | 99,5 % | `http_request_duration_seconds` |
| Achat de ticket (`POST /api/v1/lottery/buy`) | Requêtes non 5xx en moins de 800 ms | 99,9 % | `http_request_duration_seconds` |
| Échange de récompense (`POST /api/v1/marketplace/claim`) | Requêtes non 5xx | 99,9 % | `http_request_duration_seconds` |
| Emails transactionnels | Jobs terminés sans passer en échec définitif | 99 % | `queue_jobs_total` |

Budget d'erreur : 0,1 % de requêtes en erreur sur l'achat de ticket, soit environ 40 minutes d'indisponibilité totale sur 28 jours. Si le budget est consommé, les déploiements de fonctionnalités s'arrêtent au profit des corrections de fiabilité.

Une alerte ne doit se déclencher que sur la consommation du budget (burn rate), par exemple 14,4 fois le rythme nominal sur 1 h et sur 5 min, et jamais sur une cause (CPU, mémoire) seule.

## Sauvegardes, RPO et RTO

| Donnée | Source de vérité | RPO cible | RTO cible | Mécanisme actuel |
|---|---|---|---|---|
| Comptes, tickets, EtherPoints, récompenses | PostgreSQL | 24 h | 1 h | `pg_dump` manuel (voir `runbooks.md`) |
| Files de jobs, préférences, quêtes | Redis | 1 s | 15 min | AOF `appendfsync everysec` sur le volume `redisdata` |
| Tickets, tirages, cagnottes | Smart contract BlockLucky | 0 | réindexation | Indexeur idempotent sur `(tour, numéro de ticket)` : remettre le curseur `ChainCursor` au bloc de déploiement pour reconstruire la base depuis la chaîne |

La restauration est testée en restaurant un dump dans une base temporaire (procédure dans `runbooks.md`).

## Capacité

- Pool PostgreSQL : `DB_POOL_MAX` (10 par défaut) connexions par instance d'API ou de worker. `max_connections` est fixé à 100 : au-delà de 8 instances, ajouter PgBouncer en mode transaction.
- Timeouts PostgreSQL appliqués à chaque connexion de l'application : `statement_timeout` 15 s, `lock_timeout` 5 s, `idle_in_transaction_session_timeout` 60 s.
- HTTP : `keepAliveTimeout` 65 s (supérieur à l'idle timeout de 60 s des load balancers courants), `headersTimeout` 66 s, `requestTimeout` 30 s.
- Arrêt propre : sur SIGTERM, la readiness passe à 503, le serveur HTTP cesse d'accepter des connexions, Socket.IO, les workers BullMQ, les files, Prisma et Redis sont fermés dans l'ordre, avec un arrêt forcé après `SHUTDOWN_TIMEOUT_MS` (25 s).
