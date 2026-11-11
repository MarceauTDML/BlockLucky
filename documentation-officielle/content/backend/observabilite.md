# Observabilité

Le backend produit trois signaux : des logs structurés avec l'identifiant de requête, des métriques Prometheus et des sondes de santé HTTP. Ils sont implémentés dans [`backend/src/utils/logger.util.ts`](src:backend/src/utils/logger.util.ts) et le dossier `backend/src/observability`. Les objectifs de service et les alertes construits sur ces signaux sont décrits dans [Objectifs de service et métriques](../infrastructure/slo-metriques.md), les procédures d'exploitation dans [Runbooks](../infrastructure/runbooks.md).

## Logs

Le logger est une instance Winston unique, importée partout sous le nom `logger`.

| Réglage | Valeur |
|---|---|
| Niveau | `LOG_LEVEL`, sinon `debug` en développement et `info` ailleurs |
| Niveaux utilisés | `error`, `warn`, `info`, `http`, `debug` |
| Sortie | console (stdout), aucun fichier |
| Format en production | une ligne JSON par événement |
| Format en développement | texte coloré `[horodatage] niveau: message {métadonnées}` |
| Tests | sortie désactivée (`silent`) |
| Champs ajoutés à chaque ligne | `service: blocklucky-backend`, `version` (`APP_VERSION`), `environment` (`NODE_ENV`), `timestamp`, et selon le contexte `requestId` et `userId` |

Exemple de ligne en production, écrite à la fin d'une requête :

```json
{"durationMs":184.2,"environment":"production","level":"http","message":"POST /api/v1/lottery/buy 201","method":"POST","requestId":"c2b6f1a0-8e3d-4f57-9a1b-2d4c6e8f0a13","service":"blocklucky-backend","statusCode":201,"timestamp":"2026-11-11T19:41:02.733Z","userId":"019a7c3e-5d2b-7f41-9c0e-6a8b2d4f1e37","version":"1.0.0"}
```

### Journal des requêtes

Le middleware de contexte écrit une ligne par requête terminée, sauf pour `/health*` et `/metrics`. Le niveau dépend du statut : `error` à partir de 500, `warn` de 400 à 499, `http` en dessous. Comme le niveau `http` est inférieur à `info`, les requêtes réussies n'apparaissent en production que si `LOG_LEVEL=http` ou `debug`. Le chemin est journalisé sans la query string, ce qui évite d'écrire des jetons passés en paramètre.

### Données sensibles

| Donnée | Traitement dans les logs |
|---|---|
| Emails | masqués par `maskEmail` (`c***@etherbay.fr`) dans les logs d'envoi ; écrits en clair dans le log `debug` d'envoi direct quand la file est indisponible |
| Codes OTP, jetons, secrets | jamais journalisés |
| Adresses de portefeuille | journalisées en clair (données publiques sur la chaîne) |
| Corps des requêtes | jamais journalisés |
| Erreurs 500 | message, pile et code journalisés en `error` ; le client ne reçoit que `Erreur interne du serveur` en production |

## Contexte de requête

[`backend/src/observability/request-context.ts`](src:backend/src/observability/request-context.ts) conserve un contexte `{ requestId, userId? }` dans un `AsyncLocalStorage`. Le middleware [`request-context.middleware.ts`](src:backend/src/middlewares/request-context.middleware.ts) l'ouvre en premier, avec l'identifiant décrit dans [Réponses et erreurs](reponses-erreurs.md#identifiant-de-requete), et `authenticate` y ajoute le `userId` du jeton. Le format Winston `withRequestContext` lit ce contexte à chaque écriture : un `logger.warn` écrit dans un service, une passerelle ou un repository porte automatiquement l'identifiant de la requête qui l'a déclenché.

Le contexte n'existe pas hors requête : les logs des workers, de l'indexeur, du keeper et de Socket.IO n'ont pas de `requestId`. Un job mis en file ne transporte pas l'identifiant de la requête d'origine.

Pour suivre un incident :

```bash
docker compose logs backend worker | grep c2b6f1a0-8e3d-4f57-9a1b-2d4c6e8f0a13
```

Un client peut fixer lui-même l'identifiant avec l'en-tête `X-Request-Id`, ou le transmettre par un en-tête W3C `traceparent` posé par un proxy ou un outil de traçage.

## Métriques Prometheus

[`backend/src/observability/metrics.ts`](src:backend/src/observability/metrics.ts) utilise `prom-client` avec un registre dédié. Chaque série porte les labels `service="blocklucky-backend"` et `environment`.

| Métrique | Type | Labels | Source |
|---|---|---|---|
| `http_request_duration_seconds` | histogramme | `method`, `route`, `status_code` | middleware HTTP ; seaux de 10 ms à 5 s (0,01 ; 0,025 ; 0,05 ; 0,1 ; 0,25 ; 0,5 ; 0,8 ; 1 ; 2,5 ; 5) |
| `http_requests_in_flight` | jauge | aucun | middleware HTTP |
| `queue_jobs_total` | compteur | `queue`, `status` | workers BullMQ (`completed`, `failed`) |
| `business_events_total` | compteur | `event` | services métier |
| `process_*`, `nodejs_*` | divers | selon la métrique | métriques par défaut de `prom-client` (mémoire, CPU, boucle d'événements mesurée toutes les 20 ms, ramasse-miettes) |

Le label `route` est le chemin paramétré (`/api/v1/lottery/poap/:file`) et non l'URL réelle, ce qui borne le nombre de séries. Comme le routeur est monté deux fois, une même route a deux valeurs (`/api/lottery/buy` et `/api/v1/lottery/buy`). Les requêtes sans route correspondante, ou arrêtées par un middleware de routeur avant la route (contrôle d'accès de `/admin`), ont `route="unmatched"`.

| Valeur de `event` | Émise par |
|---|---|
| `ticket_purchased` | achat de tickets, avec la quantité |
| `ticket_indexed` | indexation d'un achat (onchain ou webhook simulé) |
| `reward_claimed` | échange d'une récompense |
| `points_credited_<type>`, `points_debited_<type>` | chaque mouvement d'EtherPoints, `<type>` en minuscules (`points_credited_ticket_purchase`) |

Exemples de requêtes PromQL :

```text
histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
sum by (queue) (rate(queue_jobs_total{status="failed"}[15m]))
increase(business_events_total{event="ticket_purchased"}[1h])
```

Les compteurs sont propres à chaque process. Avec un process worker séparé, `queue_jobs_total` et `ticket_indexed` sont exposés par le worker, pas par l'API : Prometheus doit collecter les deux.

### Exposition et METRICS_TOKEN

| Process | Adresse | Protection |
|---|---|---|
| API | `GET /metrics` sur `PORT` | si `METRICS_TOKEN` est défini, en-tête `Authorization: Bearer <METRICS_TOKEN>` comparé en temps constant, sinon 401 sans corps |
| Worker | `GET /metrics` sur `PORT + 1` | aucune |

`METRICS_TOKEN` est obligatoire en production dès que `METRICS_ENABLED=true` : sans lui, le serveur refuse de démarrer. Le même jeton débloque le détail de `/health/deep`.

```yaml
scrape_configs:
  - job_name: blocklucky-backend
    metrics_path: /metrics
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/blocklucky-metrics-token
    static_configs:
      - targets: ["backend:2053"]
  - job_name: blocklucky-worker
    metrics_path: /metrics
    static_configs:
      - targets: ["worker:2054"]
```

Avec `METRICS_ENABLED=false`, le middleware HTTP ne mesure plus rien et les métriques par défaut ne sont pas collectées ; la route `/metrics` de l'API répond toujours, avec les compteurs métier.

> [!WARNING]
> L'endpoint `/metrics` du worker n'est pas authentifié. Il n'est pas publié sur l'hôte dans `docker-compose.yml`, mais il ne doit jamais être exposé derrière un proxy public.

## Sondes de santé

| Sonde | Process | Usage | Échec |
|---|---|---|---|
| `GET /health/live` | API | vivacité : le process répond ; utilisée par le `HEALTHCHECK` de l'image Docker | aucun, toujours 200 |
| `GET /health/live` sur `PORT + 1` | worker | vivacité du worker ; sonde du service Docker `worker` | 503 pendant l'arrêt |
| `GET /health/ready` | API | disponibilité : à brancher sur le répartiteur de charge | 503 si PostgreSQL ne répond pas en 2 secondes ou si l'arrêt est commencé |
| `GET /health/deep` | API | diagnostic humain ou supervision | 503 si PostgreSQL est indisponible ; `warn` si Redis est absent |
| `GET /health` | API | indicateurs pour les clients (`isFallback`, `isPaused`) | toujours 200 |

Les réponses détaillées sont sur la page [Webhooks et système](modules/webhooks-systeme.md#module-systeme). Pendant un arrêt, `/health/ready` passe à 503 dès réception de `SIGTERM`, avant la fermeture du serveur HTTP : un répartiteur qui sonde régulièrement retire l'instance pendant que les requêtes en cours se terminent.

```bash
curl -s http://localhost:2053/health/ready
curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:2053/health/deep
```

## Erreurs de process

[`backend/src/observability/shutdown.ts`](src:backend/src/observability/shutdown.ts) journalise en `error` toute promesse rejetée non gérée (message et pile) et toute exception non capturée. La première provoque un arrêt propre avec le code 1 en production seulement ; la seconde toujours. Le lint du backend active la règle `no-floating-promises` pour limiter les promesses oubliées.
