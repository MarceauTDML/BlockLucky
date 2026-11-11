# Tests de charge

Le dossier `load-tests/` contient deux scénarios [k6](https://k6.io), versionnés avec le code, qui mesurent la capacité de l'API sur ses lectures publiques. Leurs seuils (`thresholds`) traduisent les [objectifs de service](slo-metriques.md) : un test dont les seuils ne sont pas tenus se termine en échec.

| Script | Profil | Débit | Durée | Usage |
| --- | --- | --- | --- | --- |
| [`smoke.js`](src:load-tests/smoke.js) | 2 utilisateurs virtuels | environ 2 itérations par seconde | 30 s | vérification rapide après un déploiement |
| [`load.js`](src:load-tests/load.js), `PROFILE=load` | montée puis palier | 30 itérations par seconde | 4 min 30 s | charge nominale |
| `load.js`, `PROFILE=stress` | paliers croissants | jusqu'à 300 itérations par seconde | 9 min | recherche du point de rupture |
| `load.js`, `PROFILE=spike` | pic soudain | de 10 à 100 itérations par seconde | 3 min 20 s | résistance à un pic, par exemple l'annonce du tirage |
| `load.js`, `PROFILE=soak` | constant | 20 itérations par seconde | 4 h | fuites de mémoire, dérive de latence |

Sans variable `PROFILE`, `load.js` utilise `load`.

## Ce que testent les scénarios

Les deux scripts ne sollicitent que des routes publiques en lecture, sans authentification :

| Route | Étiquette k6 | Script |
| --- | --- | --- |
| `GET /health/live` | `health_live` | `smoke.js` |
| `GET /api/v1/lottery/status` | `lottery_status` | les deux |
| `GET /api/v1/marketplace/catalog` | `catalog` | les deux |
| `GET /api/v1/lottery/leaderboard` | `leaderboard` | `load.js` |

Une itération de `smoke.js` enchaîne trois requêtes puis attend une seconde. Une itération de `load.js` envoie trois requêtes en parallèle (`http.batch`) : 30 itérations par seconde font donc 90 requêtes par seconde.

Aucun scénario ne teste l'achat de ticket, l'échange de récompense ou Socket.IO. Ces parcours écrivent sur la chaîne ou consomment des EtherPoints, et demandent des comptes authentifiés par code email : ils ne sont pas couverts.

`GET /api/v1/lottery/status` n'est pas une lecture simple : en mode `onchain`, chaque appel lit le tour courant et l'état de pause sur le contrat (plusieurs appels RPC), met à jour la ligne du tour en base et compte les participants, sans cache. Sa latence dépend donc du nœud blockchain autant que de l'API.

## Modèle de charge

`load.js` utilise un modèle ouvert : les exécuteurs `ramping-arrival-rate` et `constant-arrival-rate` imposent un nombre d'itérations par seconde, quel que soit le temps de réponse. Si l'API ralentit, k6 lance plus d'utilisateurs virtuels pour tenir le débit (jusqu'à `maxVUs`), comme le feraient de vrais visiteurs qui n'attendent pas la fin des requêtes des autres. Un modèle fermé, au contraire, ralentirait avec l'API et masquerait la saturation.

`smoke.js` utilise le modèle fermé simple (`vus` et `duration`) : il vérifie que tout répond, pas la capacité.

### Paliers des profils

| Profil | Exécuteur | Paliers (cible en itérations par seconde, durée) | VU préalloués, maximum |
| --- | --- | --- | --- |
| `load` | `ramping-arrival-rate`, départ à 5 | 30 en 1 min, 30 pendant 3 min, 0 en 30 s | 20, 100 |
| `stress` | `ramping-arrival-rate`, départ à 10 | 50 en 2 min, 150 en 3 min, 300 en 3 min, 0 en 1 min | 50, 400 |
| `spike` | `ramping-arrival-rate`, départ à 10 | 10 pendant 1 min, 100 en 10 s, 100 pendant 1 min, 10 en 10 s, 10 pendant 1 min | 50, 500 |
| `soak` | `constant-arrival-rate` | 20 pendant 4 h | 30, 100 |

## Seuils

| Script | Seuil | Signification |
| --- | --- | --- |
| `smoke.js` | `http_req_failed: rate<0.01` | moins de 1 % de requêtes en échec |
| `smoke.js` | `http_req_duration: p(95)<300` | 95 % des requêtes en moins de 300 ms |
| `smoke.js` | `checks: rate>0.99` | plus de 99 % des vérifications de statut réussies |
| `load.js` | `http_req_failed: rate<0.001` | moins de 0,1 % d'échec, l'objectif de disponibilité |
| `load.js` | `lottery_status` et `catalog` : `p(95)<300`, `p(99)<800` | latence de consultation |
| `load.js` | `leaderboard` : `p(95)<500` | le classement agrège les comptes, un peu plus lent |

k6 compte comme échec toute réponse de statut 400 ou plus, y compris 429.

## Lancer un test

Sans installer k6, avec l'image Docker officielle, contre une API qui tourne sur le poste :

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:2053 grafana/k6 run - < load-tests/smoke.js
```

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:2053 -e PROFILE=stress grafana/k6 run - < load-tests/load.js
```

Le script est lu sur l'entrée standard (`run -`), ce qui évite de monter un volume. `BASE_URL` vaut `http://localhost:2053` par défaut. Sous Linux, `host.docker.internal` n'existe pas d'office : ajouter `--add-host=host.docker.internal:host-gateway` à la commande. Avec k6 installé localement :

```bash
k6 run -e BASE_URL=http://localhost:2053 -e PROFILE=spike load-tests/load.js
```

Pour un test de fumée contre la démonstration en ligne, `BASE_URL=https://api.etherbay.tech`.

> [!WARNING]
> L'image `grafana/k6` n'est pas épinglée à une version dans ces commandes. Pour des mesures comparables dans le temps, fixer un tag de version.

## Limite de débit

Le rate limiter global de l'API autorise 300 requêtes par adresse IP et par fenêtre de 15 minutes ([`rateLimiter.middleware.ts`](src:backend/src/middlewares/rateLimiter.middleware.ts)). Les sondes `/health/*` ne sont pas comptées, elles sont montées avant le limiteur.

Conséquences, depuis une seule machine :

- `smoke.js` fait environ 120 requêtes comptées : il passe, mais trois exécutions dans la même fenêtre de 15 minutes atteignent la limite ;
- `load.js` dépasse 300 requêtes en moins de 5 secondes, quel que soit le profil : toutes les requêtes suivantes reçoivent 429 et le seuil `http_req_failed` échoue.

La limite est écrite en dur (300) et ne se relève qu'avec `NODE_ENV=test`, qui la porte à 10 000 mais désactive aussi Redis et les journaux : un test de capacité dans ce mode ne mesure pas la configuration réelle. Les options pour un test de capacité représentatif :

- relever temporairement la limite dans le code, dans un environnement dédié, sans le commiter ;
- répartir la charge sur plusieurs adresses IP sources (plusieurs machines d'injection) ;
- avec `TRUST_PROXY=true` dans un environnement dédié, ajouter au script un en-tête `X-Forwarded-For` différent par utilisateur virtuel, pour que chaque utilisateur ait son propre compteur.

Ne jamais lancer `load.js` contre la démonstration en ligne sans prévenir : en plus de la limite, le test met à l'épreuve le nœud Hardhat de la VM, partagé par tous les visiteurs.

## Pendant le test

| À suivre | Comment |
| --- | --- |
| Latence par route, requêtes en cours | `/metrics` de l'API avec `METRICS_TOKEN` (voir [Objectifs de service et métriques](slo-metriques.md)) |
| Lag de l'event loop | `nodejs_eventloop_lag_p99_seconds` dans `/metrics` |
| Mémoire du processus | `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes` ; le tas est limité à 384 Mo dans l'image |
| Requêtes SQL coûteuses | `pg_stat_statements` (voir [Runbooks](runbooks.md#requetes-lentes-postgresql)) |
| Connexions PostgreSQL | `pg_stat_activity` groupé par `application_name` |
| Conteneurs | `docker stats` |

Réinitialiser `pg_stat_statements` avant un test permet de n'observer que la charge du test :

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c "SELECT pg_stat_statements_reset();"
```

## Lire le résultat

En fin de test, k6 affiche un résumé par métrique : `http_req_duration` (avec `p(95)` et `p(99)`), `http_req_failed`, `iterations`, `vus_max`, et chaque seuil précédé d'une coche ou d'une croix. Le code de sortie est non nul si un seuil n'est pas tenu, ce qui permet de l'utiliser en CI. Points à examiner :

- `dropped_iterations` non nul : k6 n'a pas pu tenir le débit, faute d'utilisateurs virtuels disponibles. La machine d'injection ou `maxVUs` est la limite, pas forcément l'API ;
- échecs en 429 : la limite de débit, pas la capacité ;
- échecs en 503 sur `lottery_status` : RPC blockchain lent ou injoignable ;
- `vus_max` proche de `maxVUs` : l'API ralentit au point que k6 doit multiplier les connexions.

Aucun test de charge n'est lancé par la CI, et aucun résultat de référence n'est archivé dans le dépôt.
