# Référence de BlockLucky

Cette page liste chaque fonction, événement et erreur de `BlockLucky`. Les tableaux sont générés à la construction de la documentation à partir de l'ABI embarquée par le backend, [`backend/src/blockchain/abi/BlockLucky.json`](src:backend/src/blockchain/abi/BlockLucky.json), et du source Solidity pour les modificateurs. Ils ne peuvent donc pas diverger du contrat compilé : la CI vérifie que l'ABI est à jour avec `node scripts/export-abi.mjs --check`.

Pour le fonctionnement d'ensemble, lire d'abord [Contrat BlockLucky](blocklucky.md) et [Cycle de vie d'un tour](cycle-tour.md).

## Lire les tableaux

- **Fonctions du contrat** : déclarées dans `BlockLucky.sol`, y compris les variables publiques, pour lesquelles Solidity génère un accesseur. La colonne « Modificateurs » reprend la signature Solidity (`payable`, `whenNotPaused`, `nonReentrant`, `onlyRole(...)`, `view`).
- **Fonctions héritées** : apportées par OpenZeppelin (`AccessControl`, `Pausable`) ou Chainlink (`VRFConsumerBaseV2Plus`, `ConfirmedOwner`).
- **Erreurs** : le contrat n'utilise que des erreurs personnalisées, moins coûteuses en gaz qu'une chaîne de caractères et décodables avec leurs paramètres.
- Les structures `RoundConfig`, `VrfConfig` et `Round` apparaissent dans l'ABI sous le type `tuple`. Leurs champs sont détaillés dans [Contrat BlockLucky](blocklucky.md#structures).

## Appeler le contrat avec ethers

Les exemples utilisent ethers v6, la version du backend et des scripts Hardhat. Ils s'exécutent par exemple dans un script Node en module ES, à la racine du dépôt.

### Connexion

En local, les adresses sont déterministes (voir [Blockchain locale](blockchain-locale.md)). Sur Sepolia, elles se lisent dans `smart-contract/deployments/sepolia.json` après le déploiement.

```typescript
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet, formatEther, parseEther } from "ethers";

const abi = JSON.parse(readFileSync("backend/src/blockchain/abi/BlockLucky.json", "utf8"));
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const lottery = new Contract("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", abi, provider);
```

Pour envoyer des transactions, il faut un signataire. Sur le nœud local, les comptes Hardhat de développement sont approvisionnés ; la clé se lit dans une variable d'environnement, jamais dans le code.

```typescript
const signer = new Wallet(process.env.PLAYER_PRIVATE_KEY!, provider);
const asPlayer = lottery.connect(signer) as Contract;
```

### Lire l'état d'un tour

```typescript
const roundId: bigint = await lottery.currentRoundId();
const round = await lottery.getRound(roundId);

console.log({
  status: Number(round.status),
  ticketPrice: formatEther(round.ticketPrice),
  sold: Number(round.ticketCount),
  max: Number(round.maxTickets),
  endsAt: new Date(Number(round.endTime) * 1000),
  drawReady: await lottery.isDrawReady(),
});
```

`round.status` vaut 0 (`Open`), 1 (`Drawing`), 2 (`Completed`) ou 3 (`Cancelled`). Les entiers sont renvoyés en `bigint`.

### Acheter et offrir des tickets

Le montant doit être exactement `ticketPrice * quantity`. Le plus sûr est de le calculer à partir du prix lu sur la chaîne, juste avant l'envoi.

```typescript
const { ticketPrice } = await lottery.getRound(await lottery.currentRoundId());
const quantity = 3n;

const tx = await asPlayer.buyTickets(quantity, { value: ticketPrice * quantity });
const receipt = await tx.wait();

const gift = await asPlayer.buyTicketsFor("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 2n, {
  value: ticketPrice * 2n,
});
await gift.wait();
```

C'est ce que fait la [passerelle du contrat](../integration-blockchain/passerelle.md) du backend, avec le portefeuille intégré du citoyen comme signataire.

### Lire les événements d'une transaction

```typescript
for (const log of receipt!.logs) {
  const parsed = lottery.interface.parseLog(log);
  if (parsed?.name === "TicketsPurchased") {
    const { roundId, player, payer, quantity, firstTicketIndex, totalTickets } = parsed.args;
    console.log(roundId, player, payer, quantity, firstTicketIndex, totalTickets);
  }
}
```

### Décoder une erreur

Un revert renvoie le sélecteur de l'erreur suivi de ses paramètres. `interface.parseError` le décode.

```typescript
try {
  await asPlayer.buyTickets(1n, { value: parseEther("0.5") });
} catch (error) {
  const data = (error as { data?: string }).data;
  const decoded = data ? lottery.interface.parseError(data) : null;
  console.log(decoded?.name, decoded?.args);
}
```

Ici, `decoded.name` vaut `IncorrectPayment` et `decoded.args` contient le montant attendu puis le montant reçu. Le backend applique la même logique dans `decodeContractError` de [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts), puis traduit chaque erreur en message HTTP dans [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts).

### Suivre les événements en continu

```typescript
await lottery.on("WinnerPicked", (roundId, winner, winningTicket, prize, fee) => {
  console.log(`Tour ${roundId} : ticket ${winningTicket} gagné par ${winner}, ${formatEther(prize)} ETH`);
});
```

Pour une projection fiable en base, préférer une lecture par blocs avec curseur persistant, comme l'[indexeur](../integration-blockchain/indexeur.md) : un abonnement `on` ne rattrape pas les événements manqués pendant une coupure.

### Retirer une cagnotte ou un remboursement

```typescript
const winnerTx = await asPlayer.claimPrize(1n);
await winnerTx.wait();

const refundTx = await asPlayer.claimRefund(2n);
await refundTx.wait();
```

### Simuler avant d'envoyer

`staticCall` exécute la fonction sans transaction et renvoie l'erreur éventuelle, sans frais. Il est utile avant un `requestDraw` ou un `retryDraw` pour savoir si la condition est remplie.

```typescript
const requestId: bigint = await lottery.requestDraw.staticCall();
```

### Depuis la console Hardhat

Les opérations ponctuelles d'exploitation se font aussi dans la console Hardhat, qui fournit ethers et les comptes configurés du réseau :

```bash
npx hardhat console --network localhost
```

```javascript
const { ethers } = await network.create();
const lottery = await ethers.getContractAt("BlockLucky", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
await lottery.currentRoundId();
```

Voir [Exploitation du contrat](exploitation.md) pour les opérations réservées aux rôles.

## Table générée

{{generated:contrat-blocklucky}}
