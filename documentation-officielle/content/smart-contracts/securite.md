# Sécurité du contrat

Le critère de sélection du kickoff est un smart contract « solide et sécurisé ». Cette page recense les menaces qui pèsent sur `BlockLucky` et `BlockLuckyPOAP`, la parade de chacune dans le code, les risques acceptés, et le triage de l'analyse statique. Elle porte sur les contrats ; la sécurité du backend, des portefeuilles et de l'infrastructure est traitée dans la partie [Sécurité](../securite/menaces.md), en particulier [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

## Acteurs et actifs

| Acteur | Capacités on-chain | Intérêt à tricher |
|---|---|---|
| Citoyen | Acheter, offrir, retirer ses gains et remboursements | Gagner plus souvent, retirer deux fois |
| Contrat malveillant | Mêmes capacités, avec du code exécuté à la réception d'ethers | Réentrance, blocage |
| Validateur ou producteur de bloc | Ordonner, retarder ou omettre des transactions | Orienter le hasard, devancer un achat |
| Opérateur du backend (`OPERATOR_ROLE`, `PAUSER_ROLE`) | Annuler, relancer, mettre en pause, verser la commission | Orienter l'issue d'un tour |
| Administrateur (`DEFAULT_ADMIN_ROLE`) | Configurer, distribuer les rôles, changer la trésorerie | Détourner des fonds |
| Propriétaire `ConfirmedOwner` | Changer le coordinateur VRF | Fournir un faux aléa |
| Oracle Chainlink | Livrer ou ne pas livrer l'aléa | Bloquer un tirage |

Les actifs à protéger sont les mises des tours en cours, les cagnottes et remboursements non retirés, la commission accumulée, et l'équité du tirage.

## Synthèse

| Menace | Parade principale | Test qui la vérifie |
|---|---|---|
| Réentrance | Checks-effects-interactions et `nonReentrant` | « bloque la réentrance lors du versement de la cagnotte », « … lors d'un remboursement » |
| Double retrait | Drapeau ou solde remis à zéro avant le transfert | « refuse un second retrait et tout retrait par un autre joueur » |
| Manipulation du hasard | Chainlink VRF, aucun usage de `prevrandao` ou `blockhash` | « tire le gagnant parmi les tickets vendus quel que soit l'aléa » |
| Faux aléa | `rawFulfillRandomWords` réservé au coordinateur | Garantie de `VRFConsumerBaseV2Plus` |
| Achat après connaissance de l'aléa | Achats fermés dès `Drawing` et après `endTime` | « est ouvert à tous une fois les conditions remplies et verrouille le tour » |
| Déni de service par revert | Retraits à l'initiative du bénéficiaire | « annule le versement si le gagnant refuse les ethers, sans perdre la cagnotte » |
| Abus de l'administrateur | Rôles séparés, commission plafonnée, configuration appliquée au tour suivant | « applique une nouvelle configuration au tour suivant seulement » |
| Épuisement du gaz du callback | Callback sans boucle ni transfert, 500 000 gaz alloués | Rapport de gaz |
| Oracle muet | `retryDraw` après `drawTimeout`, `cancelRound` | « autorise une nouvelle demande VRF après le délai d'attente… » |
| Paiement inexact | Égalité stricte `msg.value == ticketPrice * quantity` | `testFuzz_RejectsAnyIncorrectPayment` |
| Envoi d'ethers parasite | Ni `receive` ni `fallback` | « refuse tout envoi direct d'ethers hors achat » |

## Checks-effects-interactions

Chaque fonction qui envoie des ethers suit le même ordre : vérifier, modifier l'état, émettre l'événement, puis seulement appeler le destinataire.

```solidity
function claimPrize(uint256 roundId) external nonReentrant {
    Round storage round = rounds[roundId];
    if (round.status != RoundStatus.Completed) revert RoundNotCompleted(roundId);
    if (msg.sender != round.winner) revert NotWinner(msg.sender);
    if (round.prizeClaimed) revert PrizeAlreadyClaimed(roundId);

    round.prizeClaimed = true;
    uint256 amount = round.prize;
    emit PrizeClaimed(roundId, msg.sender, amount);
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    if (!success) revert TransferFailed(msg.sender, amount);
}
```

| Fonction | Vérifications | Effet avant l'appel externe | Appel externe |
|---|---|---|---|
| `claimPrize` | Statut `Completed`, appelant gagnant, non retiré | `prizeClaimed = true` | `call` vers le gagnant |
| `claimRefund` | Statut `Cancelled`, contribution non nulle | `contributions[roundId][msg.sender] = 0` | `call` vers le payeur |
| `withdrawFees` | Rôle, `accruedFees` non nul | `accruedFees = 0` | `call` vers `treasury` |
| `mintBadge` (POAP) | Rôle, adresse, pas de doublon | `totalMinted`, `roundOfToken`, `badgeOf` | `onERC721Received` via `_safeMint` |

Le transfert utilise `call` sans limite de gaz plutôt que `transfer`, qui plafonne à 2 300 gaz et échoue avec les portefeuilles de contrat. C'est sûr précisément parce que l'état est déjà à jour. En cas d'échec, le revert `TransferFailed` annule toute la transaction, y compris la mise à jour de l'état : le bénéficiaire peut réessayer.

## Réentrance

Un contrat gagnant pourrait, dans sa fonction `receive`, rappeler `claimPrize` pour se faire payer deux fois. Deux protections indépendantes l'en empêchent :

1. **L'ordre checks-effects-interactions** : au second appel, `prizeClaimed` vaut déjà `true`.
2. **`nonReentrant`** d'OpenZeppelin, posé sur `buyTickets`, `buyTicketsFor`, `requestDraw`, `retryDraw`, `closeExpiredRound`, `cancelRound`, `claimPrize`, `claimRefund` et `withdrawFees`. Le verrou est partagé : pendant un `claimPrize`, aucune de ces fonctions n'est accessible, ce qui interdit aussi la réentrance croisée (par exemple un `claimRefund` lancé depuis le `receive` d'un `claimPrize`).

Le contrat d'attaque [`ReentrantPlayer.sol`](src:smart-contract/contracts/test/ReentrantPlayer.sol) tente exactement ces deux scénarios. Les tests constatent que la tentative a bien lieu (`reentryAttempts == 1`), qu'elle échoue (`reentrySucceeded == false`), que l'attaquant reçoit exactement une fois son dû, et que le solde du contrat tombe à zéro après le remboursement.

## Manipulation du hasard

Le contrat n'utilise ni `block.prevrandao`, ni `blockhash`, ni `block.timestamp` pour le tirage. Le seul aléa est le mot fourni par Chainlink VRF, accompagné d'une preuve vérifiée par le coordinateur. `rawFulfillRandomWords` refuse tout appelant autre que `s_vrfCoordinator` (`OnlyCoordinatorCanFulfill`).

Le gagnant est `ticketOwners[roundId][randomWords[0] % ticketCount]`. Le biais du modulo est négligeable pour un `ticketCount` sur 32 bits. Chaque ticket a la même probabilité, ce que vérifient les tests de fuzzing en contrôlant que l'index gagnant est toujours inférieur au nombre de tickets vendus et que le gagnant est bien le détenteur de ce ticket.

`block.timestamp` n'intervient que dans les délais (`endTime`, `drawTimeout`). Un validateur peut le décaler de quelques secondes ; sur des tours de 48 heures, l'effet est nul. Ce constat Slither est accepté (voir plus bas).

## Front-running

| Scénario | Analyse |
|---|---|
| Acheter un ticket après avoir vu la réponse VRF dans le mempool | Impossible : le tour est `Drawing` depuis la demande, `buyTickets` échoue avec `RoundNotOpen` |
| Acheter un ticket en voyant la demande de tirage dans le mempool | Sans intérêt : la demande ne contient pas l'aléa, qui n'est calculé qu'après `requestConfirmations` blocs |
| Devancer le keeper sur `requestDraw` | Sans effet : la fonction est publique, celui qui l'appelle paie le gaz et le résultat est le même |
| Acheter le dernier ticket juste avant `endTime` | Permis et sans avantage : l'aléa n'est pas encore demandé |
| Devancer un `setRoundConfig` qui baisse le prix | Sans effet sur le tour en cours, qui garde son prix |

## Déni de service par revert

Un contrat qui refuse les ethers, comme [`RejectingPlayer.sol`](src:smart-contract/contracts/test/RejectingPlayer.sol), ne peut bloquer que son propre retrait. Le tirage et l'annulation n'envoient aucun ether, et le tour suivant s'ouvre dans la même transaction. Trois tests le vérifient : gagnant qui refuse (`prizeClaimed` reste `false`), payeur qui refuse (sa contribution reste due), trésorerie qui refuse (`accruedFees` est conservé).

Aucune boucle ne parcourt les participants. La seule boucle, dans `_buyTickets`, est bornée par la quantité achetée, elle-même plafonnée par `maxTicketsPerPlayer`.

## Abus de l'administrateur

Le contrat est conçu pour qu'aucun rôle ne puisse prendre l'argent des joueurs.

| Rôle | Ce qu'il peut faire | Ce qu'il ne peut pas faire |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Changer la trésorerie, la configuration des tours suivants, la configuration VRF ; distribuer les rôles | Modifier un tour en cours, toucher aux mises, aux cagnottes ou aux remboursements, dépasser 20 % de commission |
| `OPERATOR_ROLE` | Annuler un tour, relancer un tirage bloqué, verser la commission à la trésorerie | Choisir le gagnant, relancer un tirage avant `drawTimeout`, verser la commission ailleurs qu'à `treasury` |
| `PAUSER_ROLE` | Bloquer les achats et la demande de tirage | Bloquer les retraits, l'annulation ou la réponse VRF |

Le pire que puisse faire un opérateur malveillant est d'annuler un tour : tous les payeurs sont alors remboursés intégralement. Le pire que puisse faire un administrateur malveillant est de détourner la commission, en changeant la trésorerie.

Deux pouvoirs méritent toutefois d'être connus.

> [!WARNING]
> **Le propriétaire `ConfirmedOwner` peut changer le coordinateur VRF.** `VRFConsumerBaseV2Plus` donne à son déployeur un rôle de propriétaire, distinct de `AccessControl`, qui autorise `setCoordinator`. Un propriétaire malveillant pourrait installer un faux coordinateur, livrer l'aléa de son choix et désigner un gagnant complice. Le propriétaire est d'abord le compte qui déploie. Les scripts de déploiement appellent `transferOwnership(VRF_OWNER_ADDRESS)`, par défaut le multisig `MAIRIE_ADMIN_ADDRESS` ; en local, le compte n° 2 accepte aussitôt, mais sur Sepolia le multisig doit encore appeler `acceptOwnership`, sans quoi le déployeur reste propriétaire.

> [!CAUTION]
> **L'opérateur peut annuler un tour pendant le tirage.** `cancelRound` est accepté en état `Drawing`. Sur un réseau public, la transaction de réponse de l'oracle passe par le mempool avant d'être incluse : un opérateur qui la surveille pourrait en lire l'aléa, constater un résultat qui lui déplaît et faire passer un `cancelRound` avant elle. Personne n'est lésé financièrement, puisque tout le monde est remboursé, mais l'opérateur dispose ainsi d'un droit de veto sur l'issue. C'est le prix de la parade contre l'oracle muet ; une alternative serait de n'autoriser l'annulation en `Drawing` qu'après `drawTimeout`.

Les autres garde-fous contre l'abus :

- **Configuration non rétroactive.** Chaque tour copie ses paramètres à l'ouverture. Ni le prix, ni le plafond, ni la commission d'un tour en cours ne peuvent changer.
- **Commission plafonnée** à `MAX_FEE_BPS` (20 %) par `_validateRoundConfig`.
- **Validation de toute configuration** au constructeur comme dans les setters : une configuration absurde (prix nul, minimum supérieur au plafond, délai nul, gaz du callback sous 100 000) est refusée avec `InvalidConfiguration`.
- **Transparence.** Chaque changement émet un événement (`TreasuryUpdated`, `RoundConfigUpdated`, `VrfConfigUpdated`, `RoleGranted`, `Paused`) visible de tous sur l'explorateur.

## Épuisement du gaz du callback VRF

Le coordinateur appelle le consommateur avec exactement `callbackGasLimit` gaz. Si le callback en consomme davantage, il échoue, la requête est considérée comme servie et le tour reste bloqué en `Drawing`.

Parades :

- le callback ne contient **aucune boucle** et **aucun appel externe** : son coût est constant, quel que soit le nombre de tickets ;
- il ne **transfère aucun ether** : la cagnotte est retirée plus tard par `claimPrize` ;
- il **ne revert jamais** sur une réponse inattendue : il l'ignore ;
- `callbackGasLimit` vaut 500 000 dans les scripts et le contrat refuse moins de 100 000 ;
- en dernier recours, l'opérateur relève la limite par `setVrfConfig` puis appelle `retryDraw`.

## Oracle muet

Si aucune réponse n'arrive, `retryDraw` permet à l'opérateur de renvoyer une requête une fois `drawTimeout` écoulé (24 heures sur Sepolia). L'ancienne requête est retirée de `roundByRequestId` : si sa réponse arrive malgré tout, elle est ignorée. En dernier recours, `cancelRound` rend les mises remboursables. Voir [Tirage Chainlink VRF](chainlink-vrf.md#oracle-muet).

## Autres protections

- **Arithmétique vérifiée.** Solidity 0.8 revert en cas de dépassement ; le contrat n'utilise pas de bloc `unchecked`.
- **Erreurs personnalisées** partout, imposées par la règle solhint `gas-custom-errors`.
- **Imports nommés** uniquement (`no-global-import`).
- **Version du compilateur** contrainte à `^0.8.28` dans les sources et fixée à 0.8.34 dans Hardhat.
- **Ethers forcés.** Sans `receive`, seul un `selfdestruct` tiers peut ajouter des ethers ; ils ne sont comptabilisés nulle part et ne faussent aucun calcul, le contrat ne lisant jamais `address(this).balance`.

## Analyse statique

### solhint

`npm run lint` lance solhint avec [`smart-contract/.solhint.json`](src:smart-contract/.solhint.json), qui étend `solhint:recommended` et refuse tout avertissement (`--max-warnings 0`). Les règles désactivées le sont pour une raison précise :

| Règle désactivée | Raison |
|---|---|
| `not-rely-on-time` | Les durées de tour reposent sur `block.timestamp` par conception |
| `avoid-low-level-calls` | Les retraits utilisent `call`, protégé par checks-effects-interactions |
| `reason-string` | Remplacée par les erreurs personnalisées |
| `use-natspec` | Documentation tenue dans ce site |
| `gas-indexed-events`, `gas-strict-inequalities`, `gas-struct-packing` | Optimisations de gaz non retenues, au profit de la lisibilité |

### Triage Slither

`npm run slither` lance Slither 0.11.6 dans Docker par [`scripts/slither.sh`](src:smart-contract/scripts/slither.sh), sur chacun des deux contrats, avec `--fail-medium`. La configuration [`slither.config.json`](src:smart-contract/slither.config.json) exclut `node_modules` et `contracts/test`, ainsi que les détecteurs informatifs et d'optimisation. La CI échoue dès qu'un constat de niveau Medium ou supérieur n'est pas trié.

Les constats acceptés sont consignés dans [`slither.db.json`](src:smart-contract/slither.db.json), passé à Slither par `--triage-database`. Il en contient huit :

| Détecteur | Niveau | Fonction | Justification |
|---|---|---|---|
| `reentrancy-no-eth` | Medium | `_requestRandomness` | L'identifiant de requête n'est connu qu'après l'appel au coordinateur, d'où l'écriture de `vrfRequestId` et `roundByRequestId` après l'appel. Le coordinateur Chainlink est un contrat de confiance, le statut passe à `Drawing` avant l'appel, et les deux appelants (`requestDraw`, `retryDraw`) sont `nonReentrant` |
| `reentrancy-benign` | Low | `_requestRandomness` | Même cause, sans effet sur des fonds |
| `reentrancy-events` | Low | `_requestRandomness` | `DrawRequested` est émis après l'appel, pour porter le `requestId` |
| `timestamp` | Low | `isExpiredWithoutDraw` | Délais de plusieurs heures, insensibles à une dérive de quelques secondes |
| `timestamp` | Low | `isDrawReady` | Idem |
| `timestamp` | Low | `performUpkeep` | Idem, par les deux prédicats |
| `timestamp` | Low | `_buyTickets` | Comparaison à `endTime` |
| `timestamp` | Low | `retryDraw` | Comparaison à `drawRequestedAt + drawTimeout` |

Aucun constat n'est trié pour `BlockLuckyPOAP` : la base ne concerne que `BlockLucky`.

> [!NOTE]
> Les descriptions consignées citent des numéros de ligne de `BlockLucky.sol` (par exemple `#343-366` pour `_requestRandomness`), qui correspondent au fichier actuel. Une modification qui déplace ces fonctions peut faire réapparaître les constats comme nouveaux : relancer alors `npm run slither`, vérifier qu'il s'agit des mêmes, et mettre à jour la base de triage.

Slither n'a pas été relancé pour la rédaction de cette page, qui s'appuie sur la base de triage et sur la CI.

## Ce qui n'a pas été fait

- **Pas d'audit externe.** Les contrats n'ont été relus que par l'équipe et les outils automatiques.
- **Pas de vérification formelle** ni de tests d'invariants avec état sur des séquences d'appels ; le fuzzing porte sur des scénarios fixes aux paramètres aléatoires.
- **Pas de multisignature** pour l'administrateur ni pour le propriétaire dans les scripts : un seul compte détient ces pouvoirs.

Ces points, et d'autres, sont repris dans [Limites connues](limites.md).
