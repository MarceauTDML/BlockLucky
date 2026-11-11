# Portefeuille et loterie

Sur mobile comme sur le web, le citoyen n'a pas de portefeuille à installer ni à connecter. Il n'y a ni MetaMask, ni WalletConnect, ni clé privée sur le téléphone. Le backend crée à l'inscription un portefeuille Ethereum intégré, chiffre sa clé, le crédite d'une dotation de bienvenue en ethers fictifs et signe chaque transaction pour le compte du citoyen. L'application se contente d'appeler l'API, d'afficher l'adresse, le solde et les reçus, et d'ouvrir l'explorateur de blocs.

Le fonctionnement serveur est décrit dans [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md) et [Passerelle du contrat et erreurs](../integration-blockchain/passerelle.md). La version web de cette page est [Portefeuille et loterie du web](../web/portefeuille-loterie.md).

## Mode onchain et mode démonstration

| Indice | Source | Utilisé par |
|---|---|---|
| `guarantees.simulated` | `GET /lottery/status` | `BuyTicketScreen`, `LiveDrawScreen` (textes et masquage du retrait) |
| `guarantees.paused` | `GET /lottery/status` | `BuyTicketScreen` (boutons désactivés et avertissement) |
| `mode` | `GET /lottery/wallet` | `IntegratedWalletCard` : badge « Mode démonstration » si `mode !== 'onchain'` |
| `explorerUrl`, `etherscanUrl`, `blockchain.lotteryExplorerUrl` | portefeuille, tickets, retrait, statut | `ExplorerLink`, qui ne s'affiche que si l'URL existe |

En mode `simulated`, les URL d'explorateur sont `null` : aucun lien n'apparaît et l'interface signale le mode démonstration. Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

## Composants

Ils sont dans [`mobile-app/src/components/web3`](src:mobile-app/src/components/web3) et [`mobile-app/src/components/lottery`](src:mobile-app/src/components/lottery).

### IntegratedWalletCard

[`IntegratedWalletCard.tsx`](src:mobile-app/src/components/web3/IntegratedWalletCard.tsx) appelle `useGetWalletQuery()` et affiche :

| Élément | Donnée |
|---|---|
| Titre « Portefeuille BlockLucky intégré » | fixe |
| Étiquette « Mode démonstration » | si le portefeuille existe et que `mode` n'est pas `onchain` |
| Adresse raccourcie (6 caractères de chaque côté) | `walletAddress`, ou la prop `fallbackAddress`, ou « Création en cours... » |
| Solde | `balanceEth` formaté par `formatEthBalance`, sinon « Chargement du solde... », « Solde momentanément indisponible » ou « Solde non disponible » |
| Explication | Transactions signées par ce portefeuille conservé par BlockLucky, prix et frais réglés avec la dotation de bienvenue |
| `ExplorerLink` | `explorerUrl` |

Le composant est utilisé dans `BuyTicketScreen` et `ProfileScreen`.

### IntegratedWalletButton

[`IntegratedWalletButton.tsx`](src:mobile-app/src/components/web3/IntegratedWalletButton.tsx) est la pastille compacte de l'en-tête de l'accueil. Il reçoit ses données en props : `walletAddress`, `balanceEth`, `providerLabel` et `onPress`. Il affiche une pastille de couleur (primaire si l'adresse existe), le libellé, l'adresse raccourcie ou « Création en cours », et le solde s'il est connu. Sur l'accueil, `HomeScreen` lui passe l'adresse et le solde de `GET /lottery/wallet` et l'appui ouvre `TransactionHistory`.

Il remplace `WalletConnectButton`, supprimé, dont le libellé « Connecter » évoquait un portefeuille externe.

### ExplorerLink

[`ExplorerLink.tsx`](src:mobile-app/src/components/web3/ExplorerLink.tsx) est un bouton texte qui appelle `Linking.openURL(url)` et ignore l'échec éventuel. Il ne rend rien si `url` est vide. Utilisations :

| Écran ou composant | URL |
|---|---|
| `IntegratedWalletCard` | adresse du portefeuille |
| `HomeScreen` | contrat de loterie (`blockchain.lotteryExplorerUrl`) |
| `BuyTicketScreen` | transaction d'achat ou de cadeau |
| `TicketCard` (historique) | transaction du ticket |
| `WinnerClaimCard` | transaction de retrait |

Le lien s'ouvre dans le navigateur du téléphone, en dehors de l'application.

### WinnerClaimCard

[`mobile-app/src/components/lottery/WinnerClaimCard.tsx`](src:mobile-app/src/components/lottery/WinnerClaimCard.tsx) reçoit `contractRoundId` et `prizePool`. Contrairement au web, il ne décide pas lui-même s'il doit s'afficher : c'est `LiveDrawScreen` qui le monte quand trois conditions sont réunies.

| Condition | Calcul dans `LiveDrawScreen` |
|---|---|
| Un gagnant est connu | `lastWinnerAnnouncement`, sinon `round.winnerWallet` si le tour est `COMPLETED` |
| C'est le compte connecté | Adresse du gagnant égale, en minuscules, à celle de `GET /lottery/wallet` ou de `user.walletAddress` |
| Le mode est réel | `guarantees.simulated` faux |

La carte affiche « Félicitations, vous avez gagné ! » avec la cagnotte, puis un bouton « Retirer mes gains » qui appelle `claimPrize(contractRoundId)`. Selon le résultat :

| Résultat | Affichage |
|---|---|
| `CLAIMED` | Message avec le nouveau solde, lien vers la transaction, bouton masqué |
| `ALREADY_CLAIMED` | « Cagnotte déjà versée sur votre portefeuille », bouton masqué |
| `FAILED` | Message d'erreur, bouton conservé pour un nouvel essai |

L'état est réinitialisé si `contractRoundId` change. La carte n'apparaît que sur l'écran du tirage, pas sur l'accueil.

## Le hook useCitizenWallet

[`mobile-app/src/hooks/useCitizenWallet.ts`](src:mobile-app/src/hooks/useCitizenWallet.ts) est l'équivalent mobile de `useBlockLuckyWallet`.

| Membre | Rôle |
|---|---|
| `purchaseTickets(quantity, retryAttempt)` | `POST /lottery/buy` ; en cas de succès, met à jour les points et ouvre « Points crédités » ; renvoie la réponse ou `null` |
| `sendGiftTicket(recipientEmail, personalMessage)` | `POST /lottery/gift` ; met à jour les points de l'expéditeur ; renvoie la réponse ou `null` |
| `claimPrize(contractRoundId)` | `POST /lottery/claim-prize` ; renvoie `{ status: 'CLAIMED' \| 'ALREADY_CLAIMED' \| 'FAILED', data?, message? }` |
| `generateDeterministicWallet(seed)` | Adresse factice calculée depuis l'email, envoyée au login et ignorée par le backend à la création du compte |
| `isBuying`, `isGifting`, `isClaiming` | États de chargement des mutations |

Le hook n'envoie aucun événement analytique, contrairement au web.

### Messages d'erreur

`describeBlockchainError(err)` lit `err.status` et les détails dans `err.data.errors` (ou `err.data.details`) :

| Condition | Titre | Message |
|---|---|---|
| `status === 402` ou `contractError === 'InsufficientFunds'` | Solde insuffisant | Le portefeuille ne contient pas assez d'ethers fictifs pour le ticket et les frais de réseau |
| `status === 503` et `circuitBreaker` | Loterie en pause | Message du backend ou texte de repli sur la pause de sécurité |
| `status === 409` | Opération impossible | Message du backend (tour fermé, expiré, complet...) |
| autre | aucun | la fonction renvoie `null` |

`purchaseTickets` applique ensuite cet ordre :

1. `status === 429` : feuille « File d'attente active » (position 245 fixe) ;
2. erreur reconnue par `describeBlockchainError` : feuille d'information avec son titre et son message ;
3. `status === 503` ou `canRetry` : feuille « Réseau encombré » avec le bouton « Réessayer l'achat » ;
4. sinon : rapport local `sentryClient.captureException` et feuille « Oups, réseau instable ».

`sendGiftTicket` utilise `describeBlockchainError`, puis une feuille « Envoi différé ». `claimPrize` distingue d'abord `409` avec `PrizeAlreadyClaimed` (déjà versé) et `403` (« Ce portefeuille n'est pas le gagnant de ce tour »), puis `describeBlockchainError`, puis un message générique.

Différences avec le web à connaître :

- les titres et messages de `describeBlockchainError` et des feuilles de `purchaseTickets` sont en français seulement, sans `t()` ;
- aucune erreur n'invalide le cache : après une pause ou un solde insuffisant, le statut et le solde ne sont pas rechargés automatiquement ;
- la feuille « Réseau encombré » relance un seul ticket, quelle que soit la quantité initiale (voir [État et appels API](etat-api.md#slice-ui)).

## Billetterie

[`BuyTicketScreen.tsx`](src:mobile-app/src/screens/lottery/BuyTicketScreen.tsx) propose deux modes, « pour moi » et « cadeau ». Le mode cadeau est actif d'emblée si l'écran est ouvert avec `giftMode: true`, ce que fait le bouton « Offrir un ticket » de l'accueil.

| Mode | Contenu | Action |
|---|---|---|
| Pour moi | Choix de 1, 2, 5 ou 10 tickets, prix unitaire de `round.ticketPriceEth` (repli 0,01), total | `purchaseTickets(quantity, 0)` puis message « n ticket(s) enregistré(s) sur la blockchain (+n pts) » avec le solde restant (`walletBalanceEth`) et un lien vers la transaction |
| Cadeau | Email du destinataire (`isValidEmail`), message personnel prérempli | `sendGiftTicket` puis « Ticket envoyé à... Vous avez reçu +n pts » et un lien vers la transaction |

Les boutons sont désactivés quand `guarantees.paused` est vrai. `IntegratedWalletCard` est affiché en tête et un lien mène à l'historique.

Par rapport au web, l'écran n'a ni case « Je comprends que j'engage des ethers fictifs », ni rappel du plafond de jeu responsable, ni reçu à deux états, et il ne désactive pas l'achat quand le tour n'est pas `OPEN` : c'est alors le backend qui répond 409.

L'accueil propose aussi « Acheter 1 ticket avec mon portefeuille », qui appelle `purchaseTickets(1, 0)` puis relance `GET /lottery/status`.

## Tirage en direct

[`LiveDrawScreen.tsx`](src:mobile-app/src/screens/lottery/LiveDrawScreen.tsx) affiche la salle d'attente (`onlineWaitingUsers`), `WinnerClaimCard` dans les conditions vues plus haut, la roue (`RouletteAnimation`), un bloc « Certification Chainlink VRF v2.5 » ou « Mode démonstration », et la discussion (`ChatBox`). Il appelle `useSocket(round.id)` pour rejoindre la salle du tour (voir [Temps réel et notifications](temps-reel-notifications.md)).

Le bouton « Simuler la roue de tirage » lance seulement l'animation pendant 3,5 secondes ; il ne tire aucun gagnant. Le statut de la loterie n'est pas interrogé périodiquement : la fin du tirage n'apparaît que par l'événement `draw:winner` ou à la réouverture de l'écran.

## Historique et POAP

`TransactionHistoryScreen` appelle `GET /lottery/my-tickets` et affiche les tickets avec `TicketCard` (lien vers la transaction) et les badges avec `POAPBadge`. Le visuel du badge est chargé depuis `badge.imageUrl` avec `SvgUri` de `react-native-svg` ; en cas d'échec, un repli textuel s'affiche. Les badges sont décrits dans [Badge POAP](../smart-contracts/poap.md).
