# Glossaire

Termes métier et techniques employés dans le code et dans cette documentation, par ordre alphabétique. Quand un terme correspond à un nom du code, celui-ci est donné entre crochets de code.

## A

**ABI** (Application Binary Interface). Description JSON des fonctions, événements et erreurs d'un contrat, nécessaire pour l'appeler et décoder ses journaux. Les ABI de `BlockLucky` et `BlockLuckyPOAP` sont copiées dans `backend/src/blockchain/abi/` par `npm run export:abi` ; la CI vérifie qu'elles sont à jour.

**Abonnement VRF.** Compte prépayé chez Chainlink, en LINK ou en ETH, qui paie chaque réponse d'aléa. Le contrat doit y être enregistré comme consommateur. En local, l'abonnement est simulé par `VRFCoordinatorV2_5Mock`. Voir [Tirage Chainlink VRF](../smart-contracts/chainlink-vrf.md).

**ADR** (Architecture Decision Record). Note courte qui consigne une décision d'architecture, son contexte et ses conséquences. Voir [Décisions d'architecture](../architecture/adr/index.md).

**Adresse.** Identifiant public d'un compte Ethereum, 20 octets écrits en hexadécimal avec le préfixe `0x`. Le backend la stocke en minuscules.

**AOF** (Append Only File). Mode de persistance de Redis qui journalise chaque écriture. Configuré avec `appendfsync everysec` : au plus une seconde d'écritures perdue en cas de crash.

**Automation.** Service Chainlink qui appelle `checkUpkeep` puis `performUpkeep` sur un contrat pour automatiser une action. `BlockLucky` implémente l'interface, mais c'est le keeper du backend qui joue ce rôle dans le projet. Voir [Chainlink Automation](../smart-contracts/automation.md).

## B

**Badge POAP.** Voir POAP.

**Bloc.** Lot de transactions ajouté à la chaîne. Sur le nœud Hardhat local, chaque transaction est minée immédiatement dans son propre bloc ; sur Sepolia, un bloc est produit environ toutes les 12 secondes.

**Budget d'erreur.** Part d'échecs tolérée par un objectif de service : 0,1 % pour un objectif de 99,9 %. Voir [Objectifs de service et métriques](../infrastructure/slo-metriques.md).

**BullMQ.** Bibliothèque de files de jobs adossée à Redis. Trois files : `emails-queue`, `ledger-queue` et `chain-actions`. Voir [Files et workers](../backend/files-workers.md).

**Burn rate.** Vitesse de consommation du budget d'erreur, exprimée en multiple du rythme nominal.

## C

**Cagnotte.** Somme des mises d'un tour, moins la commission de la Mairie. Attribuée au gagnant par le contrat ; le backend la retire pour lui (`claimPrize`) par la file `chain-actions`.

**Carte à gratter.** Récompense de la boutique, obtenue en échangeant des EtherPoints, qui révèle un code promotionnel d'un commerçant partenaire. Voir aussi Ticket à gratter.

**Chain ID.** Identifiant numérique d'un réseau Ethereum, inclus dans chaque transaction signée pour empêcher son rejeu sur un autre réseau : `31337` pour Hardhat, `11155111` pour Sepolia. Variable `CHAIN_ID`.

**Chainlink VRF** (Verifiable Random Function). Service d'aléa vérifiable : l'oracle fournit un nombre aléatoire accompagné d'une preuve cryptographique vérifiée par le coordinateur on-chain avant d'être transmise au contrat. Le projet utilise la version 2.5. Voir [Tirage Chainlink VRF](../smart-contracts/chainlink-vrf.md).

**Commission.** Part des mises prélevée pour la Mairie, en points de base (`feeBps`, 1 000 par défaut, soit 10 %, plafonnée à 2 000). Elle s'accumule dans `accruedFees` et est versée à l'adresse de trésorerie par `withdrawFees`.

**Compte opérateur.** Compte Ethereum du backend, dont la clé est `RELAYER_PRIVATE_KEY`. Il détient `OPERATOR_ROLE`, `PAUSER_ROLE` et `MINTER_ROLE`, paie le gas du keeper et des badges, et verse la dotation de bienvenue. Voir [Client RPC et compte opérateur](../integration-blockchain/client-rpc.md).

**Confirmations.** Nombre de blocs attendus après celui d'une transaction avant de la considérer comme définitive. Variable `CHAIN_CONFIRMATIONS` pour l'indexeur (0 en local, 2 conseillé sur Sepolia) ; `requestConfirmations` pour VRF.

**Consommateur VRF.** Contrat autorisé à tirer sur un abonnement VRF.

**Coordinateur VRF.** Contrat Chainlink qui reçoit les demandes d'aléa et rappelle `fulfillRandomWords` sur le consommateur.

**CORS** (Cross-Origin Resource Sharing). Règles du navigateur qui autorisent une page d'une origine à appeler une API d'une autre origine. Variables `FRONTEND_URL` et `CORS_ORIGINS`.

**CSP** (Content-Security-Policy). En-tête qui restreint les sources de scripts, styles et connexions d'une page. Voir [Sécurité du navigateur](../web/securite-navigateur.md).

**Curseur d'indexation.** Ligne de la table `ChainCursor` qui mémorise le dernier bloc traité par l'indexeur.

**Custodial.** Se dit d'un portefeuille dont la clé privée est gardée par un tiers, ici le backend. Les portefeuilles intégrés de BlockLucky sont custodial : la clé est générée et chiffrée par le serveur, le citoyen ne la voit jamais. Voir [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

## D

**Délai de révélation.** Temps que le keeper laisse s'écouler entre le moment où le tour devient tirable et l'appel à `requestDraw`, pour que tous les participants rejoignent la salle d'attente : `DRAW_REVEAL_DELAY_SECONDS`, 600 secondes par défaut, 0 le supprime. Le point de départ est mémorisé dans Redis (`chain:draw-ready-at:<tour>`) et l'heure de révélation est publiée dans `round.revealAt`. Voir [Keeper du tirage](../integration-blockchain/keeper.md).

**Disjoncteur** (circuit breaker). Mise en pause d'urgence du contrat par la Mairie : achats et tirages bloqués, retraits et remboursements toujours possibles. Voir [Disjoncteur](../architecture/flux/disjoncteur.md).

**Dotation de bienvenue.** Ethers fictifs envoyés par le compte opérateur au portefeuille intégré d'un nouveau citoyen, pour qu'il puisse acheter ses premiers tickets. `WELCOME_GRANT_WEI`, 0,5 ETH par défaut ; versée une seule fois (`welcomeGrantTxHash`).

**drawTimeout.** Délai après lequel un tirage sans réponse VRF peut être relancé par `retryDraw` : 10 minutes en local, 24 heures sur Sepolia.

## E

**ERC-721.** Standard Ethereum des jetons non fongibles (NFT). `BlockLuckyPOAP` en hérite.

**EtherBay.** Ville fictive commanditaire du projet.

**EtherPoints.** Points de fidélité de BlockLucky, stockés en base (`User.pointsBalance`, historique dans `PointTransaction`) et non sur la chaîne. Gagnés à l'achat (50 par ticket), au cadeau (75 par ticket offert), à l'inscription (25), au parrainage (100) et par les quêtes sociales ; dépensés dans la boutique des commerçants partenaires.

**Ethers fictifs.** Ethers sans valeur, sur le nœud local ou sur le testnet Sepolia. Aucune monnaie réelle n'est engagée dans le projet.

**Expand et contract.** Méthode de migration en deux temps : ajouter d'abord (expand), retirer seulement quand plus aucun code n'utilise l'ancien élément (contract). Voir l'[ADR 0003](../architecture/adr/0003-migrations-expand-contract.md).

## F

**Fuzzing.** Test qui exécute une fonction avec un grand nombre d'entrées générées aléatoirement. Les contrats en ont, écrits en Solidity dans `test/BlockLucky.t.sol`.

## G

**Grand tirage.** Nom donné aux citoyens à un tour de la loterie. Chaque participant n'y a droit qu'à un ticket.

**Gas.** Unité de travail de calcul sur Ethereum. Chaque transaction paie `gas consommé × prix du gas` en ethers. Le citoyen paie le gas de ses achats depuis son portefeuille intégré ; l'opérateur paie celui du keeper, des badges et des dotations.

**Gasless.** Libellé hérité d'une première version où un relais payait le gas à la place du citoyen. Il ne subsiste que dans le champ de réponse `gaslessSponsored`, toujours à `false` en mode onchain : les achats sont aujourd'hui signés et payés par le portefeuille intégré.

## H

**Hardhat.** Environnement de développement Ethereum (version 3) : compilation, tests, nœud local et scripts de déploiement.

**Healthcheck.** Sonde de santé d'un conteneur, utilisée par Compose pour ordonner les démarrages.

## I

**Idempotence.** Propriété d'une opération qui produit le même résultat qu'on l'exécute une ou plusieurs fois. L'indexeur est idempotent sur `(tour, numéro de ticket)` ; l'achat et l'échange de récompense acceptent un en-tête `Idempotency-Key` qui rejoue la réponse d'une requête déjà traitée pendant 24 heures.

**Indexeur.** Composant du backend qui lit les événements du contrat (`RoundOpened`, `TicketsPurchased`, `DrawRequested`, `WinnerPicked`, `PrizeClaimed`, `RoundCancelled`) et les projette dans PostgreSQL. Voir [Indexeur d'événements](../integration-blockchain/indexeur.md).

## J

**JWT** (JSON Web Token). Jeton de session signé par le backend (`JWT_SECRET`, 12 heures par défaut), révocable par une liste tenue dans Redis.

## K

**Keeper.** Boucle du backend qui, toutes les 10 secondes, demande le tirage quand un tour est prêt et que le délai de révélation est écoulé, ou clôt un tour expiré sans assez de participants. Voir [Keeper du tirage](../integration-blockchain/keeper.md).

**Key hash.** Identifiant de la clé de l'oracle Chainlink et donc du niveau de prix du gas accepté pour la réponse VRF.

## L

**Ledger.** Service qui crédite et débite les EtherPoints en transaction, avec contrôle du solde ([`ledger.service.ts`](src:backend/src/services/ledger.service.ts)).

## M

**Mailpit.** Serveur SMTP de test qui capture les emails et les affiche dans une interface web, sans les envoyer.

**Mode onchain, mode simulé.** `BLOCKCHAIN_MODE=onchain` fait travailler le backend sur un vrai contrat ; `simulated` fabrique tickets, tirages et badges avec des hachages aléatoires, pour le développement seulement. Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

**Monolithe modulaire.** Une seule application backend découpée en modules métier indépendants. Voir l'[ADR 0001](../architecture/adr/0001-monolithe-modulaire.md).

## N

**Numéro de ticket.** Rang du ticket dans le tour, affiché sur cinq chiffres à partir de 1 : le ticket d'index 0 porte le numéro `00001` (`ticketNumber`, calculé par `formatTicketNumber`).

**Nonce.** Numéro d'ordre des transactions d'un compte. Deux transactions ne peuvent pas porter le même nonce ; une transaction bloquée bloque toutes les suivantes. Voir [Runbooks blockchain](../infrastructure/runbooks-blockchain.md#nonce-bloque).

## O

**Office de Tourisme.** Site vitrine statique de la destination EtherBay, livré en bonus du projet.

**OAuth.** Connexion déléguée à Google ou à Apple. L'application mobile obtient un jeton d'identité signé par le fournisseur, que le backend vérifie avant de créer ou d'ouvrir le compte de la même adresse email. Inactive tant que `GOOGLE_CLIENT_IDS` ou `APPLE_CLIENT_IDS` est vide.

**Oracle.** Service qui apporte à la chaîne une donnée extérieure, ici l'aléa du tirage. En local, l'oracle est simulé par `local-vrf-responder.ts`.

## P

**Parrainage.** Lien d'invitation personnel ou code à saisir à l'inscription (`referralCode`, un UUID) ; le parrain reçoit 100 EtherPoints à l'inscription du filleul.

**Phase du tour.** État d'un tour vu par les clients, renvoyé dans `round.phase` : `OPEN` (achats ouverts), `WAITING_ROOM` (achats clos par la fin du temps ou la vente du dernier ticket, révélation à venir), `DRAWING` (tirage demandé, état `LOCKED` en base), `COMPLETED` et `CANCELLED`.

**Pause.** État du contrat activé par le disjoncteur (`Pausable` d'OpenZeppelin).

**POAP** (Proof of Attendance Protocol). Badge numérique qui atteste une participation. Dans BlockLucky, c'est un jeton ERC-721 non transférable émis par `BlockLuckyPOAP` à chaque participant d'un tour, une fois par tour et par adresse. Voir [Badge POAP](../smart-contracts/poap.md).

**Points de base** (bps). Centièmes de pour cent : 1 000 bps valent 10 %.

**Pull payment.** Modèle où le bénéficiaire retire lui-même les fonds qui lui sont dus (`claimPrize`, `claimRefund`), au lieu que le contrat les pousse vers lui. Il évite qu'un destinataire défaillant bloque le contrat. Dans BlockLucky, le backend déclenche ce retrait au nom du citoyen.

## Q

**Quête sociale.** Petite action (partage, suivi d'un compte) qui rapporte des EtherPoints. La liste des quêtes est écrite dans le code et leur validation est déclarative.

## R

**Rate limiting.** Limitation du nombre de requêtes par adresse IP : 300 par 15 minutes en global, 30 par 10 minutes sur l'authentification, comptées dans Redis.

**Remboursement.** Restitution des mises d'un tour annulé, par `claimRefund`, déclenchée par le backend pour chaque payeur.

**Réorganisation** (reorg). Remplacement des derniers blocs d'une chaîne par une version concurrente. Les confirmations en protègent l'indexeur.

**Rôles du contrat.** `DEFAULT_ADMIN_ROLE` (Mairie : configuration, trésorerie, attribution des rôles), `OPERATOR_ROLE` (tirage, annulation, relance, commission), `PAUSER_ROLE` (disjoncteur), `MINTER_ROLE` sur le contrat POAP (émission des badges).

**RPC** (Remote Procedure Call). Interface JSON-RPC d'un nœud Ethereum, par laquelle le backend lit et envoie des transactions. Variables `RPC_URL` et `FALLBACK_RPC_URL`.

**RPO, RTO.** Perte de données maximale acceptée, durée d'interruption maximale acceptée. Voir [Sauvegardes et reprise](../infrastructure/sauvegardes.md).

## S

**Salle d'attente.** Phase `WAITING_ROOM` du tour et écran où les participants attendent ensemble la révélation du gagnant, avec compte à rebours et discussion en direct. Voir [Portefeuille et loterie mobile](../mobile/portefeuille-loterie.md).

**Seed.** Script qui charge les données de démonstration (comptes, partenaires, récompenses). Voir [Seed](../base-de-donnees/seed.md).

**Sepolia.** Réseau de test public d'Ethereum, utilisé pour un déploiement avec le vrai Chainlink VRF.

**SLI, SLO.** Indicateur de niveau de service (ce qu'on mesure) et objectif de niveau de service (la cible).

**Slither.** Analyseur statique de contrats Solidity, lancé par la CI.

**Smart contract.** Programme déployé sur la blockchain, dont le code et l'état sont publics et dont l'exécution ne dépend d'aucun serveur. `BlockLucky` gère les tours, les tickets, le tirage et la cagnotte.

**Soulbound.** Se dit d'un jeton qui ne peut pas être transféré après son émission. Le contrat POAP refuse tout transfert avec l'erreur `SoulboundToken`.

## T

**Testnet.** Réseau de test, sans valeur monétaire. Sepolia en est un.

**Ticket.** Participation à un tour, numérotée à partir de 0 dans le tour (`ticketIndex`) et affichée sur cinq chiffres (voir Numéro de ticket). Un seul ticket par participant et par tour : `maxTicketsPerPlayer` vaut 1 au déploiement et le backend refuse un second achat en 409.

**Ticket à gratter.** Achat en EtherPoints (`POST /marketplace/scratch`) d'une carte qui tire au hasard une offre partenaire en stock : offre « violet » à 50 points et « lucky » à 100 par défaut (`SCRATCH_COST_VIOLET`, `SCRATCH_COST_LUCKY`). Proposé sur mobile seulement.

**TOTP** (Time-based One-Time Password). Code à six chiffres renouvelé toutes les 30 secondes par une application d'authentification, l'une des deux méthodes de double authentification avec le code par email.

**Tour.** Cycle de la loterie : ouvert à l'achat jusqu'à son échéance ou à la vente du dernier ticket, puis salle d'attente, tirage et tour suivant. États sur le contrat : `Open`, `Drawing`, `Completed`, `Cancelled` ; en base : `OPEN`, `LOCKED`, `COMPLETED`, `CANCELLED` ; côté clients, voir Phase du tour. Voir [Cycle de vie d'un tour](../smart-contracts/cycle-tour.md).

**Trésorerie.** Adresse qui reçoit la commission de la Mairie (`treasury`).

## V

**Vérification d'âge.** Contrôle de la majorité par un agent de la Mairie sur la photo du recto et du verso de la pièce d'identité, envoyée depuis `/profil/identite` sur le web ou depuis l'application mobile. Statuts `NONE`, `PENDING`, `VERIFIED`, `REJECTED` (`User.ageVerificationStatus`). Les images sont chiffrées en AES-256-GCM puis effacées à la décision. Tant que le statut n'est pas `VERIFIED`, l'achat, le cadeau, l'échange et le ticket à gratter répondent 403 `AGE_VERIFICATION_REQUIRED`. Voir [Authentification mobile](../mobile/authentification.md#verification-d-age).

## W

**Webhook.** Point d'entrée HTTP appelé par un service tiers. `POST /api/webhooks/blockchain`, signé en HMAC, ne sert qu'en mode simulé.

**Wei.** Plus petite unité d'ether : 1 ETH vaut 10^18 wei. Les montants sont transmis en wei, sous forme de chaînes, pour éviter les erreurs d'arrondi (`ticketPriceWei`, `WELCOME_GRANT_WEI`).

**Worker.** Processus séparé qui exécute les jobs BullMQ, l'indexeur et le keeper (`dist/src/worker.js`).
