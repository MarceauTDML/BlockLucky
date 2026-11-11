# Runbooks blockchain

Procédures pour les incidents qui touchent la chaîne, le contrat `BlockLucky` et le compte opérateur du backend. Chaque procédure donne les symptômes, le diagnostic et la résolution. Les incidents purement applicatifs sont dans [Runbooks](runbooks.md).

Rappel des acteurs, détaillés dans [Intégration blockchain du backend](../integration-blockchain/index.md) :

| Acteur | Où il tourne | Rôle |
| --- | --- | --- |
| Indexeur | processus `worker` | lit les événements du contrat toutes les 3 s et met à jour PostgreSQL |
| Keeper | processus `worker` | demande le tirage ou clôt un tour expiré, toutes les 10 s |
| File `chain-actions` | processus `worker` | verse la cagnotte, rembourse, émet les badges POAP |
| Compte opérateur | clé `RELAYER_PRIVATE_KEY` | signe le keeper, les badges, la dotation de bienvenue, le disjoncteur |
| Oracle VRF local | conteneur `blockchain` | répond aux demandes d'aléa du coordinateur simulé |

## Outils de diagnostic

### Appels JSON-RPC

Le nœud Hardhat est publié sur `127.0.0.1:8545`. Sur Sepolia, remplacer l'URL par celle du fournisseur RPC.

```bash
curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' http://127.0.0.1:8545
```

La réponse est en hexadécimal : `"result":"0x2a"` signifie bloc 42.

### Lire l'état du tour

L'image `blockchain` contient `ethers` et les artefacts compilés des contrats. Ce script lit le tour courant, sans rien signer :

```bash
docker compose exec blockchain node --input-type=module -e '
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider } from "ethers";
const { abi } = JSON.parse(readFileSync("artifacts/contracts/BlockLucky.sol/BlockLucky.json", "utf8"));
const lottery = new Contract("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", abi, new JsonRpcProvider("http://127.0.0.1:8545"));
const id = await lottery.currentRoundId();
const r = await lottery.getRound(id);
console.log({
  round: id.toString(),
  status: ["Open", "Drawing", "Completed", "Cancelled"][Number(r.status)],
  tickets: Number(r.ticketCount),
  endTime: new Date(Number(r.endTime) * 1000).toISOString(),
  drawRequestedAt: new Date(Number(r.drawRequestedAt) * 1000).toISOString(),
  vrfRequestId: r.vrfRequestId.toString(),
  paused: await lottery.paused(),
  drawReady: await lottery.isDrawReady()
});
'
```

### Curseur d'indexation

```bash
docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -c 'SELECT "id", "lastBlock", "updatedAt" FROM "ChainCursor";'
```

`lastBlock` est le dernier bloc traité. En fonctionnement normal, il suit la tête de chaîne à `CHAIN_CONFIRMATIONS` blocs près.

### Adresse du compte opérateur

Au démarrage, le service `blockchain` journalise l'adresse qu'il a habilitée :

```bash
docker compose logs blockchain | grep "Opérateur backend"
```

## Chaîne locale réinitialisée

Le nœud Hardhat garde tout en mémoire. Un redémarrage du conteneur `blockchain` (redémarrage de la VM ou de Docker, `docker compose restart blockchain`, crash suivi de `restart: unless-stopped`) recrée une chaîne vierge, redéploie les contrats aux mêmes adresses et repart du bloc 0. PostgreSQL, lui, garde les tours, les tickets, le curseur et les hachages de dotation de l'ancienne chaîne.

### Symptômes

- Dans les journaux du worker, une fois, au niveau `error` : `Le curseur d'indexation (bloc N) dépasse la tête de chaîne (bloc M). La chaîne a été réinitialisée : réinitialisez aussi la base de données.` Le message n'est répété qu'après un retour à la normale.
- Les citoyens existants ne peuvent plus acheter : l'API répond 402 « Solde d'ethers fictifs insuffisant », car leur portefeuille est vide sur la nouvelle chaîne et la dotation de bienvenue est considérée comme déjà versée (`welcomeGrantTxHash` renseigné).
- Les achats qui passent n'attribuent pas d'EtherPoints : les numéros de ticket 0, 1, 2… du tour 1 existent déjà en base pour l'ancienne chaîne, l'indexeur les croit déjà traités.
- Le tour affiché ne correspond plus au contrat (ancien tour clos ou cagnotte d'un autre état).

### Diagnostic

1. Comparer `eth_blockNumber` à `lastBlock` du curseur : un curseur supérieur à la tête confirme la réinitialisation.
2. Vérifier la date de démarrage du conteneur :

   ```bash
   docker compose ps blockchain
   ```

### Résolution

**Option A, démonstration sans données à garder.** Tout repartir de zéro, y compris les comptes :

```bash
docker compose --profile app down -v
```

```bash
docker compose --profile app up -d --build --wait
```

Puis recharger les données de démonstration si besoin (voir [Seed](../base-de-donnees/seed.md)).

**Option B, garder les comptes.** Effacer seulement ce qui vient de l'ancienne chaîne. Les clés des portefeuilles intégrés restent valables : seules les données on-chain ont disparu.

1. Arrêter l'API et le worker :

   ```bash
   docker compose --profile app stop backend worker
   ```

2. Sauvegarder la base (voir [Sauvegardes et reprise](sauvegardes.md)).
3. Effacer les tickets, les tours et le curseur, et autoriser une nouvelle dotation de bienvenue :

   ```bash
   docker compose exec postgres psql -U etherbay_admin -d blocklucky_db -v ON_ERROR_STOP=1 -c 'BEGIN; DELETE FROM "Ticket"; DELETE FROM "LotteryRound"; DELETE FROM "ChainCursor"; UPDATE "User" SET "welcomeGrantTxHash" = NULL; COMMIT;'
   ```

4. Vider la file `chain-actions`. Ses identifiants de job (`MINT_BADGE-1-0x…`) reprendraient ceux de l'ancienne chaîne, et BullMQ ignorerait les nouvelles demandes tant que les anciens jobs sont conservés :

   ```bash
   docker compose exec redis sh -c "redis-cli --scan --pattern 'bull:chain-actions:*' | xargs -r redis-cli DEL"
   ```

5. Redémarrer :

   ```bash
   docker compose --profile app start backend worker
   ```

L'indexeur repart de `CHAIN_START_BLOCK` (0 en local) et reconstruit les tours. Chaque citoyen reçoit une nouvelle dotation à son prochain achat. Les EtherPoints déjà gagnés et l'historique `PointTransaction` sont conservés. La reconstruction est détaillée dans [Reconstruire depuis la chaîne](../base-de-donnees/reconstruction.md).

### Prévention

Ne jamais redémarrer le conteneur `blockchain` pendant une démonstration. Sur la VM, un redémarrage de la machine (mise à jour du noyau par exemple) suffit à déclencher l'incident : prévoir l'option B avant la soutenance.

## Oracle VRF muet

Le tirage est demandé (`requestDraw`), le tour passe en `Drawing` (en base : `LOCKED`), mais aucun aléa n'arrive. Le tour reste bloqué et les achats sont refusés en 409 « Le tirage de ce tour est en cours ».

### Causes

| Environnement | Cause probable |
| --- | --- |
| Local | l'oracle de [`local-vrf-responder.ts`](src:smart-contract/scripts/local-vrf-responder.ts) a échoué sur cette requête. Il marque la requête comme traitée avant d'envoyer la réponse : si `fulfillRandomWords` échoue (abonnement simulé épuisé par exemple), il ne la retente jamais |
| Local | le processus de l'oracle s'est arrêté dans le conteneur, alors que le nœud tourne toujours |
| Sepolia | abonnement VRF sans fonds (voir plus bas), consommateur non enregistré, ou réseau Chainlink lent |

### Diagnostic

1. État du tour avec le script de lecture : `status: "Drawing"` et `drawRequestedAt` ancien.
2. Journaux de l'oracle local :

   ```bash
   docker compose logs blockchain --since 1h | grep -E "Oracle VRF|Aléa fourni"
   ```

   Une ligne `Oracle VRF local : …` signale une réponse en échec. L'absence totale de ligne `Aléa fourni` depuis la demande signale un oracle arrêté.
3. Sur Sepolia, consulter la requête et le solde de l'abonnement sur `vrf.chain.link`.

### Résolution : retryDraw

La fonction `retryDraw()` du contrat abandonne la requête en cours et en émet une nouvelle. Elle exige le rôle `OPERATOR_ROLE` et n'est acceptée que si le tour est en `Drawing` depuis au moins `drawTimeout` : 10 minutes en local, 24 heures sur Sepolia (paramètres de [`deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) et [`deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts)). Avant ce délai, elle échoue avec `DrawNotStale`. La réponse tardive à l'ancienne requête est ensuite ignorée par le contrat.

Le backend n'appelle jamais `retryDraw` : il faut le faire à la main. En local, le compte Hardhat n° 0 (Mairie) possède `OPERATOR_ROLE` et le nœud l'expose déverrouillé :

```bash
docker compose exec blockchain node --input-type=module -e '
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider } from "ethers";
const { abi } = JSON.parse(readFileSync("artifacts/contracts/BlockLucky.sol/BlockLucky.json", "utf8"));
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const lottery = new Contract("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", abi, await provider.getSigner(0));
const tx = await lottery.retryDraw();
await tx.wait();
console.log(tx.hash);
'
```

Sur Sepolia, lancer le même script depuis `smart-contract/` sur un poste, après `npm run build`, avec le RPC Sepolia, l'adresse du contrat déployé et un `Wallet` construit sur la clé d'un compte qui détient `OPERATOR_ROLE`. Saisir la clé dans une variable d'environnement, jamais dans la commande, pour qu'elle n'entre pas dans l'historique du shell.

La nouvelle requête produit un événement `DrawRequested`, que l'indexeur enregistre (nouvel identifiant `chainlinkRequestId`). Si l'oracle local s'était arrêté, il ne reprendra pas seul : seul un redémarrage du conteneur le relance, au prix d'une réinitialisation de la chaîne. Dans ce cas, choisir directement la [procédure de chaîne réinitialisée](#chaine-locale-reinitialisee).

### Alternative : annuler le tour

Un administrateur peut annuler le tour par `POST /api/lottery/refund`, qui appelle `cancelRound()`. Les participants sont alors remboursés par la file `chain-actions`. C'est la solution si le tirage ne peut pas aboutir.

## Abonnement VRF vide

Chaque réponse VRF est payée par l'abonnement Chainlink auquel le contrat est rattaché.

### Symptômes

- Local : l'oracle journalise `Oracle VRF local : …` avec une erreur de solde, et le tour reste en `Drawing`. Le déploiement local crédite pourtant l'abonnement simulé de 10 000 unités : l'épuisement est très improbable.
- Sepolia : la requête reste en attente dans le gestionnaire d'abonnements, le tour reste en `Drawing`.

### Diagnostic

Sur Sepolia, consulter le solde LINK et ETH de l'abonnement sur `vrf.chain.link`. Le script de déploiement Sepolia refuse de déployer si l'abonnement n'est pas financé, mais le solde peut s'épuiser ensuite. Le mode de paiement (`nativePayment`) est fixé au déploiement : ETH si l'abonnement n'avait pas de LINK, LINK sinon.

En local, l'identifiant de l'abonnement simulé est dans le fichier de déploiement du conteneur :

```bash
docker compose exec blockchain cat deployments/localhost.json
```

### Résolution

1. Financer l'abonnement : sur Sepolia, depuis `vrf.chain.link` avec du LINK ou de l'ETH de test, dans la monnaie de `nativePayment` ; en local, appeler `fundSubscription(subId, montant)` sur le coordinateur simulé, comme le fait `deploy-local.ts`.
2. Sur Sepolia, Chainlink traite en général la requête en attente une fois l'abonnement financé. En local, l'oracle ne retente jamais une requête échouée.
3. Si le tour est toujours en `Drawing` après `drawTimeout`, appliquer [retryDraw](#resolution-retrydraw).

## Opérateur à court d'ETH

Le compte opérateur paie le gas de toutes les transactions du backend et finance la dotation de bienvenue de chaque nouveau portefeuille (`WELCOME_GRANT_WEI`, 0,1 ETH par défaut). En local, `deploy-local.ts` lui verse 1 000 ethers fictifs, soit environ 10 000 dotations. Sur Sepolia, il dépend des robinets.

### Symptômes

- Journaux de l'API : `Dotation de bienvenue impossible pour le compte …` avec une raison `insufficient funds`. Le nouveau citoyen ne reçoit rien et son premier achat échoue en 402.
- Journaux du worker : `Automate du tirage : …` avec une erreur de fonds, et le tirage n'est plus demandé à l'échéance.
- Jobs `MINT_BADGE` en échec dans `chain-actions`.
- Actions Mairie (disjoncteur, tirage manuel, annulation) en échec. Le message renvoyé parle à tort du « portefeuille BlockLucky » du citoyen, car le code d'erreur `INSUFFICIENT_FUNDS` est traduit sans distinguer le signataire.

### Diagnostic

Solde de l'opérateur, en wei et en hexadécimal :

```bash
curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0xADRESSE_OPERATEUR","latest"]}' http://127.0.0.1:8545
```

### Résolution

En local, le nœud Hardhat accepte la méthode `hardhat_setBalance`. Cette commande fixe le solde à 1 000 ethers (`0x3635C9ADC5DEA00000` wei) :

```bash
curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"hardhat_setBalance","params":["0xADRESSE_OPERATEUR","0x3635C9ADC5DEA00000"]}' http://127.0.0.1:8545
```

Sur Sepolia, envoyer de l'ETH de test à l'adresse de l'opérateur depuis un robinet ou un autre compte, et réduire `WELCOME_GRANT_WEI` (ou le mettre à `0` pour supprimer la dotation). Les dotations manquées sont rattrapées automatiquement : `prepareWallet` retente la dotation tant que `welcomeGrantTxHash` est vide.

## Nonce bloqué

Chaque transaction d'un compte porte un numéro d'ordre, le nonce. Le backend signe avec un `NonceManager` d'ethers ([`chain.client.ts`](src:backend/src/blockchain/chain.client.ts)) qui incrémente le nonce en mémoire. Dans la stack Docker, l'API et le worker sont deux processus qui signent avec la même clé opérateur, chacun avec son propre compteur : ils peuvent se désynchroniser.

### Symptômes

- Erreurs `nonce too low`, `nonce has already been used`, `NONCE_EXPIRED` ou `replacement transaction underpriced` dans les journaux de l'API ou du worker.
- Sur Sepolia, transaction de l'opérateur en attente depuis longtemps sur l'explorateur, toutes les suivantes bloquées derrière elle.

L'API retente déjà une fois une transaction refusée pour `NONCE_EXPIRED` après avoir remis son compteur à zéro (`resetOperatorNonce` dans `sendAndIndex` de [`lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts)). Le keeper, la dotation et les actions de la file ne le font pas.

### Diagnostic

Comparer le nombre de transactions confirmées et en attente de l'opérateur :

```bash
curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionCount","params":["0xADRESSE_OPERATEUR","latest"]}' http://127.0.0.1:8545
```

```bash
curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionCount","params":["0xADRESSE_OPERATEUR","pending"]}' http://127.0.0.1:8545
```

### Résolution

- **Les deux valeurs sont égales** : aucune transaction n'est en attente, seul un compteur en mémoire est faux. Redémarrer les processus, qui relisent le nonce sur la chaîne :

  ```bash
  docker compose --profile app restart backend worker
  ```

- **`pending` est supérieur à `latest`** (Sepolia) : une transaction attend, souvent faute de frais suffisants. Attendre qu'elle passe, ou la remplacer en envoyant depuis l'opérateur une transaction de 0 ETH vers lui-même avec le même nonce (la valeur `latest`) et des frais plus élevés. Redémarrer ensuite l'API et le worker.

En local, le nœud Hardhat mine chaque transaction immédiatement : `pending` et `latest` sont presque toujours égaux.

## Pause d'urgence

Le disjoncteur met le contrat en pause (`Pausable` d'OpenZeppelin). À utiliser devant une faille suspectée, une anomalie dans les achats ou un comportement inexpliqué du tirage. Le parcours fonctionnel est décrit dans [Disjoncteur](../architecture/flux/disjoncteur.md).

### Effet de la pause

| Bloqué | Toujours possible |
| --- | --- |
| `buyTickets`, `buyTicketsFor` | `claimPrize` : un gagnant peut retirer sa cagnotte |
| `requestDraw` : ni le keeper, ni un administrateur ne lancent de tirage | `claimRefund` : un participant d'un tour annulé est remboursé |
| | `cancelRound`, `closeExpiredRound`, `retryDraw` |
| | la réponse VRF d'un tirage déjà demandé, qui désigne le gagnant |

Le keeper ne fait rien tant que le contrat est en pause, et `checkUpkeep` renvoie `false`. Les achats échouent côté API avec un 503 et le détail `circuitBreaker: true`.

### Déclencher

Depuis le tableau de bord Mairie du frontend web, ou par l'API avec un jeton d'administrateur (rôle `ADMIN`, double authentification exigée en production) :

```bash
curl -s -X POST https://api.etherbay.tech/api/admin/circuit-breaker -H "Authorization: Bearer $ADMIN_JWT" -H "content-type: application/json" -d '{"paused": true, "reason": "Anomalie constatée sur les achats"}'
```

Le backend appelle `pause()` avec le compte opérateur, qui détient `PAUSER_ROLE`, et écrit une entrée `CIRCUIT_BREAKER_PAUSE` dans le journal d'administration avec le motif et le hachage de la transaction. Le motif est facultatif mais, s'il est fourni, doit faire au moins 5 caractères.

Si le backend est indisponible, appeler `pause()` directement sur le contrat avec un compte qui détient `PAUSER_ROLE` (l'administrateur Mairie ou l'opérateur), sur le modèle du script `retryDraw`.

### Vérifier et reprendre

```bash
curl -s https://api.etherbay.tech/health
```

Le champ `network.isPaused` doit valoir `true`. Attention : si le RPC ne répond pas, ce champ vaut `false` par défaut. Pour reprendre, envoyer la même requête avec `"paused": false` ; l'entrée d'audit est `CIRCUIT_BREAKER_RESUME`.

Après une pause, documenter l'incident (voir [Réponse aux incidents](incidents.md)).

## RPC principal en panne

Le backend joint la chaîne par `RPC_URL`, avec un délai de 15 secondes par appel. Une seconde adresse, `FALLBACK_RPC_URL`, existe dans la configuration.

### Symptômes

- Worker : `Indexation blockchain interrompue : …` à chaque passage, toutes les 3 secondes ; `Automate du tirage : …`.
- API : achats en 503 « Réseau blockchain injoignable. Veuillez réessayer dans un instant. » (codes ethers `NETWORK_ERROR`, `TIMEOUT` ou `SERVER_ERROR`).
- `/health/deep` ne détecte pas la panne : sa section `blockchain` rapporte la configuration et l'état du disjoncteur, sans interroger la tête de chaîne.

### Diagnostic

Appeler `eth_blockNumber` sur l'URL configurée, depuis l'hôte ou depuis le conteneur de l'API. En local, l'URL est `http://blockchain:8545` à l'intérieur du réseau Compose : vérifier d'abord `docker compose ps blockchain`. Un conteneur arrêté puis relancé implique la [procédure de chaîne réinitialisée](#chaine-locale-reinitialisee).

### Résolution

> [!WARNING]
> En mode `onchain`, la bascule de secours n'est pas automatique et ne peut pas être déclenchée à chaud. Le seul déclencheur prévu, l'événement `RPC_FALLBACK_SWITCH` du webhook `POST /api/webhooks/blockchain`, est refusé avec un 409 dès que `BLOCKCHAIN_MODE=onchain`. Il ne fonctionne qu'en mode simulé, et seulement pour le processus qui reçoit l'appel.

La bascule se fait donc par configuration :

1. Choisir un second fournisseur RPC **du même réseau** que `CHAIN_ID`. Les fournisseurs sont créés avec `staticNetwork` : le backend ne vérifie pas le réseau réel et lirait sans erreur une autre chaîne. La valeur par défaut de `FALLBACK_RPC_URL` est un RPC public Sepolia, inutilisable avec la chaîne locale 31337.
2. Remplacer `RPC_URL` dans la configuration (`x-backend-env` ou la surcharge) par cette adresse.
3. Recréer l'API et le worker :

   ```bash
   docker compose --profile app up -d backend worker
   ```

4. Vérifier que le message `Indexation blockchain interrompue` disparaît des journaux du worker. L'indexeur reprend depuis son curseur : aucun événement n'est perdu pendant la panne, il est seulement traité en retard.

Revenir au RPC principal de la même façon une fois rétabli.
