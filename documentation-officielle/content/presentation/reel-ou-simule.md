# Réel, simulé ou à venir

Cette page fait l'inventaire honnête de l'état du projet au 12 novembre 2026. Elle distingue ce qui fonctionne réellement, ce qui n'existe qu'en mode simulé, ce qui est encore fictif dans le code, ce qui n'a pas été fait et le code mort. Elle est à relire avant toute démonstration et avant toute mise en production.

## Synthèse

| Catégorie | Contenu |
|---|---|
| Réel | Contrats Solidity, tirage Chainlink VRF, portefeuilles intégrés chiffrés, dotation, achats et cadeaux signés, versement automatique, POAP, disjoncteur, commission, authentification, vérification d'âge par la Mairie, salle d'attente, RGPD, indexeur, keeper |
| Simulé à dessein | Mode `BLOCKCHAIN_MODE=simulated`, coordinateur VRF local, ethers fictifs |
| Encore fictif | Notifications push, Sentry, libellé multi-signatures, paliers de la jauge, répartition par âge par défaut, rapport PDF serveur, stockage S3 en local, solde ETH en mode simulé |
| Pas encore fait | Déploiement Sepolia, mise en ligne sur etherbay.tech, audit externe, tests utilisateurs |
| Code mort | supprimé : `useGaslessWeb3.ts` (web et mobile) et `WalletConnectButton.tsx` (mobile) ; reste le champ `gaslessSponsored` des réponses |

## Ce qui est réel

Ces fonctionnalités fonctionnent de bout en bout en mode `onchain`, contre un vrai nœud Ethereum. Elles sont couvertes par le test d'intégration [`backend/__tests__/chain/onchain-lottery.chain.ts`](src:backend/__tests__/chain/onchain-lottery.chain.ts), exécuté en CI sur une blockchain locale.

| Fonctionnalité | Ce qui la rend réelle | Référence |
|---|---|---|
| Smart contracts déployables | `BlockLucky` et `BlockLuckyPOAP` compilés, testés (47 tests, 100 % des lignes) et déployés automatiquement sur le nœud Hardhat local ; script Sepolia prêt | [Blockchain locale](../smart-contracts/blockchain-locale.md), [Déploiement sur Sepolia](../smart-contracts/sepolia.md) |
| Tirage Chainlink VRF | Le contrat demande le hasard au coordinateur VRF v2.5. En local, le coordinateur est le contrat simulé officiel de Chainlink (`VRFCoordinatorV2_5Mock`) et un oracle local ([`smart-contract/scripts/local-vrf-responder.ts`](src:smart-contract/scripts/local-vrf-responder.ts)) répond aux demandes. Sur Sepolia, ce serait le coordinateur réel de Chainlink | [Tirage Chainlink VRF](../smart-contracts/chainlink-vrf.md) |
| Portefeuilles intégrés chiffrés | Une clé Ethereum aléatoire par citoyen, chiffrée en AES-256-GCM avec `ENCRYPTION_KEY` avant d'être stockée | [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) |
| Dotation de bienvenue | Vrai transfert d'ethers fictifs du compte opérateur vers le portefeuille, une seule fois par compte, protégé par un verrou Redis | `grantWelcomeEthers` |
| Achats signés par le citoyen | La transaction `buyTickets` est signée par la clé du portefeuille du citoyen, déchiffrée à la volée par le backend. Le citoyen paie le ticket et les frais de réseau sur sa dotation | [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) |
| Ticket cadeau | `buyTicketsFor` signé par l'expéditeur au profit du destinataire | `giftOnchain` de [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts) |
| Versement automatique de la cagnotte | À l'événement `WinnerPicked`, l'indexeur met en file un `CLAIM_PRIZE` signé par le portefeuille du gagnant ; même mécanisme pour les remboursements (`CLAIM_REFUND`) | [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) |
| Badge POAP ERC-721 | Frappé par le compte opérateur pour chaque participant, non transférable | [Badge POAP](../smart-contracts/poap.md) |
| Disjoncteur on-chain | `pause` et `unpause` du contrat, déclenchés depuis le dashboard Mairie | [Disjoncteur](../architecture/flux/disjoncteur.md) |
| Reversement de la commission | `withdrawFees` vers l'adresse `treasury` du contrat | `withdrawMunicipalityTreasury` de [`backend/src/api/admin/admin.services.ts`](src:backend/src/api/admin/admin.services.ts) |
| Tirage et clôture automatiques | Le keeper appelle `requestDraw` une fois écoulé le délai de révélation (`DRAW_REVEAL_DELAY_SECONDS`, 10 minutes par défaut) après que le contrat l'autorise, ou `closeExpiredRound` pour un tour expiré | [Keeper du tirage](../integration-blockchain/keeper.md) |
| Indexation | Les tickets, tirages et annulations sont projetés en base depuis les événements du contrat, avec un curseur | [Indexeur d'événements](../integration-blockchain/indexeur.md) |
| Connexion par code email ou par mot de passe | Code à 6 chiffres haché, valable 10 minutes, envoyé par email ; mot de passe haché par bcrypt, verrouillage après échecs répétés | [Authentification](../backend/modules/auth.md) |
| Vérification d'âge | Recto et verso de la pièce d'identité chiffrés en AES-256-GCM, examinés par un agent de la Mairie puis effacés ; achat, cadeau et échange refusés (403 `AGE_VERIFICATION_REQUIRED`) tant que l'âge n'est pas vérifié | [`backend/src/middlewares/age-verification.middleware.ts`](src:backend/src/middlewares/age-verification.middleware.ts), [`frontend-web/src/app/mairie/identites/page.tsx`](src:frontend-web/src/app/mairie/identites/page.tsx), [`frontend-web/src/app/(citoyen)/profil/identite/page.tsx`](src:frontend-web/src/app/(citoyen)/profil/identite/page.tsx) |
| 2FA TOTP | Secret chiffré, codes de secours hachés, protection contre le rejeu, obligatoire pour les administrateurs | [Authentification et 2FA](../securite/authentification.md) |
| RGPD | Export JSON, suppression confirmée par email avec anonymisation et effacement de la clé du portefeuille | [Suppression RGPD](../architecture/flux/suppression-rgpd.md) |

> [!NOTE]
> « Signé par le citoyen » veut dire signé avec la clé du portefeuille du citoyen. Cette clé est gardée et utilisée par le backend : le modèle est custodial. Le citoyen ne signe rien lui-même. Ce choix est argumenté dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md).

## Ce qui est simulé à dessein

### Le mode simulé du backend

`BLOCKCHAIN_MODE` accepte deux valeurs, définies dans [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) :

| Valeur | Usage | Comportement |
|---|---|---|
| `onchain` (défaut) | Développement normal, CI d'intégration, production | Toutes les opérations passent par le contrat |
| `simulated` | Tests unitaires ([`backend/__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts)), développement sans nœud | [`backend/src/services/blockchain.service.ts`](src:backend/src/services/blockchain.service.ts) génère des hash de transaction aléatoires, tire le gagnant avec `crypto.randomInt`, garde la pause dans Redis ; le webhook signé sert d'entrée d'événements |

Le schéma de configuration refuse de démarrer en production avec une autre valeur que `onchain` : « BLOCKCHAIN_MODE doit valoir onchain en production ». Le mode simulé ne peut donc pas être déployé par erreur. Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

### Les ethers fictifs

Ce n'est pas une limite mais le principe du projet : en local, les ethers sont ceux du nœud Hardhat (chain ID 31337) ; sur Sepolia, ce seraient des ETH de test. Aucun ne peut être converti en monnaie réelle.

## Ce qui est encore fictif

Ces éléments existent dans l'interface ou dans l'API mais ne reposent sur aucune donnée ni aucun traitement réel.

| Élément | Constat | Fichier |
|---|---|---|
| Historique des notifications push | `getPushNotificationsHistory` renvoie trois notifications codées en dur. Aucun envoi de notification push n'existe côté serveur ; la bannière de notification du mobile est déclenchée localement (`triggerSimulatedOsPush`) | [`backend/src/api/user/user.services.ts`](src:backend/src/api/user/user.services.ts), [`mobile-app/src/hooks/usePushNotifications.ts`](src:mobile-app/src/hooks/usePushNotifications.ts) |
| Sentry | Aucun SDK Sentry n'est installé. `sentry.client.ts` stocke les erreurs dans un tableau en mémoire ; `EXPO_PUBLIC_SENTRY_DSN` n'active qu'un message local. Côté web, « Sentry » désigne une simple modale d'erreur | [`mobile-app/src/services/sentry.client.ts`](src:mobile-app/src/services/sentry.client.ts) |
| Trésorerie « multi-signatures » | Le résumé OpenAPI, l'action d'audit `TREASURY_WITHDRAWAL_MULTISIG` et le champ `multisigWallet` parlent de multi-signatures. En réalité la trésorerie est une adresse simple (`treasury`) du contrat. En mode onchain, si l'adresse saisie dans le dashboard diffère, le backend appelle d'abord `setTreasury` (rôle `DEFAULT_ADMIN_ROLE`, détenu en local par le compte opérateur par défaut, refusé à un opérateur distinct), puis `withdrawFees` verse toute la commission accumulée : le montant saisi est ignoré | [`backend/src/api/admin/admin.routes.ts`](src:backend/src/api/admin/admin.routes.ts), [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) |
| Paliers de la jauge | Quatre paliers (5 000, 7 500, 9 000 et 10 000 participants) annoncent les coulisses du tirage, une offre spéciale des commerçants, un jeu bonus et l'ouverture de la salle. Seule la fermeture des achats à 10 000 tickets découle du contrat (`maxTickets`) ; les trois autres avantages ne sont pas implémentés | `buildMilestones` de [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts) |
| Solde ETH en mode simulé | `walletService.balanceOf` renvoie `null` hors mode onchain : le mobile n'affiche aucun solde et la billetterie considère le solde comme suffisant | [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) |
| Répartition par âge | Sans événement portant une tranche d'âge, le dashboard affiche une répartition codée en dur (42 %, 33 %, 17 %, 8 %) ; `target18_35Validated` vaut toujours `true` | [`backend/src/api/analytics/analytics.services.ts`](src:backend/src/api/analytics/analytics.services.ts) |
| Part de la Mairie au dashboard | Calculée à 10 % de la somme des cagnottes en base, et non lue sur le contrat | [`backend/src/api/admin/admin.services.ts`](src:backend/src/api/admin/admin.services.ts) |
| Rapport PDF côté serveur | Le « PDF » envoyé sur S3 est un texte JSON déclaré `application/pdf`. Le web produit un vrai PDF par l'impression du navigateur | `generateAccountingReport` |
| Stockage S3 | Le backend est configuré pour un MinIO local (`AWS_S3_ENDPOINT=http://localhost:9000`, identifiants `minioadmin`), mais `docker-compose.yml` ne fournit aucun service MinIO. L'envoi échoue, est journalisé en avertissement, et l'URL renvoyée ne pointe vers rien | [`backend/src/services/s3.service.ts`](src:backend/src/services/s3.service.ts) |
| Quêtes sociales | Validées sur simple déclaration du citoyen, sans vérification ; la liste est codée en dur et l'état est gardé dans Redis | `QUESTS_CATALOG` de [`backend/src/api/user/user.services.ts`](src:backend/src/api/user/user.services.ts) |
| Expiration des offres | La date saisie par le partenaire est écrite dans Redis mais jamais relue | [`backend/src/api/partners/partners.services.ts`](src:backend/src/api/partners/partners.services.ts) |
| Codes promo importés | Gardés uniquement dans Redis (`partner:codes:<offre>`) ; une purge de Redis les perd | [`backend/src/api/marketplace/marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) |
| Événements Socket.IO déclarés | `draw:countdown`, `draw:started`, `queue:position` et `network:fallback` sont typés mais jamais émis | [`backend/src/types/socket.types.ts`](src:backend/src/types/socket.types.ts) |
| Traces de Web3Auth | Il n'y a pas de Web3Auth : le portefeuille est créé par le backend. `EXPO_PUBLIC_WEB3AUTH_CLIENT_ID` figure dans `mobile-app/.env.example` sans être lu. L'adresse envoyée par le web à la connexion (`POST /auth/login`) n'est qu'un identifiant de recherche : le vrai portefeuille est créé côté serveur. Le mobile, qui passe par `/auth/signin` et `/auth/signup`, n'envoie plus d'adresse | [`backend/src/api/auth/auth.routes.ts`](src:backend/src/api/auth/auth.routes.ts), [`frontend-web/src/lib/wallet.ts`](src:frontend-web/src/lib/wallet.ts) |
| Tests mobiles | 8 tests écrits mais sans exécuteur : ni script `test` ni Jest dans `mobile-app/package.json` | `mobile-app/__tests__/` |
| Connexion Google et Apple | Code complet côté serveur et mobile, mais `GOOGLE_CLIENT_IDS` et `APPLE_CLIENT_IDS` sont vides par défaut : les deux routes répondent 503 et le mobile grise ses boutons tant qu'aucun identifiant client n'est déclaré | [`backend/src/services/oauth-verifier.service.ts`](src:backend/src/services/oauth-verifier.service.ts) |

## Ce qui n'est pas encore fait

| Élément | État | Ce qu'il faut faire |
|---|---|---|
| Déploiement sur Sepolia | Script [`smart-contract/scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) prêt, jamais exécuté : il n'existe pas de fichier `deployments/sepolia.json` | Comptes, ETH de test, abonnement VRF : voir [Redéployer sur Sepolia](../guides/redeployer-sepolia.md) |
| Vérification du code sur Etherscan | Dépend du déploiement Sepolia | Commandes `npx hardhat verify` décrites dans [Déploiement sur Sepolia](../smart-contracts/sepolia.md) |
| Mise en ligne sur etherbay.tech | Application non hébergée | [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md) |
| Chainlink Automation | Le contrat implémente `checkUpkeep` et `performUpkeep`, mais aucune tâche n'est enregistrée ; le keeper du backend joue ce rôle | [Chainlink Automation](../smart-contracts/automation.md) |
| Audit de sécurité externe | Aucun ; seules les analyses automatiques (Slither, CodeQL, gitleaks, Trivy) tournent | [Audits et checklists](../securite/audits.md) |
| Tests utilisateurs | Protocole rédigé par l'équipe, entretiens et tests non réalisés | [Profils et parcours](profils-parcours.md) |
| Garde des secrets en production | `ENCRYPTION_KEY` et `RELAYER_PRIVATE_KEY` à confier à un coffre de secrets | [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md) |
| Création de comptes partenaire et administrateur | Aucun écran ni route ; changement de rôle en base | [Points à valider](../juridique/points-a-valider.md) |

## Code mort

La première version prévoyait des achats « gasless », c'est-à-dire relayés et payés par la Mairie. Depuis le passage au portefeuille intégré, le citoyen paie lui-même les frais sur sa dotation. Les trois fichiers de cette époque, que plus rien n'importait, ont été supprimés : les hooks `useGaslessWeb3.ts` du web et du mobile, remplacés par [`useBlockLuckyWallet`](../web/portefeuille-loterie.md) et [`useCitizenWallet`](../mobile/portefeuille-loterie.md), et le composant mobile `WalletConnectButton.tsx`, remplacé par `IntegratedWalletButton`, que plus aucun écran n'affiche depuis la refonte du mobile.

La refonte du mobile du 12 novembre 2026 a aussi supprimé `LoginScreen`, `SettingsStack` et sept composants de loterie (`ChatBox`, `CountdownTimer`, `LeaderboardList`, `POAPBadge`, `RouletteAnimation`, `TicketCard`, `WinnerClaimCard`), remplacés par les écrans et composants décrits dans [Navigation et écrans](../mobile/navigation-ecrans.md).

Il reste le champ `gaslessSponsored` des réponses de `GET /lottery/status` et `POST /lottery/buy`, conservé pour ne pas casser les clients : il vaut `false` en mode onchain. D'autres éléments installés mais inutilisés côté mobile sont recensés dans [Stack et structure de l'application mobile](../mobile/structure.md#code-mort-a-connaitre).

## Avant une démonstration

1. Lancer la blockchain locale et réinitialiser la base si le conteneur a redémarré ([Dépannage](../demarrage/depannage.md)).
2. Ne pas présenter la répartition par âge, les paliers ni les notifications comme des données réelles.
3. Présenter la trésorerie comme une adresse simple.
4. Montrer un ticket, sa transaction et le tirage : c'est la preuve demandée par le livrable de cadrage de l'équipe.

Le déroulé complet est dans [Préparer la soutenance](../guides/soutenance.md). La liste de la dette technique, avec les priorités de correction, est dans [Dette technique et limites](../annexes/dette-technique.md).
