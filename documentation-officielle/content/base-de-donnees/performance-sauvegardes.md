# Performance et sauvegardes

Cette page décrit les réglages de PostgreSQL et du pool de connexions, les outils pour diagnostiquer une requête lente, et le plan de sauvegarde et de restauration avec ses objectifs de perte de données (RPO) et de durée de reprise (RTO). Les procédures d'exploitation complètes sont sur les pages [Sauvegardes](../infrastructure/sauvegardes.md) et [Runbooks](../infrastructure/runbooks.md).

## Pool de connexions

Le client Prisma utilise l'adaptateur `@prisma/adapter-pg`, qui s'appuie sur le pool du pilote `pg`. Il est configuré dans [`backend/src/config/prisma.config.ts`](src:backend/src/config/prisma.config.ts) :

| Paramètre | Variable | Défaut | Rôle |
|---|---|---|---|
| `max` | `DB_POOL_MAX` | 10 | Connexions simultanées au plus, par process |
| `connectionTimeoutMillis` | `DB_CONNECTION_TIMEOUT_MS` | 5 000 ms | Attente maximale d'une connexion libre du pool ou de l'ouverture d'une connexion |
| `idleTimeoutMillis` | `DB_IDLE_TIMEOUT_MS` | 30 000 ms | Fermeture d'une connexion inutilisée |
| `application_name` | | `blocklucky-backend` | Nom visible dans `pg_stat_activity` |

Le client est un singleton par process. Hors production, il est mémorisé dans `global` pour que le rechargement à chaud de `tsx watch` ne multiplie pas les pools.

### Délais par connexion

Chaque connexion ouverte par l'application reçoit trois délais côté serveur :

| Paramètre PostgreSQL | Valeur | Effet |
|---|---|---|
| `statement_timeout` | `DB_STATEMENT_TIMEOUT_MS`, 15 000 ms | Une requête plus longue est annulée par le serveur |
| `lock_timeout` | 5 000 ms, fixe | Une requête qui attend un verrou plus de 5 s échoue au lieu de bloquer |
| `idle_in_transaction_session_timeout` | 60 000 ms, fixe | Une session restée en transaction ouverte sans activité est fermée, ce qui libère ses verrous |

Une requête annulée par `statement_timeout` remonte avec le code PostgreSQL `57014`. Le gestionnaire d'erreurs [`backend/src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts) la traduit en HTTP 503 « La requête a dépassé le délai autorisé ». Les codes `40001` (sérialisation) et `40P01` (interblocage) donnent une 409 « Conflit de transaction, veuillez réessayer ».

Le délai de 15 s reste sous la limite `HTTP_REQUEST_TIMEOUT_MS` de 30 s du serveur HTTP : une requête SQL bloquée échoue proprement avant que le serveur ne coupe la connexion du client.

### Dimensionnement

| Élément | Valeur |
|---|---|
| `max_connections` du serveur | 100 (service `postgres` de [`docker-compose.yml`](src:docker-compose.yml)) |
| Connexions par process | `DB_POOL_MAX`, 10 |
| Process par déploiement Compose | 2 (`backend` et `worker`) plus le job `migrate` ponctuel |

Au-delà de 8 process de 10 connexions, il reste trop peu de marge sous 100 connexions pour les connexions d'administration et de migration. Il faudra alors placer un PgBouncer en mode transaction devant PostgreSQL, ou réduire `DB_POOL_MAX`.

Le worker consomme peu de connexions : la file `chain-actions` et la file ledger ont une concurrence de 1, l'indexeur traite les événements un par un.

## Index et requêtes

Les index existants et la requête que chacun sert sont décrits sur la page [Index et contraintes](index-contraintes.md). Les requêtes les plus fréquentes sont couvertes :

| Requête | Index |
|---|---|
| Tour courant (`status IN ('OPEN', 'LOCKED')`) | `LotteryRound_status_idx` |
| Tour par numéro du contrat | `LotteryRound_contractRoundId_key` |
| Compte par adresse (indexeur, file d'actions) | `User_walletAddress_key` |
| Tickets d'un compte par date (`my-tickets`) | `Ticket_userId_purchasedAt_idx` |
| Tickets d'un tour (comptage, payeurs) | `Ticket_lotteryId_idx` |
| Idempotence de l'indexeur | `Ticket_lotteryId_ticketIndex_key` |
| Historique des points | `PointTransaction_userId_createdAt_idx` |

Deux requêtes ne sont pas servies par un index dédié :

- le classement (`getLeaderboardData`) trie les comptes actifs par `pointsBalance`, sans index sur cette colonne : PostgreSQL parcourt la table `User` ;
- le comptage des participants distincts d'un tour (`countDistinctParticipants`) agrège les tickets du tour par `userId` à partir de `Ticket_lotteryId_idx`.

Aux volumes visés (un objectif de 10 000 participants par tour), ces parcours restent rapides. Ils sont les premiers candidats à surveiller dans `pg_stat_statements`.

## Diagnostic : pg_stat_statements

Le service `postgres` de Docker Compose démarre avec :

| Option | Valeur | Effet |
|---|---|---|
| `shared_preload_libraries` | `pg_stat_statements` | Charge l'extension de statistiques des requêtes |
| `pg_stat_statements.track` | `all` | Mesure aussi les requêtes imbriquées dans des fonctions |
| `log_min_duration_statement` | 500 | Journalise toute requête de plus de 500 ms |
| `log_lock_waits` | `on` | Journalise les attentes de verrou plus longues que `deadlock_timeout` |
| `idle_in_transaction_session_timeout` | 60 000 | Même délai que celui de l'application, appliqué à tous les clients |
| `max_connections` | 100 | |

L'extension est créée à l'initialisation du volume par [`docker/postgres/init/01-extensions.sql`](src:docker/postgres/init/01-extensions.sql) (`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`). Ce script ne s'exécute qu'à la création du volume `pgdata` : sur un volume plus ancien, il faut lancer la commande à la main.

Les requêtes les plus coûteuses en temps cumulé :

```sql
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time, 1) AS moyenne_ms, rows, left(query, 120) AS requete
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

Les connexions de l'application et leur état :

```sql
SELECT state, count(*) FROM pg_stat_activity WHERE application_name = 'blocklucky-backend' GROUP BY state;
```

Le plan d'une requête suspecte, par exemple l'historique d'un citoyen :

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Ticket" WHERE "userId" = '…' ORDER BY "purchasedAt" DESC LIMIT 20;
```

Pour voir les requêtes SQL générées par Prisma, démarrer le backend avec `DB_LOG_QUERIES=true` : le client journalise alors chaque requête (niveau `query`), en plus des erreurs et avertissements.

La sonde `GET /health/ready` exécute `SELECT 1` avec un délai de 2 s et répond 503 si la base ne répond pas ; `GET /health/deep` donne aussi la latence mesurée. Le détail est sur la page [Observabilité](../backend/observabilite.md).

## Sauvegardes

### Ce qu'il faut sauvegarder

| Donnée | Source de vérité | Mécanisme |
|---|---|---|
| Comptes, clés chiffrées des portefeuilles, EtherPoints, partenaires, récompenses, analytique | PostgreSQL | `pg_dump` manuel |
| Tickets, tours, cagnottes | Smart contract `BlockLucky` | Aucun : reconstruction par l'indexeur (voir [Reconstruire depuis la chaîne](reconstruction.md)) |
| Files de jobs, limites de jeu responsable, préférences, quêtes, lots de codes promo | Redis | Persistance AOF `appendfsync everysec` sur le volume `redisdata` |
| Clé `ENCRYPTION_KEY` | Secret d'environnement | Hors de la base, à conserver séparément |

> [!CAUTION]
> Une sauvegarde de la base sans la clé `ENCRYPTION_KEY` est inutilisable pour les portefeuilles : les clés privées chiffrées ne peuvent pas être déchiffrées. À l'inverse, la sauvegarde contient les clés chiffrées et doit être protégée comme un secret : quiconque obtient le fichier et la clé contrôle les portefeuilles.

### Sauvegarde logique

Depuis la racine du dépôt, avec la pile Docker Compose démarrée :

```bash
docker compose exec -T postgres pg_dump -U etherbay_admin -d blocklucky_db -Fc > backup-$(date +%Y%m%d-%H%M).dump
```

Le format `-Fc` (custom) est compressé et permet de restaurer table par table avec `pg_restore`. `pg_dump` lit un instantané cohérent sans bloquer l'application.

Aucune sauvegarde n'est planifiée dans le dépôt : il n'existe pas de tâche cron, ni d'archivage continu des journaux WAL. La sauvegarde est manuelle.

### Tester une restauration

Restaurer dans une base temporaire, sans toucher à `blocklucky_db` :

```bash
docker compose exec -T postgres createdb -U etherbay_admin blocklucky_restore_test
docker compose exec -T postgres pg_restore -U etherbay_admin -d blocklucky_restore_test --no-owner < backup-AAAAMMJJ-HHMM.dump
docker compose exec -T postgres psql -U etherbay_admin -d blocklucky_restore_test -c 'SELECT count(*) FROM "User";'
docker compose exec -T postgres dropdb -U etherbay_admin blocklucky_restore_test
```

### Restauration réelle

Destructive : arrêter d'abord l'API et le worker.

```bash
docker compose stop backend worker
docker compose exec -T postgres pg_restore -U etherbay_admin -d blocklucky_db --clean --if-exists --no-owner < backup-AAAAMMJJ-HHMM.dump
docker compose start backend worker
```

Après la restauration, le curseur `ChainCursor` est revenu à la date du dump. Au redémarrage, l'indexeur relit les blocs postérieurs et recrée les tickets achetés depuis : les données de la loterie se recalent seules sur la chaîne. Les points de ces tickets sont crédités à ce moment, puisque les tickets sont absents de la base restaurée. En revanche, les comptes créés et les échanges de récompenses postérieurs au dump sont perdus.

## RPO et RTO

| Donnée | RPO cible | RTO cible | Comment l'objectif est tenu |
|---|---|---|---|
| Comptes, EtherPoints, récompenses (PostgreSQL) | 24 h | 1 h | Un `pg_dump` par jour ; restauration en moins d'une heure aux volumes du projet |
| Files, préférences, quêtes (Redis) | 1 s | 15 min | AOF avec `fsync` chaque seconde ; Redis recharge l'AOF au redémarrage |
| Tickets, tirages, cagnottes (chaîne) | 0 | Durée de la réindexation | Rien n'est perdu sur la chaîne ; la base se recale par l'indexeur |

Le RPO (Recovery Point Objective) est la quantité maximale de données qu'on accepte de perdre, exprimée en durée. Le RTO (Recovery Time Objective) est la durée maximale acceptée pour revenir en service.

> [!WARNING]
> Le RPO de 24 h de PostgreSQL suppose un `pg_dump` quotidien, qui n'est pas automatisé. Sans discipline d'exploitation, le RPO réel est la date du dernier dump manuel. Pour un hébergement réel, il faudrait planifier les dumps, les copier hors de la machine, ou activer l'archivage WAL pour une restauration à un instant donné.

Le RPO de 1 s de Redis ne vaut que contre un arrêt du process : l'AOF est sur le même volume que les données. Une perte du volume `redisdata` efface les files et les données utilisateur stockées dans Redis, sans copie ailleurs (voir [Données Redis](redis.md#donnees-utilisateur-et-partenaires)).

Le RTO de la chaîne dépend du nombre de blocs à relire. L'indexeur avance d'au plus 2 000 blocs par passe de 3 s ; sur Sepolia, à un bloc toutes les 12 s environ, une semaine représente environ 50 000 blocs, soit environ 25 passes et un peu plus d'une minute de rattrapage.
