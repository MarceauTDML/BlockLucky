# 0004 Smart contract Solidity sur Ethereum, tirage Chainlink VRF et portefeuille intégré

- Statut : accepté
- Date : 2026-11-11

## Contexte

Le kickoff demande de « créer un smart contract pour une loterie simple » : des tickets achetés en ethers fictifs, un gagnant tiré au hasard après un nombre de participants ou une durée, qui remporte la cagnotte. Le critère de sélection est un « smart contract solide et sécurisé ». Les outils indiqués sont Solidity, Hardhat et Remix.

La première version du backend simulait la blockchain : les hash de transaction étaient générés, le hasard venait de `crypto.randomInt` et la cagnotte n'était jamais versée. Ce n'était ni vérifiable ni conforme au brief.

Le public cible a entre 18 et 35 ans. La Mairie veut un événement inclusif : demander à chaque citoyen d'installer MetaMask et d'acheter de l'ether exclurait une grande partie des 10 000 participants visés.

## Décision

**Contrats** (`smart-contract/`, Hardhat 3, Solidity 0.8.34, OpenZeppelin 5.6.1) :

- `BlockLucky.sol` gère des tours successifs : Open, Drawing, puis Completed ou Cancelled.
  - Un tour se tire dès qu'il est complet, ou dès que sa durée est écoulée avec au moins `minTicketsToDraw` tickets.
  - Un tour expiré sans assez de tickets est annulé et chaque mise devient remboursable.
- La cagnotte (mises moins la commission de la Mairie, 10 % par défaut, plafonnée à 20 % par le contrat) est versée en retrait (pull payment, `claimPrize`). Les remboursements suivent le même principe (`claimRefund`).
- Mesures de sécurité :
  - pattern checks-effects-interactions et `ReentrancyGuard` ;
  - rôles `AccessControl` (administrateur, opérateur, pause) ;
  - disjoncteur `Pausable` ;
  - erreurs personnalisées ;
  - aucune fonction `receive`.
- Le hasard vient de Chainlink VRF v2.5 :
  - le contrat consomme un mot aléatoire prouvé ;
  - `requestDraw` est appelable par tous dès que les conditions sont remplies, et Chainlink Automation est compatible (`checkUpkeep` / `performUpkeep`) ;
  - `retryDraw` relance une requête restée sans réponse au-delà de `drawTimeout`.
- `BlockLuckyPOAP.sol` est un ERC-721 non transférable : un badge par participant et par tour, frappé par l'opérateur.

**Réseaux** :

- En local : nœud Hardhat dans Docker (`blockchain` dans `docker-compose.yml`), avec le coordinateur `VRFCoordinatorV2_5Mock` et un oracle local qui répond aux requêtes.
- En démonstration publique : Sepolia, avec le vrai coordinateur VRF. Le script `deploy-sepolia.ts` vérifie le réseau, la key hash et le financement de l'abonnement.

**Portefeuille intégré (option A)** :

- Le backend crée un vrai portefeuille Ethereum par citoyen. Sa clé privée est chiffrée en AES-256-GCM avec `ENCRYPTION_KEY` et n'est jamais renvoyée au client.
- À la première utilisation, la Mairie (compte opérateur) verse une dotation de bienvenue en ethers fictifs (`WELCOME_GRANT_WEI`).
- L'achat, le cadeau et le retrait de cagnotte sont signés par le portefeuille du citoyen, qui paie aussi les frais de réseau.

**Backend** :

- `BLOCKCHAIN_MODE=onchain` est imposé en production ; `simulated` reste réservé aux tests unitaires et au développement sans nœud.
- La base de données est une projection de la chaîne :
  - un indexeur lit les événements du contrat à partir d'un curseur persistant (`ChainCursor`) et reste idempotent sur `(lotteryId, ticketIndex)` ;
  - un keeper protégé par un verrou Redis demande le tirage ou clôt les tours expirés ;
  - une file BullMQ `chain-actions` frappe les POAP et réclame la cagnotte ou les remboursements pour le compte des citoyens.
- Les événements temps réel émis par le worker sont relayés vers Socket.io par Redis pub/sub.

## Alternatives écartées

- **MetaMask obligatoire pour chaque citoyen** : contraire à l'objectif d'inclusion et au parcours en un clic.
- **Transactions sponsorisées (ERC-4337, paymaster)** : plus complexe à opérer et à expliquer en soutenance, pour un gain nul sur un testnet.
- **Hasard tiré de `block.prevrandao` ou d'un hash de bloc** : manipulable par le producteur de bloc et non prouvable.
- **Remix seul** : utile pour la démonstration, mais il ne permet ni tests automatisés en CI, ni couverture, ni déploiement scripté reproductible. Le contrat compile tel quel dans Remix avec les imports npm.

## Conséquences

- La Mairie détient les clés des portefeuilles citoyens : le modèle est custodial. C'est acceptable avec des ethers fictifs sur un testnet. Sur un réseau principal, il faudrait une autorisation de prestataire de services sur crypto-actifs (règlement MiCA) ou un modèle non custodial (voir la [veille juridique](../../juridique/veille-juridique.md)).
- Chaque achat coûte des frais de réseau au citoyen. La dotation de bienvenue doit les couvrir : 0,5 ETH fictif par défaut, pour un ticket à 0,01 ETH.
- Le compte opérateur (`RELAYER_PRIVATE_KEY`) est critique :
  - il porte les rôles opérateur, pause et frappe des POAP ;
  - il finance les dotations de bienvenue ;
  - il doit être distinct de l'administrateur et approvisionné en ETH Sepolia.
- Après une réinitialisation de la chaîne locale, la base doit aussi être réinitialisée : l'indexeur détecte un curseur en avance sur la tête de chaîne et le journalise en erreur.
- Contrôles automatisés en CI :
  - solhint sans avertissement ;
  - 47 tests (dont 4 tests de fuzzing de 256 exécutions) et 100 % des lignes des contrats couvertes ;
  - Slither bloquant dès le niveau Medium, les constats acceptés étant consignés dans `smart-contract/slither.db.json` ;
  - ABI du backend à jour ;
  - test d'intégration complet du backend sur un nœud réel.
- `npm audit` est bloquant au niveau critique, et non haut, pour `smart-contract/`. Les alertes hautes proviennent des dépendances transitives de `@chainlink/contracts` : sources Solidity d'OpenZeppelin 4.x non importées et outillage JavaScript (ethers v5, ws, tmp). Aucune n'est incluse dans le bytecode déployé ni exécutée par le backend.
- L'image Docker de la chaîne locale sert au développement et à la CI ; elle n'est jamais déployée. Elle n'est donc pas soumise au contrôle Trivy des images de production.

## Vérification dans le code

Cette section confronte la décision au dépôt actuel. Elle ne modifie pas la décision.

### Contrats

| Élément de la décision | Constat | Où |
|---|---|---|
| Versions | Compilateur `0.8.34`, EVM `prague` ; sources en `pragma solidity ^0.8.28` ; `@openzeppelin/contracts` déclaré `^5.6.1`, installé en 5.6.1 ; `@chainlink/contracts` 1.5.0 ; Hardhat 3.21.2 | [`smart-contract/hardhat.config.ts`](src:smart-contract/hardhat.config.ts), [`smart-contract/package.json`](src:smart-contract/package.json) |
| États d'un tour | `enum RoundStatus { Open, Drawing, Completed, Cancelled }`. Le backend les nomme `OPEN`, `LOCKED`, `COMPLETED`, `CANCELLED` | [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol), [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) |
| Condition de tirage | `isDrawReady` : tour ouvert, `ticketCount >= minTicketsToDraw`, et tour complet ou `endTime` atteint | [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) |
| Commission | `MAX_FEE_BPS = 2000` (20 %) vérifié par `_validateRoundConfig` ; défaut `MUNICIPALITY_FEE_BPS` à 1000 (10 %) dans les scripts de déploiement | [`smart-contract/scripts/lib/deployment.ts`](src:smart-contract/scripts/lib/deployment.ts) |
| Pull payment | `claimPrize` et `claimRefund` mettent l'état à jour, émettent l'événement, puis envoient les ethers par `call` | [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) |
| Sécurité | `nonReentrant` sur les achats, `requestDraw`, `retryDraw`, les annulations et toutes les fonctions qui envoient des ethers, rôles `OPERATOR_ROLE` et `PAUSER_ROLE`, `whenNotPaused` sur les achats et `requestDraw`, 18 erreurs personnalisées, aucune fonction `receive` ni `fallback` | [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) |
| Automation | `checkUpkeep` et `performUpkeep` présents | [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) |
| POAP | `_update` interdit tout transfert entre deux adresses non nulles (`SoulboundToken`), `badgeOf[roundId][participant]` empêche un second badge, `mintBadge` réservé à `MINTER_ROLE` | [`smart-contract/contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) |
| Sepolia | `deploy-sepolia.ts` refuse un autre chain id, une key hash inconnue du coordinateur et un abonnement sans solde LINK ni ETH | [`smart-contract/scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) |
| Chaîne locale | Le conteneur déploie `VRFCoordinatorV2_5Mock`, les deux contrats, puis lance l'oracle de développement qui scrute `RandomWordsRequested` toutes les 2 s | [`smart-contract/docker/start-local-chain.sh`](src:smart-contract/docker/start-local-chain.sh), [`smart-contract/scripts/local-vrf-responder.ts`](src:smart-contract/scripts/local-vrf-responder.ts) |
| Tests | 38 cas dans `BlockLucky.test.ts`, 5 dans `BlockLuckyPOAP.test.ts`, 4 fonctions `testFuzz_` dans `BlockLucky.t.sol` : 47 au total | [`smart-contract/test/`](src:smart-contract/test/) |
| CI | `npm run lint` (`--max-warnings 0`), `npm run test:coverage`, `npm run coverage:check` (seuil 100 % des lignes hors `contracts/test/`), `node scripts/export-abi.mjs --check`, `npm run slither` (`--fail-medium`), `npm audit --omit=dev --audit-level=critical`, job `chain` (intégration du backend sur une chaîne locale) | [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml), [`smart-contract/scripts/slither.sh`](src:smart-contract/scripts/slither.sh) |
| Trivy | La boucle Trivy porte sur `blocklucky-backend`, `blocklucky-web` et `blocklucky-tourisme`, pas sur l'image de la chaîne | [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) |

### Backend

| Élément de la décision | Constat | Où |
|---|---|---|
| Chiffrement des clés | `encryptText` : AES-256-GCM, IV de 12 octets, format `v2:<iv>:<tag>:<données>` en base64url | [`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) |
| Clé jamais renvoyée | `publicUser` et `getWallet` n'exposent que l'adresse, le solde et le hash de la dotation ; l'export RGPD ne contient pas `walletEncryptedKey` | [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts), [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts), [`backend/src/api/user/user.services.ts`](src:backend/src/api/user/user.services.ts) |
| Signature par le citoyen | `buyTickets`, `buyTicketsFor` et `claimPrize` sont envoyés avec `walletService.signerFor(user)` ; `claimRefund` aussi, depuis la file `chain-actions` | [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts), [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) |
| Mode imposé en production | `superRefine` refuse `BLOCKCHAIN_MODE` différent de `onchain` quand `NODE_ENV=production` | [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) |
| Indexeur | Curseur `ChainCursor` d'identifiant `BlockLucky`, plages de 2 000 blocs au plus, unicité `(lotteryId, ticketIndex)`, détection du curseur en avance | [`backend/src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts) |
| Keeper | Verrou `chain:keeper-lock` posé par `setIfAbsent`, durée égale à l'intervalle avec un minimum de 5 s | [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts) |
| File `chain-actions` | Jobs `MINT_BADGE`, `CLAIM_PRIZE`, `CLAIM_REFUND`, identifiant de job `<type>-<tour>-<adresse>` | [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) |
| Relais temps réel | `emitSocketEvent` publie sur Redis quand le process n'a pas de serveur Socket.IO | [`backend/src/socket/event-bridge.ts`](src:backend/src/socket/event-bridge.ts) |
| Dotation | `WELCOME_GRANT_WEI` vaut `500000000000000000` (0,5 ETH) par défaut | [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) |

### Écarts et précisions

**La dotation est déclenchée dès l'inscription.** La décision dit « à la première utilisation ». Dans le code, `createVerifiedUser` ([`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts)) appelle `walletService.grantWelcomeEthers` juste après la création du compte, sans attendre le résultat. La première utilisation (achat, cadeau, consultation du portefeuille) appelle `lotteryGateway.prepareWallet`, qui relance la dotation si elle a échoué, ou attend sa fin si elle est en cours (`waitForPendingGrant`, 30 s au plus). Voir [Inscription et portefeuille](../flux/inscription.md).

**`retryDraw` n'est jamais appelée par le backend.** Ni le keeper ni l'API ne l'appellent. Si le coordinateur VRF ne répond pas, le tour reste à l'état `Drawing` et les achats sont refusés (`RoundNotOpen`) jusqu'à ce qu'un opérateur appelle `retryDraw` à la main, après `drawTimeout` (10 minutes dans le déploiement local). Voir [Runbooks blockchain](../../infrastructure/runbooks-blockchain.md).

**L'opérateur garde des droits d'administration en local.** [`deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) sépare les comptes (administrateur et propriétaire VRF : compte Hardhat n° 2 ; trésorerie : n° 1 ; opérateur : clé du backend), mais laisse `DEFAULT_ADMIN_ROLE` à l'opérateur pour que le reversement de commission puisse appeler `setTreasury`, sauf avec `LOCAL_STRICT_ROLES=true`. La valeur de développement de `RELAYER_PRIVATE_KEY` est la clé du compte n° 0, qui déploie : sans autre clé, ce compte cumule donc opérateur, pause, frappe et administration. Sur Sepolia, [`deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) refuse un administrateur identique à l'opérateur (sauf `ALLOW_SHARED_ROLES=true`) et le déployeur renonce à tous ses rôles. Avec Docker Compose, `NODE_ENV=production` interdit la clé de développement et oblige à fournir une autre `RELAYER_PRIVATE_KEY`, transmise au conteneur `blockchain` comme `OPERATOR_PRIVATE_KEY`.

**Les remboursements vont au payeur, pas au porteur du ticket.** Le contrat crédite `contributions[roundId][msg.sender]`. Pour un ticket offert, c'est donc la personne qui a offert qui est remboursée, et l'indexeur met en file un `CLAIM_REFUND` par `payerWallet` distinct. Ce comportement est cohérent, mais n'est pas écrit dans la décision.

**`cancelRound` ne vérifie pas l'état du tour.** La fonction réservée à l'opérateur annule le tour courant qu'il soit ouvert ou en cours de tirage, même contrat en pause. Une réponse VRF arrivant ensuite est ignorée, car `fulfillRandomWords` vérifie que le tour est à l'état `Drawing`.

**Le nombre d'exécutions du fuzzing n'est pas configuré dans le dépôt.** Aucun réglage de fuzzing n'apparaît dans [`smart-contract/hardhat.config.ts`](src:smart-contract/hardhat.config.ts) : les 256 exécutions annoncées sont celles du réglage par défaut du lanceur de tests Solidity, ce qui n'a pas été vérifié par une exécution.

## Pour aller plus loin

- [Smart contracts](../../smart-contracts/index.md) et [Intégration blockchain du backend](../../integration-blockchain/index.md).
- [Clés et garde des portefeuilles](../../securite/cles-portefeuilles.md).
- [Crypto-actifs et MiCA](../../juridique/crypto-actifs.md).
