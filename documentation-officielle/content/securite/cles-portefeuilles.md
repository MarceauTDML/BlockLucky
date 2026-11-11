# Clés et garde des portefeuilles

BlockLucky manipule trois familles de clés Ethereum : les portefeuilles des citoyens, conservés par le backend ; le compte opérateur, qui signe les opérations de service ; et les comptes de la Mairie qui administrent le contrat. Cette page décrit qui détient quoi, quels pouvoirs chaque clé confère sur la chaîne, et comment réagir à une compromission. Le fonctionnement technique des portefeuilles est détaillé dans [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md) et celui du client RPC dans [Client RPC et compte opérateur](../integration-blockchain/client-rpc.md).

## Vue d'ensemble

```mermaid
flowchart TD
    subgraph Backend
        EK["ENCRYPTION_KEY"]
        RK["RELAYER_PRIVATE_KEY"]
        DB[("User.walletEncryptedKey")]
    end
    EK -->|"déchiffre"| DB
    DB -->|"signe achats, cadeaux, retraits"| SC["Contrat BlockLucky"]
    RK -->|"OPERATOR_ROLE, PAUSER_ROLE"| SC
    RK -->|"MINTER_ROLE"| POAP["Contrat BlockLuckyPOAP"]
    RK -->|"dotation de bienvenue"| DB
    ADM["Compte administrateur Mairie"] -->|"DEFAULT_ADMIN_ROLE"| SC
    DEP["Compte déployeur"] -->|"owner, setCoordinator"| SC
```

## Portefeuilles custodial des citoyens

| Propriété | Valeur |
|---|---|
| Création | `Wallet.createRandom()` d'ethers à l'inscription, au premier cadeau reçu ou au premier achat d'un compte ancien (`ensureWallet`) |
| Stockage | `User.walletEncryptedKey`, chiffré en AES-256-GCM au format `v2:` |
| Déchiffrement | À la volée, uniquement pour signer (`walletService.signerFor`) |
| Exposition | Jamais renvoyée au client, jamais journalisée, absente de l'export RGPD |
| Export par le citoyen | Non prévu |
| Suppression | Mise à `null` lors de l'anonymisation RGPD |

Le backend signe à la place du citoyen les opérations suivantes, toutes déclenchées par une requête authentifiée du citoyen lui-même :

| Opération | Fonction du contrat | Fichier |
|---|---|---|
| Achat de tickets | `buyTickets` | [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) |
| Cadeau d'un ticket | `buyTicketsFor(bénéficiaire, 1)` | idem |
| Retrait de la cagnotte | `claimPrize` | idem et [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) |
| Remboursement d'un tour annulé | `claimRefund` | [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) |

Ce modèle retire au citoyen toute manipulation de clé, mais fait de la Ville le dépositaire des fonds. Ses conséquences juridiques sont traitées dans [Crypto-actifs et MiCA](../juridique/crypto-actifs.md). Ses conséquences de sécurité sont les suivantes :

- le backend en fonctionnement peut signer pour n'importe quel citoyen ; une prise de contrôle du serveur équivaut à celle de tous les portefeuilles ;
- une copie de la base seule ne suffit pas : il faut aussi `ENCRYPTION_KEY` ;
- la perte de `ENCRYPTION_KEY` rend tous les portefeuilles inutilisables, sans recours (voir [Rotation](cryptographie-secrets.md#rotation)).

## Compte opérateur

`RELAYER_PRIVATE_KEY` est chargée par `chainClient.operator`, un `NonceManager` d'ethers, dans [`backend/src/blockchain/chain.client.ts`](src:backend/src/blockchain/chain.client.ts). Le backend s'en sert pour :

| Usage | Fonction | Rôle requis sur la chaîne |
|---|---|---|
| Dotation de bienvenue (`WELCOME_GRANT_WEI`, 0,1 ETH par défaut) | Transfert simple | Aucun, mais un solde suffisant |
| Demande de tirage (route ADMIN et keeper) | `requestDraw` | Aucun (fonction publique) |
| Clôture d'un tour expiré (keeper) | `closeExpiredRound` | Aucun (fonction publique) |
| Annulation et remboursement (route ADMIN `/api/lottery/refund`) | `cancelRound` | `OPERATOR_ROLE` |
| Disjoncteur (route ADMIN `/api/admin/circuit-breaker`) | `pause`, `unpause` | `PAUSER_ROLE` |
| Reversement de la commission | `withdrawFees` | `OPERATOR_ROLE` |
| Changement de trésorerie avant le reversement | `setTreasury` | `DEFAULT_ADMIN_ROLE` |
| Émission des badges POAP | `mintBadge` | `MINTER_ROLE` sur `BlockLuckyPOAP` |

> [!WARNING]
> `withdrawFees` du gateway appelle `setTreasury` quand l'adresse `multisigWallet` envoyée par l'administrateur diffère de la trésorerie enregistrée. Cela suppose que l'opérateur détienne `DEFAULT_ADMIN_ROLE`, ce qui contredit l'objectif de rôles limités affiché dans le [registre des risques](../juridique/registre-risques.md) (risque K1). Avec un opérateur sans ce rôle, le reversement échoue dès que l'adresse demandée diffère de la trésorerie. Avec un opérateur qui le détient, un compte ADMIN de l'application peut rediriger la commission vers n'importe quelle adresse.

## Rôles sur la chaîne

Les rôles sont gérés par `AccessControl` d'OpenZeppelin dans [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) et [`smart-contract/contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol).

| Rôle | Contrat | Fonctions | Attribué au déploiement à |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | BlockLucky | `setTreasury`, `setRoundConfig`, `setVrfConfig`, `grantRole`, `revokeRole` | `admin` |
| `OPERATOR_ROLE` | BlockLucky | `retryDraw`, `cancelRound`, `withdrawFees` | `admin`, puis `OPERATOR_ADDRESS` si fourni |
| `PAUSER_ROLE` | BlockLucky | `pause`, `unpause` | `admin`, puis `OPERATOR_ADDRESS` si fourni |
| `MINTER_ROLE` | BlockLuckyPOAP | `mintBadge` | `admin`, puis `OPERATOR_ADDRESS` si fourni |
| Propriétaire (`owner`) | BlockLucky, via `ConfirmedOwner` hérité de `VRFConsumerBaseV2Plus` | `setCoordinator`, `transferOwnership` | Le compte **déployeur** |

### Selon l'environnement

| Environnement | Administrateur | Opérateur | Propriétaire VRF |
|---|---|---|---|
| Blockchain locale ([`smart-contract/scripts/deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts)) | Compte n°0 de Hardhat | Compte n°0 par défaut (`RELAYER_PRIVATE_KEY` de développement), ou `OPERATOR_PRIVATE_KEY` s'il est fourni | Compte n°0 |
| Sepolia ([`smart-contract/scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts)) | `MAIRIE_ADMIN_ADDRESS`, ou le déployeur à défaut | `OPERATOR_ADDRESS` ; les rôles ne sont accordés automatiquement que si le déployeur est l'administrateur, sinon le script affiche les rôles à accorder | Le déployeur (`SEPOLIA_PRIVATE_KEY`) |

En local, une seule clé, publiquement connue, détient donc tous les pouvoirs. C'est sans conséquence sur une chaîne jetable, mais cela signifie que la configuration locale ne teste pas la séparation des rôles.

> [!IMPORTANT]
> Le propriétaire hérité de Chainlink peut remplacer le coordinateur VRF par une adresse de son choix, qui fournirait alors l'« aléa » et désignerait le gagnant. Aucun script ne transfère cette propriété. Après un déploiement sur Sepolia, il est recommandé d'appeler `transferOwnership(<multisig de la Mairie>)` puis `acceptOwnership()` depuis ce multisig, et de surveiller l'événement `CoordinatorSet`. Voir le [modèle de menaces](menaces.md#oracle-chainlink-vrf).

### Séparation recommandée

| Compte | Détenteur | Rôles |
|---|---|---|
| Multisignature de la Mairie | Élus et DSI | `DEFAULT_ADMIN_ROLE`, propriétaire VRF |
| Trésorerie | Multisignature distincte | Aucun rôle ; reçoit la commission |
| Opérateur backend | Serveur | `OPERATOR_ROLE`, `PAUSER_ROLE`, `MINTER_ROLE`, rien d'autre |

Avec cette séparation, la route de trésorerie doit envoyer l'adresse de trésorerie déjà enregistrée ; tout changement de trésorerie passe par le multisig.

## Compromission et révocation

### Clé opérateur compromise

1. Mettre le contrat en pause depuis un autre compte détenant `PAUSER_ROLE` (l'administrateur), si l'attaquant n'a pas déjà agi.
2. Depuis le compte administrateur, appeler `revokeRole(OPERATOR_ROLE, ancien)`, `revokeRole(PAUSER_ROLE, ancien)` et, sur le contrat POAP, `revokeRole(MINTER_ROLE, ancien)`. Si l'ancien opérateur détenait `DEFAULT_ADMIN_ROLE`, le révoquer en dernier, depuis un autre administrateur.
3. Générer une nouvelle clé, accorder les trois rôles à la nouvelle adresse, la financer.
4. Remplacer `RELAYER_PRIVATE_KEY` dans l'environnement du backend et du worker, redémarrer.
5. Transférer les ETH restants de l'ancien compte s'ils sont encore accessibles.

Ce que l'attaquant peut faire avant la révocation : pauser le contrat, annuler le tour en cours (les participants restent remboursables), vider le solde de l'opérateur, émettre de faux badges POAP. Il ne peut ni désigner un gagnant ni retirer la cagnotte, sauf s'il détient aussi `DEFAULT_ADMIN_ROLE` ou la propriété VRF.

### `ENCRYPTION_KEY` ou base de données compromise

Avec la base **et** la clé, l'attaquant peut signer pour chaque citoyen, donc acheter des tickets avec leurs fonds ou retirer leurs gains vers leur propre portefeuille, qu'il contrôle alors. Il faut :

1. mettre le contrat en pause (achats bloqués ; `claimPrize` et `claimRefund` restent possibles, car ils ne sont pas soumis à `whenNotPaused`) ;
2. arrêter le backend ;
3. générer pour chaque citoyen un nouveau portefeuille, puis transférer les fonds de l'ancien au nouveau avant l'attaquant, ce qui suppose un script qui n'existe pas dans le dépôt ;
4. remplacer `ENCRYPTION_KEY` après re-chiffrement.

Sur un réseau de test, la réponse raisonnable est de redéployer et de redistribuer des ethers fictifs. Le [plan de réponse aux incidents](../infrastructure/incidents.md) et les [runbooks blockchain](../infrastructure/runbooks-blockchain.md) donnent les procédures d'exploitation.

### Clé administrateur ou déployeur compromise

C'est le scénario le plus grave : l'attaquant peut changer la configuration des tours, la trésorerie, les rôles et, avec la propriété VRF, le coordinateur. Le contrat n'étant pas modifiable, la seule réponse est de le mettre en pause s'il en est encore temps, d'informer les participants et de redéployer. D'où l'importance d'un multisig pour ces deux comptes.

## Limites connues

| Limite | Détail |
|---|---|
| Pas d'export de clé | Le citoyen ne peut pas récupérer sa clé pour passer à un portefeuille non custodial. |
| Pas de surveillance on-chain | Aucun composant n'alerte sur `RoleGranted`, `RoleRevoked`, `CoordinatorSet` ou `OwnershipTransferred`. |
| Compte unique pour la dotation | L'épuisement du solde opérateur bloque l'inscription avec dotation ; voir les [runbooks blockchain](../infrastructure/runbooks-blockchain.md). |
