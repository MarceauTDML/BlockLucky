# BlockLucky - Smart contracts

Contrats Solidity `BlockLucky` (loterie par tours, tirage Chainlink VRF v2.5, cagnotte et remboursements en retrait) et `BlockLuckyPOAP` (badge de participation non transférable), avec Hardhat 3, OpenZeppelin 5 et Chainlink.

**Documentation : [docs.etherbay.tech](https://docs.etherbay.tech)**

- [Vue d'ensemble des smart contracts](https://docs.etherbay.tech/smart-contracts/index.html)
- [Cycle de vie d'un tour](https://docs.etherbay.tech/smart-contracts/cycle-tour.html)
- [Référence de BlockLucky](https://docs.etherbay.tech/smart-contracts/reference-blocklucky.html)
- [Tests, fuzzing et couverture](https://docs.etherbay.tech/smart-contracts/tests.html)
- [Blockchain locale](https://docs.etherbay.tech/smart-contracts/blockchain-locale.html)
- [Déploiement sur Sepolia](https://docs.etherbay.tech/smart-contracts/sepolia.html)

## Démarrer

```bash
npm ci
```

```bash
npm test
```

```bash
npm run test:coverage && npm run coverage:check
```

```bash
npm run deploy:local
```

## Déploiement sur Sepolia

Prérequis : un portefeuille de déploiement dédié (clé jetable, jamais réutilisée ailleurs), une URL RPC Sepolia (Alchemy, Infura ou un nœud public) et une clé API Etherscan.

### 1. Secrets dans le keystore Hardhat

```bash
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set ETHERSCAN_API_KEY
```

Les valeurs sont chiffrées par un mot de passe et ne sont jamais écrites dans le dépôt.

### 2. Fonds de test

- ETH Sepolia pour le déployeur (gaz et financement VRF, prévoir au moins 1 ETH) : [sepoliafaucet.com](https://sepoliafaucet.com), [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) ou [faucets.chain.link](https://faucets.chain.link/sepolia).
- LINK Sepolia pour Chainlink Automation (au moins 5 LINK) : [faucets.chain.link](https://faucets.chain.link/sepolia).
- ETH Sepolia pour le relayer backend (OPERATOR_ADDRESS) : il paie le gaz des tirages, achats, badges et versements.

### 3. Adresses des rôles

| Variable | Rôle | Obligatoire |
| --- | --- | --- |
| `MAIRIE_ADMIN_ADDRESS` | `DEFAULT_ADMIN_ROLE` sur les deux contrats (multisig de la Mairie) | oui |
| `MAIRIE_TREASURY_ADDRESS` | Trésorerie qui reçoit la commission | oui |
| `OPERATOR_ADDRESS` | Relayer backend : `OPERATOR_ROLE` et `MINTER_ROLE` | oui |
| `PAUSER_ADDRESS` | `PAUSER_ROLE` | non, opérateur par défaut |
| `VRF_OWNER_ADDRESS` | Propriétaire Chainlink du contrat (`setCoordinator`) | non, administrateur par défaut |
| `POAP_BASE_URI` | Base des métadonnées des badges | oui |
| `ALLOW_SHARED_ROLES` | `true` pour accepter administrateur = opérateur | non |

Le script refuse une adresse nulle ou un administrateur identique à l'opérateur. Le déployeur accorde les rôles puis renonce à `DEFAULT_ADMIN_ROLE`, `OPERATOR_ROLE`, `PAUSER_ROLE` et `MINTER_ROLE` : aucune clé chaude ne garde le pouvoir d'administration.

```powershell
$env:MAIRIE_ADMIN_ADDRESS="0x..."
$env:MAIRIE_TREASURY_ADDRESS="0x..."
$env:OPERATOR_ADDRESS="0x..."
$env:POAP_BASE_URI="https://api.etherbay.tech/api/v1/lottery/poap/"
```

### 4. Commandes, dans l'ordre

```bash
npm run vrf:sepolia
npm run deploy:sepolia
npm run automation:sepolia
npm run verify:sepolia
```

- `vrf:sepolia` crée un abonnement VRF v2.5 sur le coordinateur `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`, le finance en ETH natif (`VRF_FUND_ETH`, 0.5 par défaut) et l'enregistre dans `deployments/sepolia-vrf.json`. Relancé, il recharge le même abonnement (`VRF_NEW_SUBSCRIPTION=true` pour en créer un autre).
- `deploy:sepolia` déploie les deux contrats, ajoute la loterie comme consommateur VRF, active `nativePayment` si l'abonnement est financé en ETH (`VRF_NATIVE_PAYMENT` pour forcer), distribue les rôles, affiche le tableau des titulaires et écrit `deployments/sepolia.json`.
- `automation:sepolia` inscrit un upkeep à logique personnalisée auprès du registrar Automation v2.1 (`0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976`, LINK `0x779877A7B0D9E8603169DdbD7836e478b4624789`), avec `AUTOMATION_LINK_AMOUNT` LINK (5 par défaut) et 500 000 de gaz, puis ajoute l'identifiant de l'upkeep à `deployments/sepolia.json`. L'administrateur de l'upkeep est `MAIRIE_ADMIN_ADDRESS` (`AUTOMATION_ADMIN_ADDRESS` pour changer). Adresses surchargeables par `SEPOLIA_AUTOMATION_REGISTRAR` et `SEPOLIA_LINK_TOKEN`.
- `verify:sepolia` publie le code source des deux contrats sur Etherscan avec les arguments de constructeur enregistrés.

### 5. Action du multisig

La propriété Chainlink suit un transfert en deux temps : le déployeur appelle `transferOwnership(VRF_OWNER_ADDRESS)`, puis le multisig doit appeler `acceptOwnership()` sur le contrat BlockLucky (onglet Write Contract d'Etherscan ou Transaction Builder du Safe). Le script de déploiement rappelle cette action en fin d'exécution.

### 6. Brancher le backend sur Sepolia

Variables de `backend/.env`, à reprendre depuis `deployments/sepolia.json` :

```env
BLOCKCHAIN_MODE=onchain
RPC_URL=<URL RPC Sepolia>
CHAIN_ID=11155111
CHAIN_START_BLOCK=<deploymentBlock>
CHAIN_CONFIRMATIONS=2
EXPLORER_URL=https://sepolia.etherscan.io
LOTTERY_CONTRACT_ADDRESS=<contracts.lottery>
POAP_CONTRACT_ADDRESS=<contracts.poap>
RELAYER_PRIVATE_KEY=<clé privée de OPERATOR_ADDRESS>
```

Le reversement de commission depuis l'espace Mairie appelle `setTreasury`, réservé à `DEFAULT_ADMIN_ROLE`, lorsque l'adresse saisie diffère de la trésorerie en place. Sur Sepolia, saisir l'adresse `MAIRIE_TREASURY_ADDRESS` ; changer de trésorerie passe par le multisig.

En local, `deploy:local` sépare aussi administrateur (compte Hardhat n°2), trésorerie (n°1) et opérateur (clé du backend, n°0 par défaut). L'opérateur garde `DEFAULT_ADMIN_ROLE` pour `setTreasury`, sauf avec `LOCAL_STRICT_ROLES=true`.
