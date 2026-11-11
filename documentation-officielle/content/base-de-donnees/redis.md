# Données Redis

Redis 7.4 sert au backend pour quatre usages : les files de jobs BullMQ, l'état court (codes à usage unique, verrous, sessions révoquées, idempotence), quelques données utilisateur sans table en base, et le relais d'événements Socket.IO. Ce fonctionnement découle d'une décision d'architecture prise le 10 novembre 2026 : une seule instance Redis, toutes les clés applicatives préfixées par environnement, un délai de commande court et un repli en mémoire si Redis est indisponible. Les choix techniques d'ensemble sont présentés sur la page [Choix techniques](../architecture/choix-techniques.md).

Tout accès passe par [`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts), qui exporte le singleton `redis` (classe `RedisManager`), sauf trois usages qui prennent le client brut `redis.getRawClient()` : BullMQ, le limiteur de débit et le relais Socket.IO.

## Client et préfixe

Le client ioredis est créé ainsi, sauf quand `NODE_ENV` vaut `test` (aucun client dans ce cas) :

| Option | Valeur | Effet |
|---|---|---|
| URL | `REDIS_URL`, par défaut `redis://localhost:6380` | Port 6380 de l'hôte, publié par Docker Compose vers le 6379 du conteneur |
| `lazyConnect` | `true` | La connexion s'ouvre à la première commande envoyée sur le client brut (BullMQ, limiteur, abonnement) ou par la sonde de santé (`ping`) |
| `maxRetriesPerRequest` | `null` | Exigé par BullMQ pour ses commandes bloquantes |
| `enableReadyCheck` | `false` | |
| `retryStrategy` | 200 ms, 400 ms, 600 ms, puis abandon après la troisième tentative | Un Redis absent ne bloque pas le démarrage indéfiniment |
| `connectionName` | `blocklucky-backend` | Visible dans `CLIENT LIST` |

Les méthodes `get`, `set`, `setIfAbsent` et `del` de `RedisManager` préfixent automatiquement chaque clé :

```text
<REDIS_KEY_PREFIX>:<NODE_ENV>:<clé>
```

Avec les valeurs par défaut, la clé `chain:keeper-lock` devient `blocklucky:development:chain:keeper-lock` en développement et `blocklucky:production:chain:keeper-lock` en Docker Compose. Les tableaux ci-dessous donnent les clés **sans** ce préfixe.

Chaque commande a un délai de 500 ms (`CACHE_COMMAND_TIMEOUT_MS`). `del` utilise `UNLINK`, qui libère la mémoire en arrière-plan.

### Gigue des durées de vie

`set(clé, valeur, ttl)` applique une gigue de plus ou moins 10 % à la durée de vie (`withJitter`) : une clé de 600 s expire entre 540 et 660 s. Cela évite que des milliers de clés créées au même instant expirent au même instant. `setIfAbsent` n'applique pas de gigue : les verrous gardent une durée exacte.

Les données dont la durée est critique portent leur propre échéance : le défi OTP stocke `expiresAt` dans sa valeur, et la révocation de session prend une marge de 20 % plus 30 s.

## Clés applicatives

### Authentification et sessions

| Clé | Valeur | Durée de vie | Écrite par |
|---|---|---|---|
| `auth:otp:<sujet>` | JSON du défi : empreinte du code, usage, tentatives, échéance, éventuelle inscription en attente | 600 s (avec gigue) ; réécrite avec la durée restante après une erreur | [`backend/src/services/otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts) |
| `auth:otp-failures:<sujet>` | Nombre d'erreurs de code | 3 600 s (avec gigue) | idem |
| `auth:totp-used:<userId>:<compteur>` | `1` : fenêtre TOTP déjà consommée, contre le rejeu | 120 s, `setIfAbsent` | idem |
| `auth:revoked:<jti>` | `1` : jeton de session révoqué | Durée restante du jeton × 1,2 + 30 s | [`backend/src/services/session.service.ts`](src:backend/src/services/session.service.ts) |
| `auth:revoked-before:<userId>` | Horodatage en millisecondes : tout jeton émis avant est révoqué (déconnexion de tous les appareils) | 30 jours (avec gigue) | idem |

### Requêtes et webhooks

| Clé | Valeur | Durée de vie | Écrite par |
|---|---|---|---|
| `idempotency:<compte>:<méthode>:<chemin>:<clé>` | `PENDING` pendant le traitement, puis JSON du statut et du corps de la réponse | 60 s pour le verrou (`setIfAbsent`), 24 h pour la réponse ; supprimée si la réponse est une 5xx | [`backend/src/middlewares/idempotency.middleware.ts`](src:backend/src/middlewares/idempotency.middleware.ts) |
| `webhook:seen:<signature>` | `1` : signature déjà reçue, contre le rejeu | 7 jours, `setIfAbsent` | [`backend/src/api/webhooks/webhook-signature.ts`](src:backend/src/api/webhooks/webhook-signature.ts) |

### Blockchain

| Clé | Valeur | Durée de vie | Écrite par |
|---|---|---|---|
| `chain:keeper-lock` | `1` : un process exécute le keeper | `max(5, KEEPER_INTERVAL_MS / 1000)` s, 10 s par défaut ; supprimée en fin de passe | [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts) |
| `wallet:grant-lock:<userId>` | `1` : dotation de bienvenue en cours | 120 s ; supprimée en cas d'échec | [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) |
| `blockchain:circuit_breaker` | `true` ou `false` : disjoncteur, en mode simulé seulement | Aucune | [`backend/src/services/blockchain.service.ts`](src:backend/src/services/blockchain.service.ts) |
| `blockchain:fallback_active` | `true` ou `false` | Aucune | idem ; écrite mais jamais relue |

### Données utilisateur et partenaires

Ces clés n'ont pas de durée de vie et n'ont **pas d'équivalent en base**. Elles sont donc des données persistantes, sauvegardées seulement par la persistance AOF de Redis.

| Clé | Valeur | Écrite par | Lue par |
|---|---|---|---|
| `user:ticket_limit:<userId>` | Limite de tickets par tour choisie par le citoyen (jeu responsable) ; 50 si absente | `PUT /user/responsible-limit` | Achat et cadeau, profil |
| `user:prefs:<userId>` | JSON des préférences | `updatePreferences` | `getProfile`, `updatePreferences` |
| `user:quests:<userId>` | JSON de la liste des quêtes sociales réalisées | `completeSocialQuest` | `getSocialQuests`, `completeSocialQuest` |
| `partner:codes:<rewardId>` | JSON du lot de codes promo importés pour une offre, consommé à chaque échange | `POST /partners/codes/upload` | Échange de récompense |
| `partner:offer_expiry:<offreId>` | Date d'expiration d'une offre | Création d'offre | Jamais relue |

> [!WARNING]
> Une perte des données Redis efface les limites de jeu responsable (retour à 50 tickets), les préférences, l'historique des quêtes (une quête pourrait être validée une seconde fois) et les codes promo importés non encore distribués. Ces données ne sont pas couvertes par `pg_dump` ; voir [Performance et sauvegardes](performance-sauvegardes.md).

## Clés hors RedisManager

| Clé ou canal | Préfixe | Usage |
|---|---|---|
| `<REDIS_KEY_PREFIX>:<NODE_ENV>:ratelimit:global:<ip>` | Ajouté explicitement | Compteur du limiteur global, fenêtre de 15 min, 300 requêtes (10 000 en test) |
| `<REDIS_KEY_PREFIX>:<NODE_ENV>:ratelimit:auth:<ip>` | Ajouté explicitement | Compteur du limiteur d'authentification, fenêtre de 10 min, 30 requêtes |
| Canal `<REDIS_KEY_PREFIX>:<NODE_ENV>:socket-events` | Ajouté explicitement | Pub/sub du [relais temps réel](../integration-blockchain/relais-temps-reel.md) ; aucune donnée stockée |
| `bull:<file>:*` | Préfixe propre à BullMQ | Files de jobs (voir plus bas) |

Le limiteur de débit est défini dans [`backend/src/middlewares/rateLimiter.middleware.ts`](src:backend/src/middlewares/rateLimiter.middleware.ts) avec le magasin `rate-limit-redis`. Il est réglé en `passOnStoreError: true` : si Redis ne répond pas, la requête passe (choix fail-open, pour que la panne de Redis n'arrête pas l'API).

## Files BullMQ

Trois files partagent les options de [`backend/src/queues/queue.options.ts`](src:backend/src/queues/queue.options.ts) : 5 tentatives, attente exponentielle à partir de 1 s avec gigue de 50 %, jobs terminés conservés 24 h (1 000 au plus), jobs en échec conservés 14 jours.

| File | Nom des jobs | Producteur | Worker | Concurrence |
|---|---|---|---|---|
| `emails-queue` | `send-email` | [`backend/src/queues/emails.queue.ts`](src:backend/src/queues/emails.queue.ts) | `startEmailWorker` | `WORKER_CONCURRENCY` |
| `ledger-queue` | `ledger-op` | [`backend/src/queues/ledger.queue.ts`](src:backend/src/queues/ledger.queue.ts) | `startLedgerWorker` | 1 |
| `chain-actions` | `MINT_BADGE`, `CLAIM_PRIZE`, `CLAIM_REFUND` | [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) | `startChainActionsWorker` | 1 |

Les files ne passent pas par `RedisManager` : leurs clés ne portent pas le préfixe `REDIS_KEY_PREFIX`, mais le préfixe par défaut de BullMQ, `bull`. Par exemple `bull:chain-actions:wait`, `bull:chain-actions:failed`, `bull:ledger-queue:<jobId>`. Deux environnements qui partageraient une même instance Redis partageraient donc leurs files.

La file `chain-actions` est détaillée sur la page [File d'actions on-chain](../integration-blockchain/actions.md), les deux autres sur la page [Files et workers](../backend/files-workers.md).

## Repli en mémoire

Chaque méthode de `RedisManager` teste d'abord si le client est prêt (`status === 'ready'`). S'il ne l'est pas, ou si la commande échoue ou dépasse 500 ms, elle utilise une `Map` locale au process :

| Méthode | Comportement de repli |
|---|---|
| `get` | Lit la `Map`, en supprimant une entrée expirée |
| `set` | Écrit dans la `Map` avec l'échéance (gigue comprise) |
| `setIfAbsent` | Écrit seulement si aucune entrée non expirée n'existe |
| `del` | Supprime de la `Map` ; la suppression est aussi tentée sur Redis |

Le repli permet à l'API de continuer à servir quand Redis tombe. Ses limites :

- la `Map` est propre à chaque process : les verrous (`chain:keeper-lock`, `wallet:grant-lock`) et l'idempotence ne protègent plus entre l'API et le worker ou entre plusieurs instances ;
- les données écrites pendant la panne ne sont pas recopiées dans Redis au retour, et réciproquement : une clé écrite en mémoire n'est plus lue une fois Redis revenu ;
- la `Map` n'a pas de limite de taille et est perdue au redémarrage.

Pour les files, le repli consiste à exécuter le travail directement dans le process (envoi d'email, opération ledger, action on-chain), sans réessai. Sans client Redis du tout, le process worker refuse de démarrer (« Aucun worker démarré : Redis est requis pour le process worker »).

Dans les tests unitaires, `redis.config` est remplacé par [`backend/__tests__/__mocks__/redis.mock.ts`](src:backend/__tests__/__mocks__/redis.mock.ts), une `Map` sans durée de vie dont `getRawClient()` renvoie `null`.

## Configuration du serveur Redis

Le service `redis` de [`docker-compose.yml`](src:docker-compose.yml) lance `redis:7.4-alpine` avec :

| Option | Valeur | Raison |
|---|---|---|
| `--appendonly` | `yes` | Persistance AOF : les données utilisateur ci-dessus et les jobs survivent à un redémarrage |
| `--appendfsync` | `everysec` | Au plus une seconde d'écritures perdue en cas d'arrêt brutal |
| `--maxmemory` | `256mb` | Plafond mémoire |
| `--maxmemory-policy` | `noeviction` | Redis refuse les écritures plutôt que d'évincer des clés : BullMQ l'exige, une éviction pourrait supprimer un job |
| `--slowlog-log-slower-than` | `10000` | Journalise les commandes de plus de 10 ms |

Les données sont dans le volume `redisdata`. Le port n'est publié que sur `127.0.0.1:6380`.

## Inspecter les clés

```bash
docker compose exec redis redis-cli --scan --pattern 'blocklucky:production:*'
docker compose exec redis redis-cli TTL blocklucky:production:chain:keeper-lock
docker compose exec redis redis-cli --scan --pattern 'bull:chain-actions:*'
```

`--scan` parcourt les clés par lots, sans bloquer le serveur comme le ferait `KEYS`.
