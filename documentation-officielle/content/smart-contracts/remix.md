# Utiliser Remix

Remix est l'IDE Solidity dans le navigateur cité par le kickoff, à côté de Hardhat. Le projet ne l'utilise ni pour les tests ni pour les déploiements, qui passent par Hardhat (voir [Pourquoi Ethereum, Hardhat et Chainlink](choix.md#hardhat-3-plutot-que-remix-seul-ou-foundry)). Il reste le meilleur outil pour **montrer** le contrat en soutenance : compiler, déployer, acheter des tickets et tirer un gagnant en quelques clics, sans rien installer.

Les deux contrats compilent tels quels dans [Remix](https://remix.ethereum.org). Cette page décrit deux usages : une démonstration complète dans la machine virtuelle de Remix, et l'interaction avec un contrat déjà déployé sur Sepolia.

## Préparer les sources

### Option 1 : copier les fichiers

Créer dans l'espace de travail Remix un fichier `contracts/BlockLucky.sol` et y coller le contenu de [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) ; faire de même pour [`BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) si besoin.

Remix résout seul les imports `@openzeppelin/contracts/...` et `@chainlink/contracts/...` en téléchargeant les paquets npm. Il prend alors la version publiée au moment du chargement, qui peut différer des versions figées par le projet (OpenZeppelin 5.6.1, Chainlink 1.5.0).

### Option 2 : un fichier aplati aux versions du projet

Pour reproduire exactement le build du dépôt, générer un fichier unique qui embarque les dépendances installées par `npm ci`. Depuis `smart-contract/` :

```bash
npx hardhat flatten contracts/BlockLucky.sol > BlockLucky.flat.sol
```

Le fichier obtenu (environ 1 700 lignes) indique pour chaque section sa provenance, par exemple `npm/@chainlink/contracts@1.5.0/...`. Le coller dans Remix : il compile sans aucun import. Ce fichier est un produit de travail ; il n'a pas à être versionné.

## Compiler

Dans l'onglet « Solidity Compiler », reprendre les réglages de [`hardhat.config.ts`](src:smart-contract/hardhat.config.ts) :

| Réglage | Valeur |
|---|---|
| Compiler | 0.8.34 |
| EVM version | `prague` |
| Optimization | Activée, 200 runs |

Avec des réglages différents, le bytecode diffère : peu importe pour une démonstration, mais c'est bloquant pour vérifier un contrat déployé par Hardhat.

## Démonstration complète dans Remix VM

L'environnement « Remix VM » fournit une blockchain en mémoire et des comptes approvisionnés, comme le nœud Hardhat. Sans oracle Chainlink, on déploie le coordinateur simulé et on joue soi-même le rôle de l'oracle.

### 1. Déployer le coordinateur simulé

Créer un fichier `contracts/Mock.sol` (Remix signalera l'absence de licence SPDX par un simple avertissement) :

```solidity
pragma solidity ^0.8.28;

import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
```

Le compiler, puis déployer `VRFCoordinatorV2_5Mock` avec les mêmes arguments que [`deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) :

| Argument | Valeur |
|---|---|
| `_baseFee` | `100000000000000000` |
| `_gasPrice` | `1000000000` |
| `_weiPerUnitLink` | `4000000000000000` |

### 2. Créer et financer un abonnement

Sur le mock déployé :

1. appeler `createSubscription`, puis lire `subId` dans l'événement `SubscriptionCreated` des journaux de la transaction ;
2. appeler `fundSubscription` avec ce `subId` et `10000000000000000000000`.

### 3. Déployer BlockLucky

Choisir le contrat `BlockLucky` et renseigner le constructeur. Remix attend les structures sous forme de tableaux, dans l'ordre des champs :

| Argument | Exemple |
|---|---|
| `vrfCoordinator` | Adresse du mock |
| `admin` | Compte 1 de Remix |
| `treasury_` | Compte 2 de Remix |
| `initialRoundConfig` | `["10000000000000000", 5, 2, 3, 300, 1000]` |
| `initialVrfConfig` | `["0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", "<subId>", 500000, 1, false, 60]` |

La configuration du tour se lit ainsi : 0,01 ETH le ticket, 5 tickets au plus, 2 au minimum, 3 par participant, 5 minutes, 10 % de commission. Le plafond bas permet de remplir le tour en deux achats et de tirer sans attendre. Le compte qui déploie devient propriétaire `ConfirmedOwner` ; `admin` reçoit les trois rôles.

### 4. Autoriser le contrat auprès du coordinateur

Sur le mock, appeler `addConsumer` avec le `subId` et l'adresse de `BlockLucky`.

### 5. Acheter des tickets

Sur `BlockLucky` :

1. avec le compte 3, renseigner « Value » à 30 000 000 000 000 000 wei (0,03 ether), puis appeler `buyTickets(3)` ;
2. avec le compte 4, renseigner 0,02 ether et appeler `buyTickets(2)`.

Un montant inexact échoue avec `IncorrectPayment` : Remix affiche le nom de l'erreur et ses paramètres. `isDrawReady` renvoie maintenant `true`, puisque le tour est complet.

### 6. Tirer

1. Appeler `requestDraw` avec n'importe quel compte.
2. Lire `requestId` dans l'événement `DrawRequested`, ou dans `getRound(1)` (champ `vrfRequestId`).
3. Sur le mock, jouer l'oracle : `fulfillRandomWords(requestId, adresse de BlockLucky)`, ou `fulfillRandomWordsWithOverride(requestId, adresse, [4])` pour imposer le mot aléatoire 4, qui désigne le ticket d'index 4, donc le compte 4.
4. Sur `BlockLucky`, `getRound(1)` montre `status` 2 (`Completed`), le `winner`, le `winningTicket` et le `prize` (0,045 ether). `currentRoundId` vaut 2.

### 7. Retirer les fonds

- Avec le compte gagnant, `claimPrize(1)` verse 0,045 ether.
- Avec le compte 1 (`admin`, qui a `OPERATOR_ROLE`), `withdrawFees` verse 0,005 ether au compte 2.

Pour montrer l'annulation, acheter un seul ticket dans le tour 2, attendre 5 minutes, appeler `closeExpiredRound`, puis `claimRefund(2)` avec le compte acheteur.

> [!NOTE]
> Dans Remix VM, l'horodatage des blocs suit l'horloge réelle. Il faut donc vraiment attendre la fin de `duration` pour tester l'expiration, d'où la durée courte de cet exemple.

## Interagir avec le contrat déployé sur Sepolia

Une fois le contrat déployé par [`deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) :

1. dans « Deploy & Run Transactions », choisir l'environnement « Injected Provider - MetaMask », avec MetaMask sur le réseau Sepolia ;
2. compiler `BlockLucky.sol` avec les réglages du projet ;
3. coller l'adresse de `BlockLucky` dans le champ « At Address » et valider ;
4. les fonctions apparaissent : lectures gratuites, écritures signées par MetaMask.

Cette voie sert aux opérations ponctuelles (`setRoundConfig`, `grantRole`, `acceptOwnership`) quand on ne veut pas utiliser la console Hardhat. Sur Sepolia, l'administrateur étant un multisig, ces écritures passent plutôt par le Transaction Builder du Safe ou l'onglet « Write Contract » d'Etherscan. Les citoyens, eux, n'utilisent jamais Remix ni MetaMask : leurs transactions passent par leur portefeuille intégré (voir [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md)).

L'onglet « Write Contract » d'Etherscan offre le même service une fois le code vérifié, sans compilation.

## Limites de Remix pour ce projet

| Besoin | Remix | Hardhat dans le dépôt |
|---|---|---|
| Tests automatisés en CI | Non | 54 tests, `npm test` |
| Mesure de couverture | Non | `npm run test:coverage` |
| Adresses déterministes pour le backend | Non | `deploy-local.ts` |
| Oracle VRF qui répond seul | Non, appel manuel du mock | `local-vrf-responder.ts` |
| Secrets hors du navigateur | Non | Keystore chiffré |
| Vérification Etherscan scriptée | Extension à installer | `npx hardhat verify` |
