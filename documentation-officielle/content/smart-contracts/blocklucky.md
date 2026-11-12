# Contrat BlockLucky

`BlockLucky` est la loterie elle-même. Il enchaîne des tours numérotés à partir de 1. Chaque tour vend des tickets à prix fixe, se clôt quand il est complet ou que sa durée est écoulée, puis est tiré au sort par Chainlink VRF ou annulé. Un nouveau tour s'ouvre aussitôt. Source : [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol).

Cette page décrit les structures, l'état stocké, les rôles, les paramètres et les calculs. Les transitions d'état sont détaillées dans [Cycle de vie d'un tour](cycle-tour.md), la liste exhaustive des fonctions dans [Référence de BlockLucky](reference-blocklucky.md).

## Héritage

```solidity
contract BlockLucky is VRFConsumerBaseV2Plus, AccessControl, Pausable, ReentrancyGuard, AutomationCompatibleInterface {
```

| Parent | Origine | Apport |
|---|---|---|
| `VRFConsumerBaseV2Plus` | Chainlink 1.5.0 | Adresse du coordinateur (`s_vrfCoordinator`), point d'entrée `rawFulfillRandomWords` réservé au coordinateur, propriétaire `ConfirmedOwner` |
| `AccessControl` | OpenZeppelin 5.6.1 | Rôles et modificateur `onlyRole` |
| `Pausable` | OpenZeppelin 5.6.1 | `paused()`, modificateur `whenNotPaused` |
| `ReentrancyGuard` | OpenZeppelin 5.6.1 | Modificateur `nonReentrant` |
| `AutomationCompatibleInterface` | Chainlink 1.5.0 | Signatures `checkUpkeep` et `performUpkeep` |

`VRFConsumerBaseV2Plus` hérite lui-même de `ConfirmedOwner`. Le contrat a donc, en plus des rôles, un propriétaire : le compte qui l'a déployé. Ce propriétaire peut appeler `setCoordinator` et `transferOwnership`. Les conséquences sont analysées dans [Sécurité du contrat](securite.md#abus-de-l-administrateur).

## Constantes

| Constante | Valeur | Rôle |
|---|---|---|
| `OPERATOR_ROLE` | `keccak256("OPERATOR_ROLE")` | Exploitation courante par le backend |
| `PAUSER_ROLE` | `keccak256("PAUSER_ROLE")` | Disjoncteur |
| `MAX_FEE_BPS` | `2000` | Plafond de commission : 20 % |
| `BPS_DENOMINATOR` | `10000` | Base des points de base : 10 000 = 100 % |

## Structures

### RoundStatus

```solidity
enum RoundStatus {
    Open,
    Drawing,
    Completed,
    Cancelled
}
```

Les valeurs numériques renvoyées par l'ABI sont 0, 1, 2 et 3. Les tests les reprennent dans `RoundStatus` de [`test/fixtures.ts`](src:smart-contract/test/fixtures.ts).

### RoundConfig

Paramètres des tours à venir, modifiables par l'administrateur.

| Champ | Type | Contrainte de validation | Défaut des scripts |
|---|---|---|---|
| `ticketPrice` | `uint256` | Non nul | `10000000000000000` wei (0,01 ETH) |
| `maxTickets` | `uint32` | Non nul | 10 000 |
| `minTicketsToDraw` | `uint32` | Non nul et au plus `maxTickets` | 2 |
| `maxTicketsPerPlayer` | `uint32` | Non nul et au plus `maxTickets` | 1 : un ticket par participant et par tour |
| `duration` | `uint64` | Non nul, en secondes | 1 800 (30 min) en local, 172 800 (48 h) sur Sepolia |
| `feeBps` | `uint16` | Au plus `MAX_FEE_BPS` | 1 000 (10 %) |

Les défauts viennent de `roundConfigFromEnv` dans [`scripts/lib/deployment.ts`](src:smart-contract/scripts/lib/deployment.ts) et se remplacent par les variables `TICKET_PRICE_WEI`, `MAX_TICKETS`, `MIN_TICKETS_TO_DRAW`, `MAX_TICKETS_PER_PLAYER`, `ROUND_DURATION_SECONDS` et `MUNICIPALITY_FEE_BPS`. Une commission nulle est acceptée par le contrat, mais pas par le script, qui exige des entiers strictement positifs.

### VrfConfig

Paramètres des requêtes Chainlink VRF, modifiables par l'administrateur.

| Champ | Type | Contrainte de validation | Local | Sepolia |
|---|---|---|---|---|
| `keyHash` | `bytes32` | Non nul | `0x787d74ca…677ae` | Même valeur par défaut, vérifiée sur le coordinateur |
| `subscriptionId` | `uint256` | Aucune | Créé par le script | `SEPOLIA_VRF_SUBSCRIPTION_ID` |
| `callbackGasLimit` | `uint32` | Au moins 100 000 | 500 000 | 500 000 |
| `requestConfirmations` | `uint16` | Non nul | 1 | 3 |
| `nativePayment` | `bool` | Aucune | `false` | `true` si l'abonnement n'a pas de LINK |
| `drawTimeout` | `uint64` | Non nul, en secondes | 600 (10 min) | 86 400 (24 h) |

### Round

État complet d'un tour, renvoyé par `getRound(roundId)`.

| Champ | Type | Contenu |
|---|---|---|
| `ticketPrice` | `uint256` | Prix copié de `roundConfig` à l'ouverture |
| `totalCollected` | `uint256` | Somme des `msg.value` reçus pour ce tour |
| `prize` | `uint256` | Cagnotte nette, fixée au tirage |
| `vrfRequestId` | `uint256` | Identifiant de la dernière requête VRF |
| `winner` | `address` | Gagnant, adresse nulle tant que le tour n'est pas tiré |
| `startTime` | `uint64` | Horodatage d'ouverture |
| `endTime` | `uint64` | `startTime + duration` |
| `drawRequestedAt` | `uint64` | Horodatage de la dernière demande de tirage |
| `ticketCount` | `uint32` | Tickets vendus |
| `maxTickets` | `uint32` | Copié de `roundConfig` |
| `minTicketsToDraw` | `uint32` | Copié de `roundConfig` |
| `maxTicketsPerPlayer` | `uint32` | Copié de `roundConfig` |
| `winningTicket` | `uint32` | Index du ticket gagnant, à partir de 0 |
| `feeBps` | `uint16` | Copié de `roundConfig` |
| `status` | `RoundStatus` | État du tour |
| `prizeClaimed` | `bool` | Cagnotte retirée |

Les champs sont ordonnés pour que le compilateur les regroupe : les quatre `uint256`, puis l'adresse avec `startTime`, puis les autres petits entiers. Le tour tient en sept emplacements de stockage.

Chaque tour copie les paramètres de `roundConfig` à son ouverture. C'est ce qui permet de modifier la configuration sans toucher au tour en cours : la nouvelle valeur s'applique au tour suivant.

## État stocké

| Variable | Visibilité | Type | Contenu |
|---|---|---|---|
| `currentRoundId` | publique | `uint256` | Numéro du tour en cours, 1 au déploiement |
| `accruedFees` | publique | `uint256` | Commissions cumulées non encore versées à la trésorerie |
| `treasury` | publique | `address` | Destinataire de `withdrawFees` |
| `roundConfig` | publique | `RoundConfig` | Paramètres du prochain tour |
| `vrfConfig` | publique | `VrfConfig` | Paramètres des prochaines requêtes VRF |
| `rounds` | privée | `uint256 => Round` | Tous les tours, lus par `getRound` |
| `ticketOwners` | privée | `uint256 => address[]` | Pour chaque tour, le bénéficiaire de chaque ticket, dans l'ordre d'achat ; lu par `ticketOwner` |
| `ticketsByPlayer` | privée | `uint256 => address => uint32` | Tickets détenus par bénéficiaire ; lu par `ticketsOf` |
| `contributions` | privée | `uint256 => address => uint256` | Ethers versés par payeur ; lu par `contributionOf` |
| `roundByRequestId` | publique | `uint256 => uint256` | Tour associé à une requête VRF en attente |

Le contrat ne stocke aucune donnée personnelle : seulement des adresses, des montants et des compteurs. Le lien entre une adresse et un citoyen reste dans la base du backend (voir [Blockchain et données personnelles](../juridique/blockchain-donnees.md)).

### Bénéficiaire et payeur

`buyTicketsFor(player, quantity)` permet d'offrir des tickets. Le contrat distingue alors deux adresses :

- **le bénéficiaire** (`player`) détient les tickets : il est inscrit dans `ticketOwners` et `ticketsByPlayer`, son plafond par participant est décompté, et c'est lui qui peut gagner ;
- **le payeur** (`msg.sender`) a versé les ethers : sa mise est inscrite dans `contributions`, et c'est lui qui sera remboursé si le tour est annulé.

L'événement `TicketsPurchased` porte les deux adresses (`player` et `payer`). Pour un achat simple, elles sont identiques. Le test « permet d'offrir des tickets : le bénéficiaire les détient, le payeur est remboursable » vérifie ce partage.

## Rôles

| Rôle | Titulaire prévu | Fonctions |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Mairie (`admin` du constructeur) | `setTreasury`, `setRoundConfig`, `setVrfConfig`, `grantRole`, `revokeRole` |
| `OPERATOR_ROLE` | Mairie et compte opérateur du backend | `retryDraw`, `cancelRound`, `withdrawFees` |
| `PAUSER_ROLE` | Mairie et compte opérateur du backend | `pause`, `unpause` |
| Propriétaire `ConfirmedOwner` | Compte qui déploie | `setCoordinator`, `transferOwnership` |
| Coordinateur VRF | Contrat Chainlink | `rawFulfillRandomWords`, `setCoordinator` |
| Tout le monde | Citoyens, keeper, Chainlink Automation | `buyTickets`, `buyTicketsFor`, `requestDraw`, `closeExpiredRound`, `claimPrize`, `claimRefund`, `performUpkeep` |

Le constructeur accorde les trois rôles à `admin`. Les scripts de déploiement accordent ensuite `OPERATOR_ROLE` et `PAUSER_ROLE` à l'opérateur du backend s'il est distinct (voir [Exploitation du contrat](exploitation.md)). `DEFAULT_ADMIN_ROLE` est l'administrateur de tous les rôles : seul son titulaire peut en accorder ou en retirer.

## Constructeur

```solidity
constructor(
    address vrfCoordinator,
    address admin,
    address treasury_,
    RoundConfig memory initialRoundConfig,
    VrfConfig memory initialVrfConfig
) VRFConsumerBaseV2Plus(vrfCoordinator)
```

Dans l'ordre, il :

1. enregistre le coordinateur (`ZeroAddress` de Chainlink s'il est nul) et fait du déployeur le propriétaire ;
2. refuse un `admin` ou un `treasury_` nul (`ZeroAddressNotAllowed`) ;
3. valide les deux configurations (`InvalidConfiguration`) ;
4. accorde `DEFAULT_ADMIN_ROLE`, `OPERATOR_ROLE` et `PAUSER_ROLE` à `admin` ;
5. enregistre la trésorerie et les configurations ;
6. ouvre le tour 1 (`RoundOpened`).

Le contrat est donc utilisable dès son déploiement, à une condition : être ajouté comme consommateur de l'abonnement VRF avant le premier tirage.

## Achat de tickets

`buyTickets(quantity)` et `buyTicketsFor(player, quantity)` sont `payable`, `whenNotPaused` et `nonReentrant`. Elles délèguent à `_buyTickets`, qui contrôle dans cet ordre :

| Contrôle | Erreur |
|---|---|
| Le tour en cours est `Open` | `RoundNotOpen(roundId)` |
| `block.timestamp < endTime` | `RoundExpired(roundId)` |
| `quantity > 0` | `InvalidQuantity()` |
| `quantity <= maxTickets - ticketCount` | `RoundSoldOut(roundId, remaining)` |
| `ticketsOf(player) + quantity <= maxTicketsPerPlayer` | `PlayerLimitReached(owned, limit)` |
| `msg.value == ticketPrice * quantity` exactement | `IncorrectPayment(expected, received)` |

Le paiement doit être exact : un excédent n'est pas rendu, il est refusé. Ensuite, le contrat ajoute `quantity` fois l'adresse du bénéficiaire à `ticketOwners[roundId]`, met à jour `ticketCount`, `totalCollected`, `ticketsByPlayer` et `contributions`, puis émet `TicketsPurchased` avec l'index du premier ticket acheté (`firstTicketIndex`) et le total vendu.

La boucle d'inscription est bornée par `maxTicketsPerPlayer`. Son coût croît avec la quantité, de l'ordre de 25 000 gaz par ticket supplémentaire : le [rapport de gaz](tests.md#rapport-de-gaz) relève 119 577 gaz au minimum et 356 745 gaz au maximum, pour un achat de dix tickets.

Les tickets sont numérotés à partir de 0. Si Alice achète 3 tickets puis Bob 5, Alice détient les index 0 à 2 et Bob les index 3 à 7. `ticketOwner(roundId, 5)` renvoie l'adresse de Bob.

## Calcul de la commission et de la cagnotte

Au tirage, dans `fulfillRandomWords` :

```solidity
uint256 fee = (round.totalCollected * round.feeBps) / BPS_DENOMINATOR;
uint256 prize = round.totalCollected - fee;
```

- La commission est arrondie à l'inférieur par la division entière ; l'arrondi profite au gagnant.
- `prize + fee == totalCollected` exactement : aucun wei n'est perdu. Le test de fuzzing `testFuzz_PrizeAndFeeMatchCollectedFunds` le vérifie sur 256 jeux de données.
- La commission s'ajoute à `accruedFees` ; la cagnotte est inscrite dans `round.prize`. Aucun transfert n'a lieu à ce moment.
- Le taux est celui du tour (`round.feeBps`), copié à son ouverture : changer `feeBps` en cours de tour n'a pas d'effet rétroactif.

Exemple tiré des tests : 10 tickets à 0,01 ETH donnent `totalCollected` = 0,1 ETH. Avec `feeBps` = 1 000, la commission vaut 0,01 ETH et la cagnotte 0,09 ETH.

Un tour annulé ne prélève aucune commission : chaque payeur récupère l'intégralité de sa mise.

## Tirage du gagnant

```solidity
uint32 winningTicket = uint32(randomWords[0] % round.ticketCount);
address winner = ticketOwners[roundId][winningTicket];
```

Le mot aléatoire de Chainlink, un entier de 256 bits, est réduit modulo le nombre de tickets vendus. Le résultat est l'index d'un ticket ; son bénéficiaire est le gagnant. Chaque ticket a donc la même chance, et un participant qui détient 5 tickets sur 10 a une chance sur deux.

- `ticketCount` est au moins égal à `minTicketsToDraw`, lui-même au moins 1 : la division par zéro est impossible.
- Le biais du modulo est négligeable : `ticketCount` tient sur 32 bits, l'aléa sur 256 bits.
- Le test « tire le gagnant parmi les tickets vendus quel que soit l'aléa » utilise `ethers.MaxUint256` comme mot aléatoire et vérifie que l'index obtenu est `MaxUint256 % 10`.

Le mécanisme complet de la requête et de la réponse est sur la page [Tirage Chainlink VRF](chainlink-vrf.md).

## Retraits à l'initiative du bénéficiaire

Le contrat n'envoie jamais d'ethers de lui-même lors d'un tirage ou d'une annulation. Il inscrit des droits, que chaque bénéficiaire retire ensuite (« pull payment ») :

| Fonction | Qui | Montant | Protection contre le double retrait |
|---|---|---|---|
| `claimPrize(roundId)` | Le gagnant du tour | `round.prize` | `prizeClaimed` passe à `true` avant le transfert |
| `claimRefund(roundId)` | Chaque payeur d'un tour annulé | `contributions[roundId][msg.sender]` | La contribution est remise à zéro avant le transfert |
| `withdrawFees()` | `OPERATOR_ROLE`, vers `treasury` | `accruedFees` | `accruedFees` est remis à zéro avant le transfert |

Ce choix a trois effets :

1. **Un destinataire défaillant ne bloque personne.** Si un contrat gagnant refuse les ethers, seul son retrait échoue (`TransferFailed`), et l'état est restauré par le revert : il peut réessayer. Le tour suivant est déjà ouvert.
2. **Le tirage reste bon marché et prévisible en gaz.** Le callback VRF ne fait aucun transfert, ce qui borne sa consommation (voir [Sécurité du contrat](securite.md)).
3. **Les fonds restent disponibles même en pause.** `claimPrize`, `claimRefund` et `withdrawFees` n'ont pas `whenNotPaused`.

Les citoyens n'appellent pas ces fonctions à la main : la [file d'actions on-chain](../integration-blockchain/actions.md) du backend signe `claimPrize` et `claimRefund` avec leur portefeuille intégré.

Les retraits ne sont pas limités dans le temps : une cagnotte non réclamée reste due indéfiniment au gagnant.

## Absence de fonction receive

Le contrat ne déclare ni `receive` ni `fallback`. Un envoi d'ethers direct, hors `buyTickets` ou `buyTicketsFor`, est rejeté par l'EVM. Le test « refuse tout envoi direct d'ethers hors achat » le vérifie.

Conséquence : le solde du contrat est égal, à tout instant, à la somme des mises des tours ouverts ou en tirage, des cagnottes non réclamées, des remboursements non réclamés et de `accruedFees`. Les tests de fuzzing `testFuzz_ClaimsEmptyTheContractExactly` et `testFuzz_RefundsReturnEveryContribution` vérifient que tous les retraits vident le contrat exactement à zéro.

Seul un envoi forcé (par exemple un `selfdestruct` d'un autre contrat) pourrait ajouter des ethers ; ils ne seraient alors comptés nulle part et resteraient bloqués, sans perturber la comptabilité.

## Fonctions de lecture

| Fonction | Renvoie |
|---|---|
| `getRound(roundId)` | La structure `Round` complète |
| `ticketOwner(roundId, ticketIndex)` | Le bénéficiaire du ticket ; revert si l'index dépasse `ticketCount - 1` |
| `ticketsOf(roundId, player)` | Le nombre de tickets du bénéficiaire |
| `contributionOf(roundId, player)` | Les ethers versés par ce payeur et non remboursés |
| `isDrawReady()` | Vrai si le tour en cours peut être tiré |
| `isExpiredWithoutDraw()` | Vrai si le tour en cours peut être annulé faute de participants |
| `checkUpkeep(bytes)` | L'action à effectuer pour Chainlink Automation |

Un tour qui n'existe pas renvoie une structure vide : `getRound(999)` ne revert pas, son `status` vaut 0 (`Open`) et `endTime` vaut 0. Il faut donc toujours comparer `roundId` à `currentRoundId` avant d'interpréter le statut.
