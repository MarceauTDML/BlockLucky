# 0004 - Smart contract Solidity sur Ethereum, tirage Chainlink VRF et portefeuille intégré

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

- La Mairie détient les clés des portefeuilles citoyens : le modèle est custodial. C'est acceptable avec des ethers fictifs sur un testnet. Sur un réseau principal, il faudrait une autorisation de prestataire de services sur crypto-actifs (règlement MiCA) ou un modèle non custodial (voir la [veille juridique](../conformite/veille-juridique.md)).
- Chaque achat coûte des frais de réseau au citoyen. La dotation de bienvenue doit les couvrir : 0,1 ETH fictif par défaut, pour un ticket à 0,01 ETH.
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
