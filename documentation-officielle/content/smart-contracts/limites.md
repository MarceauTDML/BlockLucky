# Limites connues

Cette page recense ce que les contrats et leur outillage ne font pas, ou font imparfaitement. Chaque point a été constaté dans le code du dépôt. Les limites propres au backend, au portefeuille intégré et au cadre juridique sont traitées dans leurs parties respectives, notamment [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md) et [Crypto-actifs et MiCA](../juridique/crypto-actifs.md).

## Équité et confiance

| Limite | Détail | Piste |
|---|---|---|
| Aléa prévisible en local | Le mock calcule `keccak256(abi.encode(requestId, 0))`, et `fulfillRandomWordsWithOverride` est appelable par tous : sur la chaîne locale, n'importe qui peut choisir le gagnant | Ne présenter comme équitable qu'un tirage fait sur Sepolia avec le vrai coordinateur |
| Pouvoir du propriétaire `ConfirmedOwner` | Hérité de `VRFConsumerBaseV2Plus`, il peut remplacer le coordinateur par `setCoordinator`, donc fournir un faux aléa. Les scripts la transfèrent à `VRF_OWNER_ADDRESS` (le multisig par défaut), mais en deux temps : tant que le multisig n'a pas appelé `acceptOwnership`, le déployeur la garde | Faire signer `acceptOwnership` par le multisig juste après le déploiement (voir [Exploitation du contrat](exploitation.md#proprietaire-confirmedowner)) |
| Veto de l'opérateur | `cancelRound` est accepté pendant le tirage. Un opérateur qui lit la réponse de l'oracle dans le mempool peut annuler le tour avant qu'elle soit incluse. Personne ne perd d'argent, mais l'issue peut être écartée | Restreindre l'annulation en `Drawing` aux tirages plus anciens que `drawTimeout` |
| Administrateur sans délai | Sur Sepolia, `DEFAULT_ADMIN_ROLE` est confié à `MAIRIE_ADMIN_ADDRESS`, prévu pour un multisig, mais le script ne vérifie pas que l'adresse en est un, et aucun délai (timelock) ne précède un changement de configuration ; en local, l'opérateur reste administrateur additionnel | Timelock pour les changements de configuration |
| Pas d'audit externe | Les contrats n'ont été vérifiés que par les tests, solhint et Slither | Audit avant tout usage avec de vraies valeurs |

## Règles de jeu

| Limite | Détail |
|---|---|
| Plafond par participant contournable | `maxTicketsPerPlayer` (1 au déploiement) s'applique par adresse bénéficiaire. Rien n'empêche une personne de jouer avec plusieurs adresses, ou d'offrir des tickets à des adresses qu'elle contrôle. Le contrat ne connaît pas l'identité des citoyens : seul le backend, qui crée un portefeuille par compte, exige un âge vérifié par la Mairie et refuse un second ticket ou un cadeau à soi-même, limite cet usage, et seulement pour les achats faits par l'application |
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
| Aucun upkeep Chainlink enregistré | `npm run automation:sepolia` inscrit l'upkeep, mais le contrat n'est pas encore déployé sur Sepolia : le tirage dépend du keeper du backend ou d'un appel manuel (voir [Chainlink Automation](automation.md)) |
| Opérations manuelles non outillées | Le déploiement répartit les rôles et propose la propriété VRF, mais aucun script ne couvre `retryDraw`, `setRoundConfig`, `setVrfConfig`, `acceptOwnership` ni la rotation ultérieure des rôles : console Hardhat, Remix, Etherscan ou Transaction Builder du multisig |

## Déploiement et outillage

| Limite | Détail |
|---|---|
| Aucun déploiement Sepolia consigné | Les scripts `vrf:sepolia`, `deploy:sepolia`, `automation:sepolia` et `verify:sepolia` existent, mais ils demandent les clés et les fonds de test de l'équipe : le dépôt ne contient pas de `deployments/sepolia.json` |
| Bloc de départ possiblement tardif | `deploy-sepolia.ts` lit `deploymentBlock` après le déploiement de `BlockLucky` ; si un bloc a été produit entre-temps, `CHAIN_START_BLOCK` saute l'événement `RoundOpened` du tour 1 (voir [Déploiement sur Sepolia](sepolia.md#9-configuration-du-backend)) |
| Adresses locales fragiles | Les adresses déterministes supposent que le compte 0 n'a envoyé aucune transaction avant le script, et que l'ordre du script ne change pas |
| Chaîne locale sans persistance | Un redémarrage du conteneur `blockchain` efface la chaîne ; la base du backend doit être réinitialisée |
| Triage Slither lié aux lignes | Les constats acceptés citent des numéros de ligne ; un déplacement de code peut les faire réapparaître et bloquer la CI |
| Couverture des branches non mesurée | Le seuil de 100 % porte sur les lignes. Certaines conditions de validation (`maxTickets` nul, `keyHash` nulle, `drawTimeout` nul…) ne sont pas testées isolément |
| Scripts Sepolia non testés | La répartition des rôles de `lib/roles.ts` est testée ([`test/roles.test.ts`](src:smart-contract/test/roles.test.ts)), mais `setup-vrf-sepolia.ts`, `deploy-sepolia.ts`, `register-automation-sepolia.ts` et `verify-sepolia.ts` ne sont exécutés par aucun test ni par la CI |
| Fuzzing sans état | Les tests de fuzzing rejouent des scénarios fixes avec des paramètres aléatoires ; il n'y a pas de test d'invariants sur des séquences d'appels quelconques |

## Écarts entre le contrat et le backend

| Écart | Conséquence |
|---|---|
| Le reversement de commission du backend appelle `setTreasury` avec le compte opérateur | `setTreasury` exige `DEFAULT_ADMIN_ROLE`. En local, l'opérateur le garde pour cette raison ; sur Sepolia, il ne l'a pas et le reversement ne fonctionne que vers `MAIRIE_TREASURY_ADDRESS` (voir [Exploitation du contrat](exploitation.md#commission-withdrawfees-et-settreasury)) |
| Le montant demandé au reversement est ignoré en mode on-chain | `withdrawFees` verse toujours la totalité de `accruedFees` |
