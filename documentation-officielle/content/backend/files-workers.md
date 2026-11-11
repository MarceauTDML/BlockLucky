# Files et workers

Le backend sort de la requête HTTP les traitements lents ou à risque : envoi des emails, actions on-chain différées (frappe des POAP, versement de la cagnotte, remboursements) et lecture continue de la blockchain. Les deux premiers passent par des files BullMQ dans Redis ; la lecture de la chaîne et le keeper sont des boucles à intervalle fixe. Tous ces traitements peuvent tourner dans le process de l'API ou dans un process worker séparé. Le principe du repli sans Redis est justifié dans l'[ADR 0002](../architecture/adr/0002-redis-files-et-repli-memoire.md).

## Vue d'ensemble

| Traitement | Type | Producteur | Consommateur | Concurrence |
|---|---|---|---|---|
| `emails-queue` | file BullMQ | `enqueueEmail` (auth, boutique, RGPD) | [`backend/src/workers/email.worker.ts`](src:backend/src/workers/email.worker.ts) | `WORKER_CONCURRENCY` (5) |
| `ledger-queue` | file BullMQ | `enqueueLedgerTransaction`, jamais appelée | [`backend/src/workers/ledger.worker.ts`](src:backend/src/workers/ledger.worker.ts) | 1 |
| `chain-actions` | file BullMQ | `enqueueChainAction` (indexeur) | `startChainActionsWorker` de [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) | 1 |
| Indexeur | boucle `setInterval` | aucun | `lotteryIndexer.syncOnce` | 1, garde `syncing` |
| Keeper | boucle `setInterval` | aucun | `runKeeperOnce` de [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts) | 1, verrou Redis |

[`backend/src/workers/index.ts`](src:backend/src/workers/index.ts) regroupe les trois workers BullMQ (`startWorkers`, `closeWorkers`). L'indexeur et le keeper sont démarrés par `startChainServices`, seulement en mode `onchain`.

## Options communes des jobs

[`backend/src/queues/queue.options.ts`](src:backend/src/queues/queue.options.ts) définit les options appliquées par défaut aux trois files :

| Option | Valeur | Effet |
|---|---|---|
| `attempts` | 5 | un job en échec est retenté jusqu'à 5 exécutions |
| `backoff` | exponentiel, 1 000 ms, gigue 0,5 | délais d'environ 1, 2, 4 puis 8 secondes, avec une variation aléatoire |
| `removeOnComplete` | 24 heures ou 1 000 jobs | les jobs terminés sont purgés au-delà |
| `removeOnFail` | 14 jours | les jobs définitivement échoués restent consultables deux semaines |

Un job qui lève `UnrecoverableError` n'est pas retenté. Chaque fin de job incrémente `queue_jobs_total{queue, status}` avec `completed` ou `failed`.

Les files utilisent le client ioredis partagé de [`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts), avec le préfixe de clés par défaut de BullMQ : les clés sont `bull:emails-queue:*`, `bull:ledger-queue:*` et `bull:chain-actions:*`, sans `REDIS_KEY_PREFIX`. Deux environnements qui partagent la même base Redis partagent donc leurs files.

## File emails-queue

```typescript
await enqueueEmail({
  to: user.email,
  subject: 'Votre code de connexion - BlockLucky',
  templateName: 'otp-code',
  variables: { CODE: code, EXPIRES_MINUTES: '10' },
});
```

Le producteur ajoute un job `send-email` et renvoie `{ queued: true, jobId }`. Si la file n'existe pas ou si l'ajout échoue, l'email est envoyé immédiatement dans la requête et la fonction renvoie `{ queued: false }`. Le worker vérifie que `to` et `templateName` sont présents (sinon `UnrecoverableError`) puis appelle `emailService.sendTemplateEmail`.

> [!WARNING]
> `sendTemplateEmail` ne lève pas d'erreur quand le serveur SMTP refuse le message : elle journalise un avertissement et renvoie `false`. Le job est alors marqué terminé, sans nouvelle tentative. Les 5 tentatives ne couvrent en pratique que les erreurs inattendues. Un code de connexion peut donc être perdu sans trace autre qu'une ligne `warn` contenant « Mode simulation d'envoi d.email ».

## File ledger-queue

`enqueueLedgerTransaction({ userId, amount, actionType, description, operation })` met en file un crédit ou un débit d'EtherPoints, exécuté un par un par le worker (concurrence 1) pour sérialiser les écritures. Une `AppError` de statut inférieur à 500 (solde insuffisant, compte introuvable) devient une `UnrecoverableError`.

> [!NOTE]
> Aucun code n'appelle `enqueueLedgerTransaction` : tous les mouvements de points sont écrits directement par `ledgerService` pendant la requête ou pendant l'indexation. Le worker ledger démarre et attend des jobs qui n'arrivent jamais. La file peut être supprimée, ou branchée sur les crédits de l'indexeur si leur volume l'exige.

## File chain-actions

Les actions on-chain qui découlent d'un événement du contrat sont mises en file par l'indexeur, pour ne pas bloquer l'indexation et pour bénéficier des nouvelles tentatives. Le détail fonctionnel est sur la page [File d'actions on-chain](../integration-blockchain/actions.md).

| Job | Mis en file à | Signé par | Appel |
|---|---|---|---|
| `MINT_BADGE` | chaque `TicketsPurchased` nouvellement indexé, pour le joueur | compte opérateur | `BlockLuckyPOAP.mintBadge(joueur, tour)` |
| `CLAIM_PRIZE` | `WinnerPicked`, pour le gagnant | portefeuille intégré du gagnant | `BlockLucky.claimPrize(tour)` |
| `CLAIM_REFUND` | `RoundCancelled`, pour chaque payeur distinct | portefeuille intégré du payeur | `BlockLucky.claimRefund(tour)` |

| Règle | Détail |
|---|---|
| Déduplication | `jobId = <type>-<tour>-<adresse>` : un second ajout identique est ignoré par BullMQ tant que le job existe, terminé ou échoué |
| Déjà fait | `PrizeAlreadyClaimed`, `NothingToRefund`, `BadgeAlreadyMinted` : le job se termine sans erreur |
| Erreur définitive | `NotWinner`, `RoundNotCompleted`, `RoundNotCancelled`, `ZeroAddressNotAllowed` : `UnrecoverableError`, pas de nouvelle tentative |
| Compte sans clé | portefeuille inconnu ou sans `walletEncryptedKey` : le job se termine sans rien faire |
| Concurrence | 1, pour éviter les conflits de nonce du compte opérateur |
| Mode simulé | `enqueueChainAction` ne fait rien et le worker n'est pas créé |

Comme le `jobId` est conservé 14 jours après un échec définitif, il faut supprimer le job échoué pour pouvoir remettre la même action en file. Voir [Runbooks blockchain](../infrastructure/runbooks-blockchain.md).

## Indexeur et keeper

| Boucle | Période | Rôle |
|---|---|---|
| `lotteryIndexer.syncOnce` | `INDEXER_INTERVAL_MS` (3 000 ms) | lit au plus 2 000 blocs de journaux du contrat depuis le curseur `ChainCursor`, projette les événements en base, avance le curseur |
| `runKeeperOnce` | `KEEPER_INTERVAL_MS` (10 000 ms) | si le contrat n'est pas en pause : `requestDraw()` quand `isDrawReady()`, sinon `closeExpiredRound()` quand `isExpiredWithoutDraw()` |

L'indexeur fait un premier passage dès le démarrage. Un passage en cours bloque le suivant dans le même process. Le keeper prend le verrou Redis `chain:keeper-lock` (durée de `KEEPER_INTERVAL_MS`, 5 secondes au moins) et le relâche à la fin de chaque passage : deux process ne demandent pas le tirage en même temps. Le fonctionnement détaillé est dans [Indexeur d'événements](../integration-blockchain/indexeur.md) et [Keeper du tirage](../integration-blockchain/keeper.md).

## Où tournent les workers

| Configuration | Process API | Process worker |
|---|---|---|
| Développement par défaut (`RUN_WORKERS=true`, `npm run dev`) | API, Socket.IO, 3 workers, indexeur, keeper | absent |
| Séparé (`RUN_WORKERS=false` + `npm run dev:worker` ou `npm run start:worker`) | API, Socket.IO, relais Redis | 3 workers, indexeur, keeper |
| Stack Docker | service `backend`, `RUN_WORKERS=false` | service `worker`, commande `node dist/src/worker.js` |

Le process worker ignore `RUN_WORKERS` : il démarre toujours ses workers et, en mode onchain, l'indexeur et le keeper. Les événements temps réel qu'il produit sont relayés vers l'API par Redis (voir [Relais depuis le worker](socket-io.md#relais-depuis-le-worker)).

### Sondes du process worker

Le worker ouvre un serveur HTTP minimal sur `PORT + 1` (2054 avec la configuration par défaut) :

| Chemin | Réponse |
|---|---|
| `/health/live` | 200 `{ "status": "ok" }`, ou 503 `{ "status": "shutting_down" }` pendant l'arrêt |
| `/metrics` | métriques Prometheus du worker si `METRICS_ENABLED=true` ; aucun contrôle de `METRICS_TOKEN` |
| autre | 404 sans corps |

Le service Docker `worker` utilise `/health/live` sur le port 2054 comme sonde de santé ; ce port n'est pas publié sur l'hôte. Si `startWorkers` ne crée aucun worker, le process journalise `Aucun worker démarré : Redis est requis pour le process worker` et s'arrête avec le code 1.

## Fonctionnement sans Redis

| Situation | Comportement |
|---|---|
| `NODE_ENV=test` | aucun client Redis n'est créé : aucune file, `enqueueEmail` appelle directement `sendTemplateEmail` (qui n'envoie rien en test), aucun worker |
| Redis injoignable | l'ajout en file échoue : `enqueueEmail` envoie l'email pendant la requête et `enqueueChainAction` lance l'action sans l'attendre, sans nouvelle tentative ; le verrou du keeper, l'idempotence et les sessions révoquées passent dans la mémoire du process |

Le client ioredis abandonne la reconnexion après trois tentatives espacées de 200 à 600 ms (`retryStrategy` renvoie `null` à la quatrième). Une fois abandonnée, ioredis ne rétablit plus la connexion de lui-même : si Redis redevient disponible, le process reste en repli mémoire jusqu'à son redémarrage, et `/health/deep` signale `redis: down`. Après un incident Redis, redémarrez l'API et le worker.

> [!CAUTION]
> En repli, les jobs ne sont pas persistés : une action on-chain lancée directement et interrompue par un arrêt du process est perdue. Les remboursements et versements peuvent alors être relancés manuellement par `POST /lottery/claim-prize` ou depuis le contrat.

## Arrêt

À l'arrêt, `closeWorkers` attend la fin des jobs en cours de chaque worker (`worker.close()`), puis les files sont fermées avec les autres ressources (voir [Arrêt propre](structure.md#arret-propre)). Un job interrompu par l'arrêt forcé est repris par BullMQ au redémarrage suivant, comme un job bloqué.
