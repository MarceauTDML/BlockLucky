# Portefeuille et loterie

Sur mobile comme sur le web, le citoyen n'a pas de portefeuille à installer ni à connecter. Il n'y a ni MetaMask, ni WalletConnect, ni clé privée sur le téléphone. Le backend crée à l'inscription un portefeuille Ethereum intégré, chiffre sa clé, le crédite d'une dotation de bienvenue de 0,5 ETH fictif (`WELCOME_GRANT_WEI`) et signe chaque transaction pour le compte du citoyen. L'application se contente d'appeler l'API, d'afficher le solde, le ticket et les reçus, et d'ouvrir l'explorateur de blocs.

Le fonctionnement serveur est décrit dans [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md) et [Passerelle du contrat et erreurs](../integration-blockchain/passerelle.md). La version web de cette page est [Portefeuille et loterie du web](../web/portefeuille-loterie.md).

## Règles du grand tirage

| Règle | Source | Effet dans l'application |
|---|---|---|
| Un seul ticket par participant et par grand tirage | `MAX_TICKETS_PER_PLAYER` (1 par défaut) au déploiement du contrat, contrôle du backend, quantité limitée à 1 par `buyTicketSchema` | Aucun choix de quantité ; une fois le ticket acheté, le bouton affiche « Ticket déjà validé » |
| Un cadeau compte comme le ticket du destinataire | Backend : 409 « Cette personne a déjà son ticket pour ce grand tirage. » | Fenêtre d'information dédiée |
| Numéro de ticket sur 5 chiffres | `ticketNumber` des réponses (index du ticket plus un, complété par des zéros) | Affiché sur la carte du ticket, la roue et les résultats |
| Phases du tour | `round.phase` de `GET /lottery/status` : `OPEN`, `WAITING_ROOM`, `DRAWING`, `COMPLETED`, `CANCELLED` | Bouton d'achat, accès à la salle, écran du tirage |
| Délai de révélation | `round.revealAt`, calculé avec `DRAW_REVEAL_DELAY_SECONDS` (600 par défaut) | Compte à rebours de la salle d'attente |
| Âge vérifié | `AGE_VERIFICATION_REQUIRED` côté backend | Fenêtre qui mène à `VerifyAge` (voir [Vérification d'âge requise](#verification-d-age-requise)) |

[`lotteryFormat.ts`](src:mobile-app/src/components/lottery/lotteryFormat.ts) et [`drawFormat.ts`](src:mobile-app/src/components/draw/drawFormat.ts) regroupent les calculs partagés : `resolvePhase` déduit la phase de `status` et `inWaitingRoom` si le backend ne la fournit pas, `resolveParticipants` lit `participants` et `maxParticipants` du tour, `purchaseDeadline` renvoie `waitingRoomOpensAt` ou `drawTargetTime`, et `findCurrentRoundTicket` retrouve le ticket du tour courant dans `GET /lottery/my-tickets`.

## Mode onchain et mode démonstration

| Indice | Source | Utilisé par |
|---|---|---|
| `guarantees.simulated` | `GET /lottery/status` | `LiveDrawScreen` (masquage du retrait des gains), `HowItWorksScreen` (certification VRF) |
| `balanceEth` | `GET /lottery/wallet` | Accueil, billetterie, cadeau, profil |
| `etherscanUrl`, `explorerUrl`, `blockchain.lotteryExplorerUrl` | tickets, portefeuille, badges, statut | `TransactionHistoryScreen` et `HowItWorksScreen`, qui n'affichent le lien que si l'URL existe |

En mode `simulated`, les URL d'explorateur sont `null` et aucun lien n'apparaît. Depuis la refonte, aucun écran n'affiche plus d'étiquette « Mode démonstration » : seule `IntegratedWalletCard`, qui n'est plus utilisée, savait le faire. Le mode simulé ne renvoie pas non plus de solde en ETH : `walletService.balanceOf` renvoie `null`, donc `balanceEth` vaut `null`, la tuile « ETH fictifs » du profil disparaît, et la billetterie considère le solde comme suffisant (`sufficient` vaut vrai quand le solde est inconnu). Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

## Composants web3

Les trois composants de [`mobile-app/src/components/web3`](src:mobile-app/src/components/web3) n'ont plus d'appelant depuis la refonte de l'interface. Ils sont conservés dans le dépôt.

| Composant | Rôle d'origine |
|---|---|
| [`IntegratedWalletCard.tsx`](src:mobile-app/src/components/web3/IntegratedWalletCard.tsx) | Carte « Portefeuille BlockLucky intégré » : adresse raccourcie, solde, étiquette « Mode démonstration », lien vers l'explorateur |
| `IntegratedWalletButton` | Pastille compacte de l'ancien en-tête de l'accueil (voir ci-dessous) |
| [`ExplorerLink.tsx`](src:mobile-app/src/components/web3/ExplorerLink.tsx) | Bouton texte qui appelle `Linking.openURL(url)`, utilisé seulement par `IntegratedWalletCard` |

### IntegratedWalletButton

[`IntegratedWalletButton.tsx`](src:mobile-app/src/components/web3/IntegratedWalletButton.tsx) reçoit `walletAddress`, `balanceEth`, `providerLabel` et `onPress`. Il remplaçait `WalletConnectButton`, supprimé, dont le libellé « Connecter » évoquait un portefeuille externe. L'accueil actuel affiche à sa place le logo et le bouton des notifications ; le solde est visible sur le profil, la billetterie et l'historique.

Les écrans ouvrent désormais l'explorateur directement avec `Linking.openURL`, dans le navigateur du téléphone.

## Le hook useCitizenWallet

[`mobile-app/src/hooks/useCitizenWallet.ts`](src:mobile-app/src/hooks/useCitizenWallet.ts) est l'équivalent mobile de `useBlockLuckyWallet`. Les fonctions d'achat et de cadeau renvoient un résultat typé au lieu d'ouvrir elles-mêmes des fenêtres : c'est l'écran qui choisit l'affichage.

| Membre | Rôle |
|---|---|
| `purchaseTickets(retryAttempt)` | `POST /lottery/buy` avec `quantity: 1` ; met à jour les points ; renvoie `SUCCESS`, `ALREADY_OWNED`, `AGE_REQUIRED` ou `FAILED` |
| `sendGiftTicket(recipientEmail, personalMessage)` | `POST /lottery/gift` ; met à jour les points de l'expéditeur ; mêmes résultats |
| `retryPurchaseFromQueue(retryAttempt)` | Relance l'achat depuis la fenêtre globale « Réseau encombré » et ouvre la fenêtre suivante selon le résultat |
| `claimPrize(contractRoundId)` | `POST /lottery/claim-prize` ; renvoie `{ status: 'CLAIMED' \| 'ALREADY_CLAIMED' \| 'FAILED', data?, message? }` |
| `generateDeterministicWallet(seed)` | Ancienne adresse factice calculée depuis l'email, plus appelée |
| `isBuying`, `isGifting`, `isClaiming` | États de chargement des mutations |

Le hook n'envoie aucun événement analytique, contrairement au web, et n'envoie pas d'en-tête `Idempotency-Key`.

### Messages d'erreur

`classifyTicketError(err, alreadyOwnedMessage)` lit `err.status` et les détails dans `err.data.errors` (ou `err.data.details`), dans cet ordre :

| Condition | Résultat | Message |
|---|---|---|
| `403` et `code === 'AGE_VERIFICATION_REQUIRED'` | `AGE_REQUIRED` | Message du backend, « Vérifiez votre âge pour jouer. » |
| `409` avec `contractError === 'PlayerLimitReached'` ou sans `contractError` | `ALREADY_OWNED` | Message du backend, sinon « Vous avez déjà votre ticket pour ce grand tirage. » ou son équivalent pour un cadeau |
| `429` | `FAILED`, `queued` | « Forte affluence » |
| reconnu par `describeBlockchainError` | `FAILED` sans nouvel essai | Titre et message de la table suivante |
| `503`, `canRetry`, absence de statut ou `FETCH_ERROR` | `FAILED`, `canRetry` | « L'achat n'a pas abouti. » et message du backend |

`describeBlockchainError(err)` traduit trois cas :

| Condition | Titre | Message |
|---|---|---|
| `status === 402` ou `contractError === 'InsufficientFunds'` | Solde insuffisant | Le portefeuille ne contient pas assez d'ethers fictifs pour le ticket et les frais de réseau |
| `status === 503` et `circuitBreaker` | Loterie en pause | Message du backend ou texte de repli sur la pause de sécurité |
| `status === 409` | Opération impossible | Message du backend |

Les échecs non relançables sont aussi enregistrés par `sentryClient.captureException`. `claimPrize` distingue d'abord `409` avec `PrizeAlreadyClaimed` (déjà versé) et `403` (« Ce portefeuille n'est pas le gagnant de ce tour »), puis `describeBlockchainError`, puis un message générique.

Points à connaître :

- un 409 sans `contractError`, par exemple « Ce tour est terminé, le tirage va être lancé. » en mode simulé, est classé `ALREADY_OWNED` : le message du backend s'affiche, mais dans la fenêtre prévue pour un ticket déjà acheté ;
- les titres et messages du hook sont en français seulement, sans `t()`.

### Vérification d'âge requise

Quand le backend répond 403 avec `errors.code === 'AGE_VERIFICATION_REQUIRED'`, la billetterie, le cadeau, le détail d'une récompense et le ticket à gratter ouvrent une fenêtre qui propose d'aller à `VerifyAge`. Pour la boutique, la détection est faite par `isAgeVerificationError` de [`apiErrors.ts`](src:mobile-app/src/components/marketplace/apiErrors.ts). L'envoi de la pièce d'identité est décrit dans [Authentification et stockage sécurisé](authentification.md#verification-d-age).

## Billetterie

[`BuyTicketScreen.tsx`](src:mobile-app/src/screens/lottery/BuyTicketScreen.tsx) achète le ticket unique du grand tirage :

| Élément | Donnée |
|---|---|
| Carte du grand tirage | Cagnotte (`prizePool`), numéro du tour (`#001`), compte à rebours jusqu'à `waitingRoomOpensAt`, participants |
| Récapitulatif | Prix (`round.ticketPriceEth`), solde actuel et solde après achat (`GET /lottery/wallet`) |
| Pied fixe | « Total · 1 ticket », bouton, rappel « En confirmant, vous acceptez le règlement du tirage. » |

Le bouton change de libellé et se désactive dans trois cas : ticket déjà présent dans `GET /lottery/my-tickets` (« Ticket déjà validé »), phase différente de `OPEN` (« Achats clos pour ce tirage ») ou solde connu inférieur au prix (« Solde insuffisant »). Après un succès, une fenêtre confirme le ticket et ses points, puis mène à l'accueil ou à « Mes tickets ». Un échec relançable incrémente `retryAttempt` (5 au plus) pour le nouvel essai.

### Cadeau

[`GiftTicketScreen.tsx`](src:mobile-app/src/screens/lottery/GiftTicketScreen.tsx) offre un ticket à un proche désigné par son email, avec un message facultatif. Les règles de désactivation sont les mêmes (phase, solde). Le backend refuse de s'offrir un ticket à soi-même et un destinataire qui a déjà son ticket. Le paramètre de route `ticketId`, passé depuis « Mes tickets », n'est pas lu par l'écran.

## Accueil et Mes tickets

L'accueil ([`HomeScreen.tsx`](src:mobile-app/src/screens/lottery/HomeScreen.tsx)) rafraîchit le statut toutes les 30 secondes. Selon la phase, la carte du grand tirage propose « Mon ticket · 0,01 ETH » (achat), « Voir mon ticket » si le citoyen a déjà son ticket, « Entrer dans la salle d'attente » en `WAITING_ROOM` ou « Suivre le tirage en direct » en `DRAWING` ; les deux derniers ouvrent `WaitingRoom`. Le compte à rebours vise `revealAt` en salle d'attente et `waitingRoomOpensAt` sinon. `MilestonesPanel` affiche les paliers renvoyés par le backend (5 000, 7 500, 9 000 et 10 000 participants) et `DeadlineCard` l'échéance.

« Mes tickets » ([`MyTicketsScreen.tsx`](src:mobile-app/src/screens/lottery/MyTicketsScreen.tsx)) affiche le ticket du tour courant (`CurrentTicketCard`, avec le délai avant révélation), puis, avec des filtres, les résultats des grands tirages passés (`isWinner`, `winningTicketNumber`, `prizeEth`) et les codes obtenus aux tickets à gratter.

## Salle d'attente

[`WaitingRoomScreen.tsx`](src:mobile-app/src/screens/lottery/WaitingRoomScreen.tsx) interroge le statut toutes les 5 secondes. Dans les 8 dernières secondes du compte à rebours, il joue une fois `chrono.mp3`, sauf si les sons sont coupés dans Affichage.

| Situation | Affichage |
|---|---|
| Phase `WAITING_ROOM` et ticket du citoyen trouvé | Salle active : compte à rebours minutes et secondes jusqu'à `revealAt`, ticket du citoyen et adresse raccourcie, présence (`onlineWaitingUsers`), discussion `RoomChat` |
| Autre phase ou pas de ticket | `WaitingRoomClosed`, avec l'accès à l'achat |
| Phase `DRAWING` ou `COMPLETED`, compte à rebours arrivé à zéro, gagnant annoncé (`draw:winner`) pour le tour suivi, ou tour courant plus récent que celui du ticket | `replace('LiveDraw', { contractRoundId })`, avec le numéro du tour où le citoyen a son ticket |

Sans `revealAt`, le compte à rebours part de `waitingRoomOpensAt` plus `WAITING_ROOM_SECONDS` (600, valeur codée dans `drawFormat.ts`). Les messages d'ambiance changent selon le temps écoulé. La connexion Socket.IO n'est ouverte que lorsque la salle est active (voir [Temps réel et notifications](temps-reel-notifications.md)).

## Tirage en direct

[`LiveDrawScreen.tsx`](src:mobile-app/src/screens/lottery/LiveDrawScreen.tsx) interroge le statut toutes les 4 secondes et rejoint la salle Socket.IO pendant les phases `DRAWING`, `COMPLETED` et `CANCELLED`. Hors tirage, il affiche le dernier tour terminé du citoyen.

Ouvert avec `contractRoundId` depuis la salle d'attente, l'écran suit ce tour même si le contrat en a déjà ouvert un autre : la roue tourne tant que le résultat n'est pas connu (liste des tickets relue toutes les 4 secondes), puis s'arrête sur le numéro gagnant dès que le ticket du citoyen le donne. Sur la blockchain locale, le choix du gagnant et l'ouverture du tour suivant sont quasi immédiats : sans ce suivi, le statut montrait déjà le nouveau tour et la roue n'apparaissait que dans l'historique. La salle d'attente transmet aussi le nombre de participants, le plafond et la cagnotte de ce tour (`participants`, `maxParticipants`, `prizePool`) : l'écran les utilise tant que le statut affiche un autre tour, pour que la roue garde tous ses secteurs jusqu'à l'arrêt au lieu de se vider avec le nouveau tour, encore sans participant.

| Élément | Comportement |
|---|---|
| `DrawWheel` | Roue de 10 secteurs animée avec `Animated` : rotation en boucle pendant le tirage, puis arrêt sur le secteur du numéro gagnant ; le son `roue-tirage.mp3` accompagne la rotation si les sons sont activés (voir [Thème et composants](theme-composants.md#sons)) |
| Étiquettes de la roue | Numéros à 5 chiffres répartis sur le nombre de participants ; le numéro gagnant et celui du citoyen y figurent toujours |
| Résultat | Numéro gagnant, gagné ou perdu (`isWinner` du ticket, ou adresse du gagnant égale à celle du portefeuille), annoncé par `accessibilityLiveRegion` |
| Retrait des gains | Bouton affiché au gagnant si `guarantees.simulated` est faux ; message selon `CLAIMED`, `ALREADY_CLAIMED` ou `FAILED` |
| Tour annulé | Message dédié, sans roue arrêtée |

L'annonce `draw:winner` reçue par le socket est prise en compte si elle concerne le même `contractRoundId`. La roue ne tire rien : le gagnant vient toujours du contrat ou du backend.

## Historique et POAP

[`TransactionHistoryScreen.tsx`](src:mobile-app/src/screens/lottery/TransactionHistoryScreen.tsx) appelle `GET /lottery/wallet` et `GET /lottery/my-tickets`. Il affiche le portefeuille avec un lien vers l'explorateur, les tickets avec leur numéro et le lien vers la transaction, et les badges POAP sous forme de lignes (titre, édition, date de frappe, lien vers l'explorateur). Le visuel SVG des badges n'est plus chargé. Les badges sont décrits dans [Badge POAP](../smart-contracts/poap.md).

## Tickets à gratter

Les tickets à gratter s'achètent en EtherPoints, sans ETH. [`ScratchCardScreen.tsx`](src:mobile-app/src/screens/marketplace/ScratchCardScreen.tsx) a deux usages :

| Ouverture | Comportement |
|---|---|
| `ScratchCard` avec `offer` (`violet` ou `lucky`), ou sans paramètre | Choix de l'offre, confirmation, `POST /marketplace/scratch`, puis zone à gratter sur la récompense tirée au hasard par le backend |
| `ScratchCard` avec `claim` | Révélation d'un code déjà obtenu par `POST /marketplace/claim` depuis `RewardDetail` |

| Offre | Coût affiché | Variable du backend |
|---|---|---|
| Violet | 50 EtherPoints | `SCRATCH_COST_VIOLET` |
| Lucky | 100 EtherPoints | `SCRATCH_COST_LUCKY` |

Les coûts affichés sont codés dans [`scratchOffers.ts`](src:mobile-app/src/components/marketplace/scratchOffers.ts) : si les variables du backend changent, l'application affiche un prix faux, mais c'est le backend qui débite. Après l'achat, le nouveau solde (`newBalance`) est écrit dans le profil par `setPointsBalance`. Les erreurs sont traduites par statut : 402 ou 400 « EtherPoints insuffisants », 404 ou 409 « Aucune récompense disponible », 403 de vérification d'âge vers `VerifyAge`. Une fois le code révélé, l'écran mène à « Mes codes » par `replace('MyCodes')`.
