# Tests, fuzzing et couverture

Les contrats sont couverts par 47 tests : 43 tests TypeScript (Mocha, Chai et ethers v6) et 4 tests de fuzzing écrits en Solidity, exécutés 256 fois chacun avec des entrées aléatoires. La couverture des lignes des deux contrats de production est de 100 %, et la CI échoue en dessous. Les résultats de cette page ont été obtenus en lançant les commandes du projet sur la branche `marceau`, avec Node.js 22.

## Commandes

Depuis `smart-contract/`, après `npm ci` :

| Commande | Ce qu'elle lance |
|---|---|
| `npm test` | `hardhat test` : les tests Solidity de `test/*.t.sol`, puis les tests Mocha de `test/*.test.ts` |
| `npm run test:coverage` | Les mêmes tests avec instrumentation, rapport dans `coverage/` (`lcov.info` et `html/`) |
| `npm run coverage:check` | [`scripts/check-coverage.mjs`](src:smart-contract/scripts/check-coverage.mjs) : échoue si un contrat de production passe sous le seuil |
| `npm run test:gas` | `hardhat test mocha --gas-stats` : tableau de gaz par fonction |
| `npm run lint` | solhint, zéro avertissement |
| `npm run typecheck` | Compilation puis `tsc --noEmit` sur les scripts et les tests |

Dans la CI ([`.github/workflows/ci.yml`](src:.github/workflows/ci.yml), job `contracts`), l'ordre est : `npm ci`, `npm audit --omit=dev --audit-level=critical`, `npm run typecheck`, `npm run lint`, `npm run test:coverage`, `npm run coverage:check`, `node scripts/export-abi.mjs --check`, `npm run slither`. Voir [Intégration continue](../infrastructure/ci.md).

## Organisation

| Fichier | Contenu |
|---|---|
| [`test/fixtures.ts`](src:smart-contract/test/fixtures.ts) | Déploiement du mock VRF, création et financement d'un abonnement, déploiement de `BlockLucky` et `BlockLuckyPOAP`, constantes partagées |
| [`test/BlockLucky.test.ts`](src:smart-contract/test/BlockLucky.test.ts) | 38 tests de la loterie, en onze groupes |
| [`test/BlockLuckyPOAP.test.ts`](src:smart-contract/test/BlockLuckyPOAP.test.ts) | 5 tests du badge |
| [`test/BlockLucky.t.sol`](src:smart-contract/test/BlockLucky.t.sol) | 4 tests de fuzzing, base `forge-std/Test.sol` |
| [`contracts/test/ReentrantPlayer.sol`](src:smart-contract/contracts/test/ReentrantPlayer.sol) | Attaquant par réentrance |
| [`contracts/test/RejectingPlayer.sol`](src:smart-contract/contracts/test/RejectingPlayer.sol) | Participant qui refuse les ethers |

### Fixture de référence

`deployLotteryFixture` déploie `VRFCoordinatorV2_5Mock`, crée un abonnement financé de 1 000 unités, puis `BlockLucky` avec une configuration volontairement petite pour atteindre les limites rapidement :

| Paramètre | Valeur de test |
|---|---|
| `ticketPrice` | 0,01 ETH |
| `maxTickets` | 20 |
| `minTicketsToDraw` | 2 |
| `maxTicketsPerPlayer` | 10 |
| `duration` | 48 heures |
| `feeBps` | 1 000 |
| `drawTimeout` | 24 heures |

Les comptes Hardhat sont nommés `deployer`, `admin`, `treasury`, `alice`, `bob`, `carol` et `outsider`. Chaque test repart d'un instantané grâce à `loadFixture`, et avance le temps avec `time.increase`. La fixture `readyToDrawFixture` fait acheter 3 tickets à Alice, 5 à Bob et 2 à Carol (0,1 ETH au total), puis avance de 48 heures : le tour est tirable. Avec le mot aléatoire `5`, c'est Bob qui gagne (tickets 3 à 7).

## Tests TypeScript de BlockLucky

| Groupe | Tests | Ce qui est vérifié |
|---|---|---|
| Déploiement | 3 | Ouverture du tour 1 avec la configuration fournie ; trois rôles accordés à l'administrateur ; refus d'une adresse nulle et de six configurations de tour invalides plus un `callbackGasLimit` trop bas |
| Achat de tickets | 7 | `TicketsPurchased` et contribution ; cadeau (le bénéficiaire détient, le payeur est remboursé) ; montant inexact et quantité nulle ; plafond par joueur ; plafond du tour (`RoundSoldOut` avec 1 restant) ; achat après la fin ; envoi direct d'ethers refusé |
| Tirage au sort | 6 | Pas de tirage avant la fin ni sous le minimum ; tirage dès que le tour est complet ; tirage ouvert à tous qui verrouille les achats ; gagnant, cagnotte, commission et tour suivant ; modulo avec `MaxUint256` ; réponse VRF ignorée après annulation |
| Versement de la cagnotte | 5 | Retrait de la cagnotte nette ; refus d'un second retrait et d'un autre joueur ; refus sur un tour non terminé ; commission versée uniquement à la trésorerie ; retrait possible en pause |
| Annulation et remboursement | 3 | Annulation d'un tour expiré et remboursement ; annulation d'urgence pendant le tirage ; refus de remboursement d'un tour non annulé |
| Relance du tirage | 1 | `DrawNotStale` avant le délai, nouvelle requête après, ancienne réponse ignorée, nouvelle réponse acceptée |
| Cas limites | 5 | `retryDraw` sans tirage en cours ; gagnant, payeur et trésorerie qui refusent les ethers sans perte de fonds ; `supportsInterface` |
| Attaques par réentrance | 2 | Réentrance tentée et bloquée sur `claimPrize` et sur `claimRefund` |
| Pause d'urgence | 1 | `pause` réservée à `PAUSER_ROLE`, achat refusé en pause (`EnforcedPause`), reprise après `unpause` |
| Administration | 2 | Nouvelle configuration appliquée au tour suivant seulement ; changement de trésorerie et de configuration VRF, refus des valeurs invalides |
| Chainlink Automation | 3 | `checkUpkeep` et `performUpkeep` pour un tirage, une annulation, et en pause |

Le titre du test de pause annonce « suspend les achats et le tirage », mais seul l'achat est vérifié. Le refus de `requestDraw` en pause est vérifié indirectement, par le test Automation en pause.

Les cinq tests du badge sont décrits dans [Badge POAP](poap.md#tests).

## Tests de fuzzing Solidity

`BlockLuckyFuzzTest` déploie sa propre loterie : 0,01 ETH le ticket, 200 tickets, minimum 1, 50 par joueur, 2 jours, 10 % de commission. La fonction `_buy(seed, players)` génère entre 1 et 8 joueurs à partir de la graine, chacun achetant entre 1 et 20 tickets.

| Test | Entrées aléatoires | Propriété vérifiée |
|---|---|---|
| `testFuzz_PrizeAndFeeMatchCollectedFunds` | Graine, nombre de joueurs, mot aléatoire | Statut `Completed` ; `ticketCount` et `totalCollected` exacts ; `prize + accruedFees == collected` ; commission égale à 10 % arrondi à l'inférieur ; ticket gagnant inférieur au nombre vendu ; gagnant égal au détenteur du ticket ; solde du contrat égal au total collecté |
| `testFuzz_ClaimsEmptyTheContractExactly` | Graine, nombre de joueurs, mot aléatoire | Après `claimPrize` et `withdrawFees`, le gagnant a reçu la cagnotte, la trésorerie la commission, et le solde du contrat vaut exactement 0 |
| `testFuzz_RefundsReturnEveryContribution` | Graine, nombre de joueurs | Après `cancelRound` et un `claimRefund` par joueur, le total remboursé égale le total collecté et le solde vaut 0 |
| `testFuzz_RejectsAnyIncorrectPayment` | Quantité, montant envoyé | Tout montant différent de `PRICE * quantity` revert avec `IncorrectPayment(attendu, reçu)` |

Ces tests vérifient une propriété de conservation : aucun wei n'est créé ni perdu entre les mises, la cagnotte, la commission et les remboursements.

## Résultat de npm test

Sortie obtenue, en omettant les avertissements de compilation des dépendances OpenZeppelin 4.9.6 tirées par Chainlink :

```text
Compiled 6 Solidity files with solc 0.8.34 (evm target: prague)

Running Solidity tests

  test/BlockLucky.t.sol:BlockLuckyFuzzTest
    ✓ testFuzz_RejectsAnyIncorrectPayment(uint32,uint256) (runs: 256)
    ✓ testFuzz_RefundsReturnEveryContribution(uint256,uint8) (runs: 256)
    ✓ testFuzz_PrizeAndFeeMatchCollectedFunds(uint256,uint8,uint256) (runs: 256)
    ✓ testFuzz_ClaimsEmptyTheContractExactly(uint256,uint8,uint256) (runs: 256)

Running Mocha tests

  BlockLucky
    Déploiement
      ✓ ouvre le premier tour avec la configuration fournie (378ms)
      ✓ attribue les rôles d'administration à la Mairie
      ✓ refuse une configuration incohérente ou une adresse nulle (127ms)
    Achat de tickets
      ✓ enregistre l'achat, la contribution et émet TicketsPurchased (40ms)
      ✓ permet d'offrir des tickets : le bénéficiaire les détient, le payeur est remboursable (40ms)
      ✓ refuse un montant inexact ou une quantité nulle
      ✓ applique la limite de tickets par joueur
      ✓ refuse les achats au-delà du nombre maximal de tickets
      ✓ refuse les achats après la fin du tour
      ✓ refuse tout envoi direct d'ethers hors achat

  43 passing (1s)

47 passing (4 solidity, 43 mocha)
```

La sortie complète liste les 43 tests Mocha ; l'extrait ci-dessus en montre le début. L'ensemble s'exécute en quelques secondes.

## Couverture

`npm run test:coverage` affiche :

```text
╔═════════════════════════════════════════════════════════════════════════════╗
║ File Coverage                                                               ║
╟────────────────────────────────────┬────────┬─────────────┬─────────────────╢
║ File Path                          │ Line % │ Statement % │ Uncovered Lines ║
╟────────────────────────────────────┼────────┼─────────────┼─────────────────╢
║ contracts\BlockLucky.sol           │ 100.00 │ 100.00      │ -               ║
║ contracts\BlockLuckyPOAP.sol       │ 100.00 │ 100.00      │ -               ║
║ contracts\test\ReentrantPlayer.sol │ 78.57  │ 81.25       │ 41, 45, 49      ║
║ contracts\test\RejectingPlayer.sol │ 100.00 │ 100.00      │ -               ║
╟────────────────────────────────────┼────────┼─────────────┼─────────────────╢
║ Total                              │ 98.56  │ 98.64       │                 ║
╚════════════════════════════════════╧════════╧═════════════╧═════════════════╝
```

Les lignes non couvertes de `ReentrantPlayer.sol` sont les deux affectations `reentrySucceeded = true` (lignes 45 et 49), qui ne s'exécuteraient que si la réentrance réussissait, et la ligne 41, le retour anticipé de `receive`. Leur non-exécution est le résultat attendu ; ce contrat de test est de toute façon exclu du seuil.

`npm run coverage:check` lit ensuite `coverage/lcov.info`, ne retient que les fichiers sous `contracts/` hors `contracts/test/`, et compare la part de lignes couvertes au seuil `COVERAGE_MIN_LINES` (100 par défaut) :

```text
OK  contracts/BlockLucky.sol : 100.00 % des lignes couvertes (171/171, seuil 100 %)
OK  contracts/BlockLuckyPOAP.sol : 100.00 % des lignes couvertes (19/19, seuil 100 %)
```

Le script sort en erreur si un contrat passe sous le seuil, ou si le rapport ne contient aucun contrat (couverture non lancée). Le rapport HTML détaillé est écrit dans `smart-contract/coverage/html/`, ignoré par Git.

> [!NOTE]
> La couverture mesurée est celle des lignes et des instructions, pas des branches. Une ligne `if (a || b) revert` est couverte dès qu'elle est exécutée, même si une seule des conditions a été testée. Par exemple, `_validateRoundConfig` n'est pas testée avec `maxTickets` nul ni avec `maxTicketsPerPlayer` nul.

## Rapport de gaz

`npm run test:gas` instrumente les tests Mocha. Extrait pour `BlockLucky` (en gaz, appels réels des tests) :

| Fonction | Min | Moyenne | Max | Appels |
|---|---|---|---|---|
| `buyTickets` | 119 577 | 201 786 | 356 745 | 29 |
| `buyTicketsFor` | 176 863 | 176 863 | 176 863 | 1 |
| `requestDraw` | 213 306 | 213 306 | 213 306 | 11 |
| `retryDraw` | 193 634 | 193 634 | 193 634 | 1 |
| `performUpkeep` | 142 501 | 178 669 | 214 837 | 2 |
| `closeExpiredRound` | 138 484 | 138 484 | 138 484 | 3 |
| `cancelRound` | 140 126 | 140 315 | 140 503 | 4 |
| `claimPrize` | 42 456 | 42 456 | 42 456 | 3 |
| `claimRefund` | 35 480 | 35 480 | 35 480 | 3 |
| `withdrawFees` | 39 361 | 39 361 | 39 361 | 1 |
| `pause` | 47 027 | 47 027 | 47 027 | 3 |
| `unpause` | 25 170 | 25 170 | 25 170 | 1 |
| `setRoundConfig` | 36 660 | 36 660 | 36 660 | 1 |
| `setVrfConfig` | 35 782 | 35 782 | 35 782 | 1 |
| `setTreasury` | 30 982 | 30 982 | 30 982 | 2 |

| Contrat | Déploiement | Taille du bytecode |
|---|---|---|
| `BlockLucky` | 3 181 201 gaz | 12 474 octets |
| `BlockLuckyPOAP` | 1 487 605 gaz | 5 909 octets |

Pour `BlockLuckyPOAP`, `mintBadge` coûte de 108 864 à 143 064 gaz et `setBaseUri` 31 991 gaz.

Lecture des chiffres :

- **L'achat domine le coût pour le citoyen.** Il croît avec la quantité, car chaque ticket est une entrée de tableau. Par extrapolation, un achat de 100 tickets, le plafond par défaut, coûterait de l'ordre de 2,5 à 3 millions de gaz ; ce cas n'est pas mesuré par les tests. La dotation de bienvenue doit couvrir ces frais (voir [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md)).
- **Le tirage coûte environ 213 000 gaz** à celui qui l'appelle, ici l'opérateur ; la réponse VRF, payée par l'abonnement, n'est pas mesurée par ce rapport car elle est exécutée par le mock.
- **Les retraits sont bon marché**, moins de 43 000 gaz.
- Les fonctions de lecture (`getRound`, `isDrawReady`…) apparaissent aussi dans le rapport, mais ne coûtent rien hors transaction.

## Ce qui n'est pas testé ici

- L'intégration avec le backend sur une vraie chaîne fait l'objet d'un job CI distinct (`chain`), qui construit l'image Docker du nœud et lance `npm run test:chain` dans `backend/` : voir [Tests sur une vraie chaîne](../integration-blockchain/tests.md).
- Les scripts de déploiement ne sont pas testés automatiquement ; `deploy-local.ts` est exercé à chaque démarrage du conteneur `blockchain`, `deploy-sepolia.ts` ne l'est pas.
- Le vrai coordinateur Chainlink n'est jamais appelé par les tests.
