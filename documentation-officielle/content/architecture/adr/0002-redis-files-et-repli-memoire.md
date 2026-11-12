# 0002 Redis pour les files et l'état court, avec repli en mémoire

- Statut : accepté
- Date : 2026-11-10

## Contexte

Le backend utilise Redis pour les files BullMQ (emails, ledger), le rate limiting et quelques états courts (préférences, quêtes, disjoncteur blockchain). L'environnement de développement doit fonctionner même sans Redis.

## Décision

- Une seule instance Redis en local, configurée en `maxmemory-policy noeviction` (obligatoire pour BullMQ) avec persistance AOF `everysec`.
- Toutes les clés applicatives sont préfixées `blocklucky:<environnement>:` et écrites avec un timeout de commande court (500 ms).
- Si Redis est indisponible : les lectures et écritures basculent sur une mémoire locale, les jobs sont exécutés directement dans la requête et le rate limiter laisse passer (fail-open) au lieu de bloquer l'API.
- Les jobs BullMQ ont 5 tentatives avec backoff exponentiel et jitter. Les erreurs métier (4xx) sont marquées `UnrecoverableError` pour ne pas être rejouées. Les jobs terminés sont conservés 24 h, les échecs 14 jours.

## Conséquences

- L'API reste disponible si Redis tombe, au prix d'un rate limit non partagé et d'une exécution synchrone des emails.
- En production, il faudra séparer une instance cache (éviction autorisée) d'une instance files et état (noeviction, réplica et failover). Ce n'est pas fait car aucun environnement hébergé n'existe encore.

## Vérification dans le code

Cette section confronte la décision au dépôt actuel. Elle ne modifie pas la décision.

### Ce qui est conforme

| Élément de la décision | Constat | Où |
|---|---|---|
| Instance locale | `redis:7.4-alpine` lancé avec `--appendonly yes`, `--appendfsync everysec`, `--maxmemory 256mb`, `--maxmemory-policy noeviction` | [`docker-compose.yml`](src:docker-compose.yml) |
| Préfixe et timeout | `RedisManager` préfixe chaque clé par `${REDIS_KEY_PREFIX}:${NODE_ENV}:` (`blocklucky` par défaut) et coupe chaque commande à 500 ms (`CACHE_COMMAND_TIMEOUT_MS`) | [`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts) |
| Repli en mémoire | `get`, `set`, `setIfAbsent` et `del` utilisent une `Map` locale si le client n'est pas prêt ou si la commande échoue | [`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts) |
| Exécution directe des emails | `enqueueEmail` appelle `emailService.sendTemplateEmail` si l'ajout à la file échoue | [`backend/src/queues/emails.queue.ts`](src:backend/src/queues/emails.queue.ts) |
| Rate limit en fail-open | `passOnStoreError: true` sur les deux limiteurs | [`backend/src/middlewares/rateLimiter.middleware.ts`](src:backend/src/middlewares/rateLimiter.middleware.ts) |
| Options des jobs | `attempts: 5`, `backoff: { type: 'exponential', delay: 1000, jitter: 0.5 }`, `removeOnComplete: { age: 24 h, count: 1000 }`, `removeOnFail: { age: 14 jours }` | [`backend/src/queues/queue.options.ts`](src:backend/src/queues/queue.options.ts) |
| Erreurs non rejouées | Le worker ledger convertit les `AppError` de statut inférieur à 500 en `UnrecoverableError` ; le worker email rejette sans nouvelle tentative un job incomplet ; la file `chain-actions` fait de même pour les erreurs définitives du contrat | [`backend/src/workers/ledger.worker.ts`](src:backend/src/workers/ledger.worker.ts), [`backend/src/workers/email.worker.ts`](src:backend/src/workers/email.worker.ts), [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) |
| Instance unique | Toujours une seule instance Redis, pas de séparation cache et files | [`docker-compose.yml`](src:docker-compose.yml) |

### Écarts et précisions

**Les échecs SMTP ne sont jamais rejoués.** `sendTemplateEmail` ([`backend/src/services/email.service.ts`](src:backend/src/services/email.service.ts)) attrape l'erreur de `transporter.sendMail`, la journalise en avertissement et renvoie `false`. Le job BullMQ se termine donc avec succès : les 5 tentatives prévues ne s'appliquent pas à une panne du serveur SMTP. Un code de connexion peut ainsi être perdu sans nouvelle tentative.

**Tous les préfixes ne passent pas par `RedisManager`.** Les files BullMQ utilisent le client brut et le préfixe par défaut de BullMQ (`bull:<nom de la file>:`). Le rate limit utilise son propre préfixe `blocklucky:<environnement>:ratelimit:<nom>:` sans le timeout de 500 ms. Le canal du relais Socket.IO est `blocklucky:<environnement>:socket-events` ([`backend/src/socket/event-bridge.ts`](src:backend/src/socket/event-bridge.ts)).

**Le périmètre de Redis s'est élargi.** Redis porte aussi la file `chain-actions`, les verrous du keeper (`chain:keeper-lock`) et de la dotation de bienvenue (`wallet:grant-lock:<id>`), les défis OTP, la révocation des sessions, les réponses idempotentes et le relais pub/sub des événements temps réel. Ces usages sont détaillés dans [Données Redis](../../base-de-donnees/redis.md).

**Le disjoncteur n'est dans Redis qu'en mode simulé.** En mode `onchain`, l'état de pause est lu dans le contrat (`paused()`). La clé `blockchain:circuit_breaker` n'est écrite que par la branche simulée de [`backend/src/services/blockchain.service.ts`](src:backend/src/services/blockchain.service.ts).

**Des données durables sont stockées comme de l'état court.** Les préférences (`user:prefs:<id>`), les quêtes accomplies (`user:quests:<id>`), les lots de codes partenaires (`partner:codes:<rewardId>`) et les dates d'expiration d'offres (`partner:offer_expiry:<offerId>`) sont écrits sans expiration ([`backend/src/api/user/user.services.ts`](src:backend/src/api/user/user.services.ts), [`backend/src/api/partners/partners.services.ts`](src:backend/src/api/partners/partners.services.ts)). Ils ne sont pas en base : en mode repli mémoire, ils sont perdus au redémarrage du process, et une perte de Redis efface par exemple les préférences d'un citoyen ou les codes promo importés par un partenaire.

**Le repli des jobs n'est pas toujours synchrone.** Pour `chain-actions`, `enqueueChainAction` lance `executeChainAction` en arrière-plan sans l'attendre si la file est indisponible. La requête HTTP n'attend donc pas la frappe du badge ou le retrait de la cagnotte.

**Le worker ne démarre pas sans client Redis.** `src/worker.ts` s'arrête avec le code 1 si aucun worker n'a été créé. En pratique, le client n'est absent qu'en environnement de test (`NODE_ENV=test`), car `RedisManager` crée toujours le client ailleurs.

**Point d'attention au démarrage.** Le client ioredis est créé avec `lazyConnect: true` : la connexion ne s'ouvre qu'à la première commande. Tant qu'elle n'est pas prête (`status !== 'ready'`), `RedisManager` sert les lectures et écritures depuis la mémoire locale. Une donnée écrite pendant ce court intervalle, par exemple un défi OTP, n'est pas visible des autres process. Ce comportement est déduit du code et n'a pas été reproduit.

## Pour aller plus loin

- [Données Redis](../../base-de-donnees/redis.md) : inventaire des clés.
- [Files et workers](../../backend/files-workers.md) : producteurs, consommateurs et métriques.
- [Runbooks](../../infrastructure/runbooks.md) : conduite à tenir quand Redis tombe.
