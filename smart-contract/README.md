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
