# Runbooks

Procédures d'exploitation pour la stack Docker Compose du dépôt, que ce soit sur un poste ou sur la VM de démonstration. Les incidents propres à la blockchain (chaîne réinitialisée, tirage bloqué, opérateur sans fonds, nonce) sont dans [Runbooks blockchain](runbooks-blockchain.md) ; la conduite d'un incident de sécurité est dans [Réponse aux incidents](incidents.md).

Les commandes s'exécutent depuis la racine du dépôt. Les services `backend`, `worker`, `web`, `tourisme` et `migrate` appartiennent au profil `app`, d'où l'option `--profile app`. Sur la VM, ajouter `-f docker-compose.yml -f docker-compose.etherbay.yml` (voir [Déploiement sur etherbay.tech](deploiement-etherbay.md)). Chaque runbook doit être relu et corrigé après un incident qui l'a utilisé.

## Premier diagnostic

```bash
docker compose --profile app ps
```

La colonne `STATUS` indique `healthy`, `unhealthy`, `starting` ou `Exited`. Un service `migrate` en `Exited (0)` est normal. Pour chaque service en défaut, lire ses derniers journaux :

```bash
docker compose --profile app logs --since 15m --tail 200 backend
```

### Sondes de l'API

| Commande | Question posée |
| --- | --- |
| `curl -i http://localhost:2053/health/live` | le processus répond-il ? |
| `curl -i http://localhost:2053/health/ready` | PostgreSQL est-il joignable et l'arrêt non commencé ? (503 sinon) |
| `curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:2053/health/deep` | état et latence de PostgreSQL, Redis et du réseau blockchain |
| `curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:2053/metrics` | latence par route, requêtes en cours, lag de l'event loop |

En production, `/health/deep` sans jeton ne renvoie que `{"status": "..."}` et `/metrics` renvoie 401. Les métriques sont détaillées dans [Objectifs de service et métriques](slo-metriques.md).

### Retrouver une requête

Chaque réponse de l'API porte un en-tête `X-Request-Id`, recopié dans les journaux de la requête. L'identifiant vient de l'en-tête `X-Request-Id` du client s'il est valide (8 à 128 caractères `A-Z a-z 0-9 . _ -`), sinon de l'identifiant de trace d'un en-tête `traceparent`, sinon d'un UUID généré.

```bash
docker compose --profile app logs backend --since 1h | grep "<request-id>"
```

> [!NOTE]
> En production, le niveau de journalisation est `info`. Les requêtes réussies sont journalisées au niveau `http`, inférieur à `info` : elles n'apparaissent pas. Seules les réponses 4xx (niveau `warn`) et 5xx (niveau `error`) sont écrites. Pour suivre toutes les requêtes pendant un diagnostic, redémarrer l'API avec `LOG_LEVEL=http`.

Les journaux sont en JSON, une ligne par événement, avec `timestamp`, `level`, `message`, `service`, `version`, `environment` et, dans le contexte d'une requête, `requestId` et `userId`. Exemple de filtrage des erreurs avec `jq` :

```bash
docker compose --profile app logs --no-log-prefix backend --since 1h | jq -c 'select(.level == "error")'
```

## L'API ne démarre pas

| Symptôme dans les journaux | Cause | Action |
| --- | --- | --- |
| `Configuration invalide, démarrage interrompu` suivi d'une liste | variable absente, mal formée ou égale à sa valeur de développement en production | corriger le fichier `.env` racine ou la surcharge, puis `docker compose --profile app up -d backend worker` |
| `migrate` en `Exited (1)` et `backend` jamais créé | une migration échoue | `docker compose --profile app logs migrate` ; corriger puis relancer `up` |
| `backend` reste en `starting` | `blockchain` n'est pas saine, l'API l'attend | voir [Runbooks blockchain](runbooks-blockchain.md) |
| `Aucun worker démarré : Redis est requis pour le process worker` | le worker ne trouve pas Redis | voir [Redis indisponible](#redis-indisponible) |

Les variables exigées en production sont listées dans [Docker Compose](docker-compose.md#secrets-obligatoires).

## Requêtes lentes PostgreSQL

PostgreSQL journalise les requêtes de plus de 500 ms et les attentes de verrou, et l'extension `pg_stat_statements` est chargée.

```bash
docker compose logs postgres --since 1h | grep -E "duration:|still waiting"
```

Les dix requêtes les plus coûteuses :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT round(total_exec_time) AS total_ms, calls, round(mean_exec_time::numeric, 1) AS mean_ms, left(query, 120) AS query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

Sur un volume créé avant l'ajout de `docker/postgres/init`, l'extension n'existe pas encore dans la base. La créer une fois :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

Requêtes en cours, verrous et bloqueurs :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT pid, state, wait_event_type, now() - query_start AS duration, pg_blocking_pids(pid) AS blocked_by, left(query, 80) FROM pg_stat_activity WHERE datname = 'blocklucky_db' AND state <> 'idle' ORDER BY duration DESC;"
```

Une requête de l'application ne peut pas durer plus de 15 s (`statement_timeout`) ni attendre un verrou plus de 5 s (`lock_timeout`). Une session restée `idle in transaction` est coupée après 60 s. Si une session bloque malgré tout (par exemple une session `psql` ouverte à la main), la terminer avec `SELECT pg_terminate_backend(<pid>);`.

Nombre de connexions par application, à comparer à `max_connections=100` :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT application_name, state, count(*) FROM pg_stat_activity GROUP BY 1, 2 ORDER BY 3 DESC;"
```

Les connexions de l'application portent `application_name = 'blocklucky-backend'`.

## PostgreSQL indisponible

Symptômes : `/health/ready` et `/health/deep` répondent 503, les journaux de l'API contiennent des erreurs Prisma de connexion, les requêtes authentifiées échouent en 5xx.

1. `docker compose ps postgres` : le conteneur tourne-t-il et est-il `healthy` ?
2. `docker compose logs postgres --since 15m` : disque plein, corruption, arrêt.
3. Espace disque de l'hôte : `df -h` et `docker system df`.
4. Redémarrer : `docker compose restart postgres`. Le pool de Prisma se reconnecte seul ; vérifier `/health/ready`.

Si les données sont perdues ou corrompues, suivre [Sauvegardes et reprise](sauvegardes.md).

## Files BullMQ

Trois files sont stockées dans Redis sous le préfixe `bull:` :

| File | Contenu | Worker |
| --- | --- | --- |
| `emails-queue` | emails transactionnels | `concurrency` = `WORKER_CONCURRENCY` (5) |
| `ledger-queue` | crédits et débits d'EtherPoints | `concurrency: 1` |
| `chain-actions` | versement de cagnotte, remboursements, émission de badges | `concurrency: 1` |

Taille des files et jobs en échec :

```bash
docker compose exec redis redis-cli LLEN bull:emails-queue:wait
```

```bash
docker compose exec redis redis-cli ZCARD bull:emails-queue:failed
```

```bash
docker compose exec redis redis-cli ZCARD bull:ledger-queue:failed
```

```bash
docker compose exec redis redis-cli ZCARD bull:chain-actions:failed
```

Chaque job est tenté 5 fois avec un délai exponentiel à partir d'une seconde et une gigue de 50 %. Les jobs réussis sont gardés 24 heures (1 000 au plus), les jobs en échec 14 jours ([`queue.options.ts`](src:backend/src/queues/queue.options.ts)). Une erreur métier (statut inférieur à 500 pour le ledger, erreur de contrat définitive pour les actions on-chain, job email incomplet) passe directement en échec définitif, sans nouvelle tentative.

Les raisons d'échec sont dans les journaux du worker :

```bash
docker compose --profile app logs worker --since 1h | grep -E "échoué|en échec"
```

Le dépôt ne fournit pas d'outil pour relancer un job en échec. Les jobs `chain-actions` ont un identifiant déterministe (`TYPE-tour-adresse`) : tant que le job en échec est conservé, BullMQ ignore toute nouvelle demande portant le même identifiant. Pour une cagnotte non versée, le gagnant peut la retirer lui-même par `POST /api/lottery/claim-prize`. Aucun point d'entrée de l'API ne déclenche un remboursement à la demande : un job `CLAIM_REFUND` en échec définitif se traite à la main (voir [Runbooks blockchain](runbooks-blockchain.md)). Un job ledger en échec définitif correspond à une opération refusée (solde insuffisant par exemple) et ne doit pas être rejoué tel quel.

> [!CAUTION]
> Avant de purger une file, vérifier qu'aucun job `ledger-queue` (crédit ou débit d'EtherPoints) n'est en attente : il serait perdu sans trace en base.

## Redis indisponible

L'API continue de répondre en mode dégradé ([ADR 0002](../architecture/adr/0002-redis-files-et-repli-memoire.md)) : rate limiting, idempotence et cache en mémoire locale, emails et opérations ledger exécutés de façon synchrone dans la requête. `/health/deep` passe à `warn`. Le processus `worker`, lui, ne peut pas fonctionner sans Redis.

Redémarrer Redis :

```bash
docker compose restart redis
```

Les données sont rechargées depuis l'AOF du volume `redisdata`. Le client Redis de l'application abandonne après trois tentatives de reconnexion espacées de 200 ms à 1 s ([`redis.config.ts`](src:backend/src/config/redis.config.ts)). Ce choix évite que des jobs s'accumulent dans une file hors ligne, mais impose de redémarrer l'API et le worker une fois Redis revenu :

```bash
docker compose --profile app restart backend worker
```

Vérifier ensuite que `/health/deep` est revenu à `pass`.

Si Redis refuse les écritures avec `OOM command not allowed`, la limite de 256 Mo est atteinte. Identifier les plus grosses clés avec `redis-cli --bigkeys`, puis purger les jobs terminés anciens ou relever `--maxmemory` dans `docker-compose.yml`.

## Worker en défaut

Symptômes : `worker` en `unhealthy` ou en redémarrage, tickets achetés absents de l'historique, tirage jamais demandé à l'échéance, badges POAP non émis, emails non reçus.

1. `docker compose --profile app logs worker --since 15m` ;
2. si le message `Indexation blockchain interrompue` revient en boucle, voir [Runbooks blockchain](runbooks-blockchain.md) ;
3. si Redis est en cause, voir [Redis indisponible](#redis-indisponible) ;
4. redémarrer : `docker compose --profile app restart worker`.

Un seul worker doit tourner à la fois tant que le compte opérateur est partagé : deux processus qui signent avec la même clé se disputent les nonces. Le keeper prend un verrou Redis (`chain:keeper-lock`), mais les émissions de badges n'en ont pas.

## File des vérifications d'âge

Les citoyens dont l'âge n'est pas vérifié reçoivent 403 `AGE_VERIFICATION_REQUIRED` à l'achat, au cadeau, à l'échange et au ticket à gratter. Une file qui s'allonge bloque donc la participation.

### Mesurer la file

La page `/mairie/identites` liste les demandes `PENDING`, de la plus ancienne à la plus récente. En base :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT status, count(*), min(\"submittedAt\") AS oldest FROM \"IdentityDocument\" GROUP BY status;"
```

Une demande en attente garde le recto et le verso chiffrés en base. Elles sont effacées à la décision, et la ligne disparaît avec l'anonymisation RGPD du compte.

### Incidents fréquents

| Symptôme | Cause | Action |
| --- | --- | --- |
| Le citoyen reçoit 413 à l'envoi | image de plus de 4 Mo ([`identity-image.util.ts`](src:backend/src/utils/identity-image.util.ts)) | reprendre la photo de plus loin ou en qualité moindre |
| Le citoyen reçoit 400 « Image recto invalide » | ni JPEG ni PNG, ou moins de 1 Ko | envoyer une photo JPEG ou PNG |
| Le citoyen reçoit 429 | plus de 10 envois par heure depuis la même adresse (`identityUploadRateLimiter`) | attendre une heure |
| L'agent reçoit 403 « Vous ne pouvez pas statuer sur votre propre pièce d'identité » | demande de son propre compte | la faire traiter par un autre agent |
| L'agent reçoit 409 « Cette demande a déjà été traitée » | décision déjà prise, par exemple par un autre agent | recharger la liste |
| Le détail ne montre pas les images | demande déjà traitée : les images sont effacées | aucune ; un nouvel envoi du citoyen crée une nouvelle demande `PENDING` |
| Le citoyen ne reçoit pas l'email de décision | file `emails-queue` en échec | voir [Files BullMQ](#files-bullmq) |

Chaque consultation (`IDENTITY_DOCUMENT_VIEWED`) et chaque décision (`IDENTITY_VERIFICATION_DECISION`) sont tracées dans `/mairie/audit`.

## Mode maintenance

Avec `MAINTENANCE_MODE=true`, toutes les routes `/api/*` hors `/api/admin` répondent 503 avec `Retry-After: 300` et un message « Service en maintenance ». Les sondes `/health/*`, `/metrics` et `/api/config` restent accessibles ; `/api/config` renvoie `maintenance: true`.

La variable n'est pas présente dans `docker-compose.yml`. L'ajouter dans la surcharge pour le service `backend`, puis recréer le conteneur :

```bash
docker compose --profile app up -d backend
```

Le mode maintenance ne coupe pas le worker : l'indexeur, le keeper et les files continuent. Pour figer aussi la loterie, utiliser le disjoncteur du contrat (voir [Runbooks blockchain](runbooks-blockchain.md#pause-d-urgence)). Les clients web et mobile n'appellent pas encore `/api/config` : ils affichent l'erreur 503 de chaque appel, pas un écran de maintenance dédié.

## Revenir à la version précédente

Les images sont construites sur place par `docker compose build` et ne sont publiées dans aucun registre : il n'existe pas d'image étiquetée par commit à redéployer. Revenir en arrière revient à reconstruire depuis le commit précédent.

1. Identifier le dernier commit sain (celui noté au déploiement, ou `git log --oneline`).
2. Vérifier que les migrations appliquées depuis restent compatibles avec l'ancien code. La règle expand et contract de l'[ADR 0003](../architecture/adr/0003-migrations-expand-contract.md) garantit qu'une migration additive ne casse pas la version précédente. Si une migration a supprimé ou renommé une colonne, ne pas revenir en arrière sans plan de données : Prisma ne sait pas annuler une migration appliquée.
3. Se placer sur le commit sain dans le clone, puis reconstruire et redémarrer l'application seule :

   ```bash
   docker compose --profile app up -d --build --wait migrate backend worker web
   ```

4. Contrôler `/health/ready`, puis le taux de réponses 5xx dans `/metrics` et les journaux.

Pour réduire le temps de retour arrière, étiqueter les images avant chaque mise à jour, par exemple `docker tag blocklucky-backend blocklucky-backend:<sha>`, en vérifiant d'abord le nom réel des images avec `docker image ls`.

## Espace disque

Les sources de croissance sur l'hôte : volumes `pgdata` et `redisdata`, journaux des conteneurs (pilote `json-file` sans rotation configurée par le fichier Compose) et cache de build.

```bash
docker system df
```

```bash
docker builder prune --filter until=168h
```

Ne jamais lancer `docker volume prune` ou `docker compose down -v` sur la VM sans sauvegarde : cela supprime la base.
