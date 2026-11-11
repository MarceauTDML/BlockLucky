# Référence de BlockLuckyPOAP

Cette page liste chaque fonction, événement et erreur de `BlockLuckyPOAP`, le badge de participation non transférable. Les tableaux sont générés depuis l'ABI embarquée par le backend, [`backend/src/blockchain/abi/BlockLuckyPOAP.json`](src:backend/src/blockchain/abi/BlockLuckyPOAP.json), et depuis le source Solidity. Le fonctionnement est expliqué dans [Badge POAP](poap.md).

## Lire les tableaux

- Le contrat ne déclare que quatre fonctions (`mintBadge`, `setBaseUri`, `tokenURI`, `supportsInterface`) et quatre variables publiques (`MINTER_ROLE`, `totalMinted`, `roundOfToken`, `badgeOf`). Tout le reste vient d'`ERC721` et d'`AccessControl` d'OpenZeppelin 5.6.1.
- Les fonctions de transfert héritées (`transferFrom`, `safeTransferFrom`) figurent dans l'ABI mais échouent toujours, à cause de la surcharge de `_update`.
- L'événement `Transfer` n'est émis qu'à la frappe, avec `from` égal à l'adresse nulle.

## Appeler le contrat avec ethers

Les exemples utilisent ethers v6 et l'adresse locale déterministe `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` (voir [Blockchain locale](blockchain-locale.md)).

### Lire les badges d'un citoyen

```typescript
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider } from "ethers";

const abi = JSON.parse(readFileSync("backend/src/blockchain/abi/BlockLuckyPOAP.json", "utf8"));
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const poap = new Contract("0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", abi, provider);

const citizen = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const count: bigint = await poap.balanceOf(citizen);
const tokenId: bigint = await poap.badgeOf(1n, citizen);

if (tokenId !== 0n) {
  console.log(await poap.ownerOf(tokenId), await poap.roundOfToken(tokenId), await poap.tokenURI(tokenId));
}
```

`badgeOf` renvoie 0 quand le citoyen n'a pas de badge pour ce tour : les identifiants commencent à 1.

### Lister tous les badges frappés

Le contrat n'implémente pas l'extension `ERC721Enumerable`. Pour lister les badges, on parcourt les identifiants de 1 à `totalMinted`, ou on lit les événements `BadgeMinted` :

```typescript
const events = await poap.queryFilter(poap.filters.BadgeMinted(), 0, "latest");
for (const event of events) {
  const { tokenId, roundId, participant } = (event as unknown as { args: { tokenId: bigint; roundId: bigint; participant: string } }).args;
  console.log(tokenId, roundId, participant);
}
```

Les trois paramètres de `BadgeMinted` sont indexés : `poap.filters.BadgeMinted(null, 3n)` ne renvoie que les badges du tour 3, `poap.filters.BadgeMinted(null, null, citizen)` que ceux d'un citoyen.

### Frapper un badge

Réservé à `MINTER_ROLE`. Dans le projet, seule la [file d'actions on-chain](../integration-blockchain/actions.md) le fait, avec le compte opérateur.

```typescript
import { Wallet } from "ethers";

const minter = new Wallet(process.env.OPERATOR_PRIVATE_KEY!, provider);
const tx = await (poap.connect(minter) as Contract).mintBadge(citizen, 1n);
await tx.wait();
```

Un second appel identique échoue avec `BadgeAlreadyMinted(1, citizen)`.

### Vérifier les rôles

```typescript
const MINTER_ROLE: string = await poap.MINTER_ROLE();
console.log(await poap.hasRole(MINTER_ROLE, minter.address));
```

## Table générée

{{generated:contrat-poap}}
