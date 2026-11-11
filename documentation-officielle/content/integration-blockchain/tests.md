# Tests sur une vraie chaîne

L'intégration blockchain du backend est testée à deux niveaux :

| Suite | Commande | Mode | Dépendances | Fichiers |
|---|---|---|---|---|
| Tests unitaires et d'intégration API | `npm test` | `simulated` | Aucune (Prisma et Redis remplacés par des doubles) | `backend/__tests__/**/*.test.ts` |
| Test sur nœud réel | `npm run test:chain` | `onchain` | PostgreSQL, Redis, nœud Hardhat avec contrats déployés et répondeur VRF | `backend/__tests__/chain/**/*.chain.ts` |

Les tests des contrats Solidity eux-mêmes sont une troisième suite, dans `smart-contract/`, décrite sur la page [Tests des smart contracts](../smart-contracts/tests.md). La stratégie de test du backend dans son ensemble est sur la page [Tests du backend](../backend/tests.md).

## Tests unitaires en mode simulé

La configuration Jest de [`backend/package.json`](src:backend/package.json) retient les fichiers `**/__tests__/**/*.test.ts` et charge d'abord [`backend/__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts), qui force `BLOCKCHAIN_MODE=simulated`. Les fichiers de test remplacent `src/config/prisma.config` et `src/config/redis.config` par les doubles en mémoire de `backend/__tests__/__mocks__/`.

Ce que ces tests couvrent pour la partie blockchain :

| Fichier | Contenu lié à la chaîne |
|---|---|
| [`backend/__tests__/api/lottery.test.ts`](src:backend/__tests__/api/lottery.test.ts) | Achat, cadeau, statut, et routes POAP réelles : `/poap/3.json` renvoie une image en `/poap/3.svg`, le SVG est servi, `/poap/0.json` et `/poap/abc` renvoient 404 |
| [`backend/__tests__/integration/blockchain-indexer.test.ts`](src:backend/__tests__/integration/blockchain-indexer.test.ts) | Webhook d'indexation simulé : idempotence par hachage de transaction, rejeu ignoré, signature HMAC obligatoire |
| [`backend/__tests__/integration/full-draw-flow.test.ts`](src:backend/__tests__/integration/full-draw-flow.test.ts) | Parcours inscription, achat, tirage simulé et gagnant |

> [!IMPORTANT]
> Aucun test unitaire n'exerce le code de `backend/src/blockchain/` en mode onchain : la passerelle, l'indexeur, le keeper, la file d'actions et la dotation de bienvenue ne sont vérifiés que par la suite sur nœud réel. Une modification de ces fichiers doit donc être validée avec `npm run test:chain`, localement ou par le job CI `chain`.

## Test sur nœud réel : npm run test:chain

Le script lance `jest --runInBand --config jest.chain.config.json`. La configuration [`backend/jest.chain.config.json`](src:backend/jest.chain.config.json) :

| Clé | Valeur |
|---|---|
| `testMatch` | `**/__tests__/chain/**/*.chain.ts` |
| `setupFiles` | `__tests__/chain/setup-chain-env.ts` |
| `testTimeout` | 120 000 ms |

[`backend/__tests__/chain/setup-chain-env.ts`](src:backend/__tests__/chain/setup-chain-env.ts) force `BLOCKCHAIN_MODE=onchain`, `NODE_ENV=development`, désactive le code de connexion par email et la double authentification administrateur, et reprend les adresses de contrats par défaut si elles ne sont pas fournies. `NODE_ENV` vaut `development` et non `test` pour que le vrai client Redis soit créé : BullMQ et le worker de la file `chain-actions` en ont besoin.

Le test n'utilise aucun double : il passe par l'application Express réelle (Supertest), PostgreSQL et Redis réels, et le nœud JSON-RPC.

### Prérequis locaux

Depuis la racine du dépôt, démarrer l'infrastructure, puis depuis `backend/`, partir d'une base migrée :

```bash
docker compose up -d --wait
cd backend
npx prisma migrate deploy
npm run test:chain
```

Le service `blockchain` de Docker Compose démarre un nœud Hardhat, déploie les contrats aux adresses par défaut, puis lance `scripts/local-vrf-responder.ts`, qui répond aux requêtes VRF. Sans ce répondeur, le tirage resterait bloqué en `LOCKED` et le test échouerait au bout de 60 s.

Le test crée des comptes dont l'email est suffixé par un identifiant d'exécution (`Date.now().toString(36)`), ce qui permet de le relancer sur la même base. En revanche, il avance l'horloge du nœud et termine un tour : après plusieurs exécutions, la chaîne et la base ont évolué ensemble et restent cohérentes, mais un redémarrage du conteneur `blockchain` impose de réinitialiser la base (voir [Détection d'une chaîne réinitialisée](indexeur.md#detection-d-une-chaine-reinitialisee)).

### Scénario 1 : achat, cadeau, tirage et versement

| Étape | Vérification |
|---|---|
| Connexion d'Alice et Bob par `POST /api/v1/auth/login` | Statut 200 ; l'adresse du compte n'est pas celle envoyée par le client (portefeuille créé par le backend) |
| `GET /api/v1/lottery/wallet` pour Alice | `mode` vaut `onchain`, `balanceEth` strictement positif (dotation de bienvenue versée) |
| `GET /api/v1/lottery/status` | `guarantees.vrfCertified` vaut `true` |
| Achat de 2 tickets par Alice | Statut 201, hachage de transaction valide, reçu au statut 1 sur la chaîne, expéditeur égal au portefeuille d'Alice |
| Achat d'un ticket par Bob, puis cadeau d'un ticket de Bob à Alice | Statut 201 ; `recipientWallet` égal au portefeuille d'Alice |
| `ticketsOf(tour, Alice)` sur le contrat | 3 |
| Horloge du nœud avancée après `endTime` (`evm_increaseTime`, `evm_mine`), puis `runKeeperOnce()` | `draw-requested` |
| Synchronisations de l'indexeur jusqu'au statut `COMPLETED` en base | Gagnant parmi Alice et Bob ; `prizeWei` égal à 90 % de 4 tickets (commission de 10 %) |
| Synchronisations jusqu'à `prizeClaimedAt` | Date renseignée en base, `prizeClaimed` vrai dans le contrat : le job `CLAIM_PRIZE` a versé la cagnotte |
| `GET /api/v1/lottery/my-tickets` pour Alice | Au moins un badge POAP avec un `tokenId` positif : le job `MINT_BADGE` a frappé le badge |

Ce scénario traverse tous les composants de cette partie : [portefeuilles](portefeuilles.md), [passerelle](passerelle.md), [indexeur](indexeur.md), [keeper](keeper.md), [file d'actions](actions.md) et [métadonnées POAP](metadonnees-poap.md).

### Scénario 2 : disjoncteur

| Étape | Vérification |
|---|---|
| Création d'un compte `ADMIN` en base et d'un jeton de session | |
| `POST /api/v1/admin/circuit-breaker` avec `paused: true` | Statut 200, `paused()` vrai sur le contrat |
| Achat par un nouveau citoyen | Statut 503, `errors.circuitBreaker` à `true` (erreur `EnforcedPause` traduite) |
| `POST /api/v1/admin/circuit-breaker` avec `paused: false` | Statut 200, `paused()` faux sur le contrat |

### Fonctions utilitaires du test

- `login(label)` connecte un compte par l'API et renvoie le jeton et l'utilisateur.
- `waitFor(sonde, délai)` relance une sonde toutes les 500 ms jusqu'à obtenir une valeur, avec un délai de 60 s par défaut.
- Le worker `chain-actions` est démarré dans `beforeAll` par `startChainActionsWorker()`, et une première synchronisation de l'indexeur est faite. Le keeper et l'indexeur périodiques ne sont pas démarrés : le test les appelle explicitement, ce qui rend le déroulé déterministe.
- `afterAll` ferme le worker, la file, Redis, Prisma et le client RPC.

## Job CI chain

Le job `chain` de [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml), intitulé « Intégration backend sur une vraie blockchain locale », exécute cette suite.

| Propriété | Valeur |
|---|---|
| Déclenchement | Modification de `backend/**` ou `smart-contract/**` (ou du fichier de CI) |
| Dépendances | Jobs `changes`, `contracts` et `backend` ; ne tourne que si aucun n'a échoué |
| Délai maximal | 20 minutes |
| Services | `postgres:15-alpine` (base `blocklucky_chain`), `redis:7.4-alpine` |

Étapes :

1. construction de l'image Docker de `smart-contract/` et démarrage du conteneur `blocklucky-chain` sur le port 8545 ;
2. attente de l'état `healthy` du conteneur (le fichier `/tmp/blockchain-ready` est créé après le déploiement), 60 essais espacés de 3 s ;
3. `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` sur une base vierge ;
4. `npm run test:chain -- --ci` ;
5. en cas d'échec, affichage des journaux du nœud.

Le job dépend de `contracts`, qui vérifie entre autres que les ABI embarquées dans `backend/src/blockchain/abi/` sont à jour (`node scripts/export-abi.mjs --check`). Une ABI périmée ferait échouer les appels de la passerelle ou le décodage des événements ; elle est détectée avant le test d'intégration. La liste de tous les jobs est sur la page [Intégration continue](../infrastructure/ci.md).

## Ce qui n'est pas testé

- La bascule vers le RPC de secours, les confirmations (`CHAIN_CONFIRMATIONS` vaut 0 dans le test) et la reprise sur `NONCE_EXPIRED`.
- L'annulation d'un tour expiré par le keeper (`round-closed`) et les remboursements `CLAIM_REFUND`.
- La détection d'une chaîne réinitialisée.
- Le repli d'exécution directe de la file d'actions sans Redis.
- Un réseau public : aucun test automatique ne tourne sur Sepolia.
