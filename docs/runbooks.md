# Runbooks d'exploitation

Procédures pour l'environnement Docker Compose du dépôt. Chaque runbook doit être relu et corrigé après un incident qui l'a utilisé.

## Diagnostiquer l'API

1. `curl http://localhost:2053/health/live` : le process répond-il ?
2. `curl http://localhost:2053/health/ready` : PostgreSQL est-il joignable ? (503 si non, ou si l'arrêt est en cours)
3. `curl http://localhost:2053/health/deep` : état et latence de PostgreSQL, Redis et du réseau blockchain.
4. `curl http://localhost:2053/metrics` : latence par route (`http_request_duration_seconds`), requêtes en cours, lag de l'event loop (`nodejs_eventloop_lag_p99_seconds`), jobs BullMQ (`queue_jobs_total`).
5. Retrouver une requête précise : l'en-tête de réponse `X-Request-Id` est présent dans chaque ligne de log de cette requête.

```bash
docker compose logs backend --since 15m | grep "<request-id>"
```

## Requêtes lentes PostgreSQL

Les requêtes de plus de 500 ms sont journalisées par PostgreSQL et `pg_stat_statements` est activé.

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT round(total_exec_time) AS total_ms, calls, round(mean_exec_time::numeric, 1) AS mean_ms, left(query, 120) AS query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

Sur un volume créé avant l'ajout de `docker/postgres/init`, créer l'extension une fois :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

Requêtes bloquées et verrous :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT pid, state, wait_event_type, now() - query_start AS duration, pg_blocking_pids(pid) AS blocked_by, left(query, 80) FROM pg_stat_activity WHERE datname = 'blocklucky_db' AND state <> 'idle' ORDER BY duration DESC;"
```

## Sauvegarder et restaurer la base

Sauvegarde logique :

```bash
docker compose exec -T postgres pg_dump -U etherbay_admin -d blocklucky_db -Fc > backup-$(date +%Y%m%d-%H%M).dump
```

Test de restauration dans une base temporaire, sans toucher à `blocklucky_db` :

```bash
docker compose exec -T postgres createdb -U etherbay_admin blocklucky_restore_test
docker compose exec -T postgres pg_restore -U etherbay_admin -d blocklucky_restore_test --no-owner < backup-AAAAMMJJ-HHMM.dump
docker compose exec -T postgres psql -U etherbay_admin -d blocklucky_restore_test -c 'SELECT count(*) FROM "User";'
docker compose exec -T postgres dropdb -U etherbay_admin blocklucky_restore_test
```

Restauration réelle (destructive, arrêter l'API avant) :

```bash
docker compose stop backend worker
docker compose exec -T postgres pg_restore -U etherbay_admin -d blocklucky_db --clean --if-exists --no-owner < backup-AAAAMMJJ-HHMM.dump
docker compose start backend worker
```

## Files BullMQ

Taille des files et jobs en échec :

```bash
docker compose exec redis redis-cli LLEN bull:emails-queue:wait
docker compose exec redis redis-cli ZCARD bull:emails-queue:failed
docker compose exec redis redis-cli ZCARD bull:ledger-queue:failed
```

Les jobs en échec sont conservés 14 jours. Avant de purger une file, vérifier qu'aucun job ledger (crédit ou débit d'EtherPoints) n'est en attente : il serait perdu.

## Revenir à la version précédente

1. Identifier la dernière image saine (tag par SHA de commit).
2. Vérifier que la dernière migration est compatible avec l'ancienne version du code (règle expand/contract, ADR 0003). Si ce n'est pas le cas, ne pas revenir en arrière sans plan de données.
3. Redéployer l'image précédente, sans rebuild :

```bash
docker compose up -d --no-build backend worker
```

4. Contrôler `/health/ready`, puis le taux d'erreurs 5xx dans `/metrics`.

## Redis indisponible

L'API continue de répondre (ADR 0002) : rate limit local, emails envoyés de façon synchrone. Redémarrer Redis :

```bash
docker compose restart redis
```

Les données sont rechargées depuis l'AOF (`/data/appendonly*`). Le client Redis abandonne après trois tentatives de reconnexion (choix fait pour que les jobs ne restent pas bloqués dans une file hors ligne, ADR 0002). Après le redémarrage de Redis, redémarrer donc l'API et le worker pour qu'ils se reconnectent :

```bash
docker compose restart backend worker
```

## Mode maintenance

Démarrer l'API avec `MAINTENANCE_MODE=true` : toutes les routes `/api/*` hors `/api/admin` répondent 503 avec `Retry-After`, et `/api/config` expose `maintenance: true` pour que les clients affichent un écran dédié.
