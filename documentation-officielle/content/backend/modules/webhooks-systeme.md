# Webhooks et système

Cette page regroupe deux modules techniques. Le module `system` fournit les sondes de santé et la configuration lue par les clients au démarrage. Le module `webhooks` reçoit des événements blockchain signés par HMAC ; il ne sert qu'en mode `simulated`, car en mode `onchain` l'indexeur lit directement les événements du contrat.

| Fichier | Contenu |
|---|---|
| [`backend/src/api/system/system.routes.ts`](src:backend/src/api/system/system.routes.ts) | Sondes et `/api/config` |
| [`backend/src/api/webhooks/webhooks.routes.ts`](src:backend/src/api/webhooks/webhooks.routes.ts) | Route du webhook |
| [`backend/src/api/webhooks/webhook-signature.ts`](src:backend/src/api/webhooks/webhook-signature.ts) | Signature, vérification et anti-rejeu |
| [`backend/src/api/webhooks/webhooks.validators.ts`](src:backend/src/api/webhooks/webhooks.validators.ts) | Union discriminée des trois événements |
| [`backend/src/api/webhooks/blockchain.webhook.ts`](src:backend/src/api/webhooks/blockchain.webhook.ts) | Contrôleur |
| [`backend/src/workers/blockchain-indexer.worker.ts`](src:backend/src/workers/blockchain-indexer.worker.ts) | Indexation simulée des tickets et des gagnants |

## Module système

Ces routes sont montées à la racine de l'application, avant le mode maintenance et avant le rate limiting global : elles répondent toujours, même quand l'API est en maintenance ou qu'un client a épuisé son quota. Elles n'existent pas sous `/api/v1` (`/api/v1/config` renvoie 404). Leur exploitation par les orchestrateurs est détaillée dans [Observabilité](../observabilite.md#sondes-de-sante).

| Méthode et chemin | Usage | Dépendances testées |
|---|---|---|
| `GET /health` | état général et indicateurs réseau pour les clients | état du disjoncteur (lecture du contrat en onchain) |
| `GET /health/live` | vivacité du process | aucune |
| `GET /health/ready` | disponibilité pour recevoir du trafic | PostgreSQL |
| `GET /health/deep` | diagnostic détaillé | PostgreSQL, Redis, réseau blockchain |
| `GET /api/config` | configuration des clients | aucune |
| `GET /metrics` | métriques Prometheus, déclarée dans `app.ts` | aucune |

### GET /health

Répond toujours 200. En mode onchain, `isPaused` lit `paused()` sur le contrat ; si le nœud ne répond pas, la valeur est `false`.

```json
{ "status": "ok", "message": "BlockLucky API is running", "timestamp": "2026-11-11T18:00:00.000Z", "network": { "isFallback": false, "isPaused": false } }
```

### GET /health/live et /health/ready

`/health/live` renvoie `{ "status": "ok", "uptimeSeconds": 3605 }` sans toucher à aucune dépendance. C'est la sonde du `HEALTHCHECK` de l'image Docker.

`/health/ready` renvoie 503 `{ "status": "shutting_down" }` dès qu'un arrêt est en cours. Sinon il exécute `SELECT 1` avec un délai de 2 secondes :

```json
{ "status": "ready", "database": { "status": "up", "latencyMs": 3 } }
```

Base injoignable : 503 avec `"status": "not_ready"` et `"database": { "status": "down", ... }`. Redis et la blockchain ne sont pas testés : l'API sait fonctionner sans Redis (repli mémoire) et une panne du nœud ne doit pas retirer l'instance du trafic.

### GET /health/deep

Le résultat est calculé au plus une fois toutes les 5 secondes et servi avec `Cache-Control: no-store`. Le statut HTTP est 503 seulement si PostgreSQL est indisponible.

| `status` | Condition |
|---|---|
| `pass` | PostgreSQL et Redis répondent |
| `warn` | PostgreSQL répond, Redis est `down` ou `disabled` |
| `fail` | PostgreSQL ne répond pas |

Le détail n'est renvoyé qu'à un appelant autorisé : en-tête `Authorization: Bearer <METRICS_TOKEN>` si ce jeton est défini, ou n'importe quel appelant hors production si aucun jeton n'est défini. Les autres reçoivent seulement `{ "status": "pass" }`.

```json
{
  "status": "pass",
  "version": "1.0.0",
  "checkedAt": "2026-11-11T18:00:05.120Z",
  "checks": {
    "database": { "status": "up", "latencyMs": 4 },
    "redis": { "status": "up", "latencyMs": 1 },
    "blockchain": { "mode": "onchain", "chainId": 31337, "isFallback": false, "rpcUrl": "http://127.0.0.1:8545", "isPaused": false, "contractAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", "poapContractAddress": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" }
  }
}
```

### GET /api/config

Lu par l'application mobile au démarrage pour imposer une mise à jour ou afficher la maintenance. Réponse publique mise en cache 60 secondes (`Cache-Control: public, max-age=60`) :

```json
{ "success": true, "data": { "apiVersion": "v1", "minimumMobileVersion": "1.0.0", "maintenance": false } }
```

Comme cette route est montée avant le filtre de maintenance, elle continue de répondre pendant une maintenance et permet aux clients de l'annoncer.

## Webhook blockchain

### Rôle

`POST /api/v1/webhooks/blockchain` permet à un service externe de notifier des achats et des tirages sans passer par un nœud. Il ne fonctionne qu'en mode `simulated` (tests d'intégration, démonstration sans blockchain). En mode `onchain`, après vérification de la signature et du corps, il répond `409 En mode blockchain réel, les événements sont lus directement dans le Smart Contract : ce webhook de simulation est désactivé.` L'indexeur réel est décrit dans [Indexeur d'événements](../../integration-blockchain/indexeur.md).

### Signature

L'en-tête `x-webhook-signature` a la forme `t=<horodatage unix en secondes>,v1=<signature>`, où la signature est le HMAC-SHA-256 hexadécimal (64 caractères) de la chaîne `<horodatage>.<corps brut>` avec `WEBHOOK_SECRET`. Le corps brut est capturé par `express.json` avant le parsing ; un corps reformaté après signature (espaces, ordre des clés) ne passe pas.

| Contrôle | Échec |
|---|---|
| En-tête et corps présents | `401 Signature de webhook blockchain invalide ou expirée` |
| Horodatage entier et signature de 64 hexadécimaux minuscules | idem |
| Horodatage à moins de 5 minutes de l'heure du serveur, dans les deux sens | idem |
| HMAC égal, comparé en temps constant | idem |
| Signature jamais vue (`webhook:seen:<signature>` posée pour 7 jours) | `200 Événement déjà reçu, ignoré` avec `data: { "duplicate": true }` |

Le contrôle d'anti-rejeu enregistre la signature avant la validation du corps : un envoi signé mais invalide (400) ne peut pas être renvoyé tel quel, il faut le signer à nouveau. La fonction `signWebhookPayload(rawBody)` du même fichier produit l'en-tête ; les tests l'utilisent.

```bash
BODY='{"eventType":"TICKET_PURCHASED","payload":{"transactionHash":"0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08","blockNumber":19500123,"walletAddress":"0x8b3f0e5c2d9a71b46e0f3c8d2a5b7e9f1c4d6a08","contractRoundId":1}}'
TS=$(date +%s)
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
curl -s -X POST http://localhost:2053/api/v1/webhooks/blockchain \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: t=$TS,v1=$SIG" \
  -d "$BODY"
```

### Événements

Le corps est une union discriminée sur `eventType`. Un type inconnu est rejeté par Zod en 400.

| `eventType` | `payload` |
|---|---|
| `TICKET_PURCHASED` | `transactionHash` (`0x` + 64 hexadécimaux), `blockNumber` (entier positif ou nul), `walletAddress` (`0x` + 40 hexadécimaux), `contractRoundId` (1 à 1 000 000), `ticketPriceEth` (facultatif, positif, 10 au plus) |
| `WINNER_PICKED` | `contractRoundId`, `winnerWallet`, `chainlinkRequestId` (facultatif, 128 caractères au plus) |
| `RPC_FALLBACK_SWITCH` | `active` (booléen) |

#### TICKET_PURCHASED

1. Le compte du portefeuille est retrouvé, ou créé sans email ni clé.
2. Le tour `contractRoundId` est retrouvé, ou créé `OPEN`.
3. Si un ticket porte déjà ce `transactionHash`, il est renvoyé avec `alreadyIndexed: true`, sans autre effet.
4. Sinon le ticket est créé et `prizePool` augmenté de `ticketPriceEth` (0,01 par défaut) dans une transaction, puis 50 EtherPoints `TICKET_PURCHASE` sont crédités.

```json
{ "success": true, "message": "Événement TicketPurchased indexé avec succès", "data": { "ticket": { "id": "019a7c90-...", "transactionHash": "0x9f86...0a08", "blockNumber": 19500123 }, "alreadyIndexed": false } }
```

Un hachage de transaction correspond ici à un seul ticket. Aucun événement Socket.IO n'est émis.

#### WINNER_PICKED

Le tour doit exister. Il passe `COMPLETED` avec le gagnant en minuscules, la requête Chainlink fournie (ou la précédente) et `drawnAt` à l'heure courante. Le gagnant n'est pas contrôlé parmi les participants et aucun événement `draw:winner` n'est diffusé.

> [!NOTE]
> Un tour inconnu lève une `Error` simple et non une `AppError` : la réponse est un 500, avec le message `LotteryRound #<n> introuvable` hors production.

#### RPC_FALLBACK_SWITCH

Bascule le client RPC sur `FALLBACK_RPC_URL` (`active: true`) ou revient sur `RPC_URL`, écrit `blockchain:fallback_active` dans Redis et renvoie l'état du réseau. La bascule est locale au process qui reçoit la requête.

> [!WARNING]
> C'est la seule commande de bascule RPC du backend. Comme la route répond 409 en mode onchain avant de traiter l'événement, la bascule vers le nœud de secours est impossible dans le seul mode où elle aurait un effet. La clé Redis `blockchain:fallback_active` n'est relue par aucun code. Voir [Client RPC et compte opérateur](../../integration-blockchain/client-rpc.md).

## Erreurs

| Statut | Message | Cas |
|---|---|---|
| 200 | `Événement déjà reçu, ignoré` | rejeu d'une signature |
| 400 | `Erreur de validation des données` | corps invalide ou type inconnu |
| 401 | `Signature de webhook blockchain invalide ou expirée` | signature absente, fausse ou trop ancienne |
| 409 | `En mode blockchain réel, ...` | mode onchain |
| 500 | `Erreur interne du serveur` | `WINNER_PICKED` sur un tour inconnu, en production |
| 503 | réponse JSON des sondes | `/health/ready` ou `/health/deep` sans base |
