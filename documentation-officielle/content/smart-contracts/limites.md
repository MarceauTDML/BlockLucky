# Limites connues

Cette page recense ce que les contrats et leur outillage ne font pas, ou font imparfaitement. Chaque point a été constaté dans le code du dépôt. Les limites propres au backend, au portefeuille intégré et au cadre juridique sont traitées dans leurs parties respectives, notamment [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md) et [Crypto-actifs et MiCA](../juridique/crypto-actifs.md).

## Équité et confiance

| Limite | Détail | Piste |
|---|---|---|
| Aléa prévisible en local | Le mock calcule `keccak256(abi.encode(requestId, 0))`, et `fulfillRandomWordsWithOverride` est appelable par tous : sur la chaîne locale, n'importe qui peut choisir le gagnant | Ne présenter comme équitable qu'un tirage fait sur Sepolia avec le vrai coordinateur |
| Pouvoir du propriétaire `ConfirmedOwner` | Hérité de `VRFConsumerBaseV2Plus`, il peut remplacer le coordinateur par `setCoordinator`, donc fournir un faux aléa. C'est le compte qui déploie, et aucun script ne transfère cette propriété | Transférer la propriété à l'administrateur, idéalement un multisig (voir [Exploitation du contrat](exploitation.md#proprietaire-confirmedowner)) |
| Veto de l'opérateur | `cancelRound` est accepté pendant le tirage. Un opérateur qui lit la réponse de l'oracle dans le mempool peut annuler le tour avant qu'elle soit incluse. Personne ne perd d'argent, mais l'issue peut être écartée | Restreindre l'annulation en `Drawing` aux tirages plus anciens que `drawTimeout` |
| Administrateur unique | Un seul compte détient `DEFAULT_ADMIN_ROLE` dans les scripts, sans multisig ni délai (timelock) | Multisig et timelock pour les changements de configuration |
| Pas d'audit externe | Les contrats n'ont été vérifiés que par les tests, solhint et Slither | Audit avant tout usage avec de vraies valeurs |

## Règles de jeu

| Limite | Détail |
|---|---|
| Plafond par participant contournable | `maxTicketsPerPlayer` s'applique par adresse bénéficiaire. Rien n'empêche une personne de jouer avec plusieurs adresses, ou d'offrir des tickets à des adresses qu'elle contrôle. Le contrat ne connaît pas l'identité des citoyens : seul le backend, qui crée un portefeuille par compte, limite cet usage, et seulement pour les achats faits par l'application |
| Remboursement au payeur | En cas d'annulation, les tickets offerts sont remboursés à celui qui les a payés, pas au bénéficiaire. C'est voulu, mais peut surprendre |
| Paiement exact obligatoire | Un excédent n'est pas rendu, l'achat est refusé. Un client qui lit un prix périmé (après un changement de configuration entre deux tours) voit son achat échouer avec `IncorrectPayment` |
| Pas de date limite de tirage | Un tour expiré avec assez de tickets reste `Open`, sans achat possible, tant que personne n'appelle `requestDraw` |
| Cagnottes non réclamées | Elles restent dues indéfiniment. Aucune fonction ne permet de les récupérer ou de les reverser après un délai |
| Configuration VRF immédiate | Contrairement à la configuration des tours, `setVrfConfig` s'applique aussitôt, y compris `drawTimeout` pour un tirage en attente |
| Asymétrie en pause | `checkUpkeep` renvoie `false` en pause, mais `performUpkeep` peut encore clore un tour expiré sans participants |
| Lecture d'un tour inexistant | `getRound` renvoie une structure vide dont le statut vaut `Open` ; il faut comparer à `currentRoundId` |

## Coût et passage à l'échelle

| Limite | Détail |
|---|---|
| Achat linéaire en gaz | Chaque ticket ajoute une entrée à `ticketOwners`. Le coût mesuré va de 119 577 gaz à 356 745 gaz pour dix tickets ; cent tickets en une transaction coûteraient plusieurs millions de gaz, payés par la dotation du citoyen |
| Stockage jamais libéré | Les tableaux `ticketOwners` des tours passés restent en stockage, ce qui est sans effet sur le coût des tours suivants mais grossit l'état du contrat |
| Pas de mise à jour | Aucun proxy : corriger un bug impose un redéploiement, avec de nouvelles adresses et une base à réindexer (voir [Exploitation du contrat](exploitation.md#redeploiement)) |
| Ethers forcés perdus | Des ethers envoyés par `selfdestruct` d'un autre contrat ne sont comptés nulle part et restent bloqués |

## Badge POAP

| Limite | Détail |
|---|---|
| Pas de lien on-chain avec la loterie | `BlockLuckyPOAP` ne vérifie pas qu'un participant a acheté un ticket. Un titulaire de `MINTER_ROLE` peut frapper un badge pour n'importe quelle adresse et n'importe quel numéro de tour |
| Métadonnées centralisées et modifiables | Servies par le backend ; `setBaseUri` les change pour tous les badges. Si le backend disparaît, les badges n'ont plus d'image |
| Pas d'ERC-5192 | Le blocage des transferts n'est pas annoncé par l'interface standard ; `approve` et `setApprovalForAll` restent appelables sans effet |
| Pas de destruction | Aucun badge ne peut être retiré, même à la demande de son détenteur |
| Pas d'énumération | Sans `ERC721Enumerable`, lister les badges d'un détenteur passe par les événements `BadgeMinted` |

## Automatisation

| Limite | Détail |
|---|---|
| Aucun upkeep Chainlink enregistré | L'interface Automation est prête, mais le tirage dépend du keeper du backend ou d'un appel manuel (voir [Chainlink Automation](automation.md)) |
| Opérations manuelles non outillées | Aucun script pour `retryDraw`, `setRoundConfig`, `setVrfConfig`, `transferOwnership` ou la rotation des rôles : console Hardhat, Remix ou Etherscan |

## Déploiement et outillage

| Limite | Détail |
|---|---|
| Aucun déploiement Sepolia consigné | Le script existe, mais le dépôt ne contient pas de `deployments/sepolia.json` |
| Bloc de départ possiblement tardif | `deploy-sepolia.ts` lit `deploymentBlock` après le déploiement de `BlockLucky` ; si un bloc a été produit entre-temps, `CHAIN_START_BLOCK` saute l'événement `RoundOpened` du tour 1 (voir [Déploiement sur Sepolia](sepolia.md#9-configuration-du-backend)) |
| `POAP_BASE_URI` vérifié tard | Sur Sepolia, son absence n'arrête le script qu'après le déploiement de `BlockLucky` |
| Adresses locales fragiles | Les adresses déterministes supposent que le compte 0 n'a envoyé aucune transaction avant le script, et que l'ordre du script ne change pas |
| Chaîne locale sans persistance | Un redémarrage du conteneur `blockchain` efface la chaîne ; la base du backend doit être réinitialisée |
| Triage Slither lié aux lignes | Les constats acceptés citent des numéros de ligne ; un déplacement de code peut les faire réapparaître et bloquer la CI |
| Couverture des branches non mesurée | Le seuil de 100 % porte sur les lignes. Certaines conditions de validation (`maxTickets` nul, `keyHash` nulle, `drawTimeout` nul…) ne sont pas testées isolément |
| Scripts non testés | `deploy-sepolia.ts` n'est exercé par aucun test ni par la CI |
| Fuzzing sans état | Les tests de fuzzing rejouent des scénarios fixes avec des paramètres aléatoires ; il n'y a pas de test d'invariants sur des séquences d'appels quelconques |

## Écarts entre le contrat et le backend

| Écart | Conséquence |
|---|---|
| Le reversement de commission du backend appelle `setTreasury` avec le compte opérateur | `setTreasury` exige `DEFAULT_ADMIN_ROLE`. Avec un opérateur distinct de l'administrateur, le reversement vers une nouvelle adresse échoue (voir [Exploitation du contrat](exploitation.md#commission-withdrawfees-et-settreasury)) |
| Le montant demandé au reversement est ignoré en mode on-chain | `withdrawFees` verse toujours la totalité de `accruedFees` |
