# Grille de compétences

L'école évalue le rush BlockLucky sur une grille de 15 compétences, fournie dans le fichier « compétences block lucky » (colonnes référence, description, évaluation). Cette page relie chaque compétence à des preuves concrètes et vérifiables : des pages de cette documentation et des fichiers du dépôt. Elle sert au jury pour l'évaluation et à l'équipe pour préparer la soutenance.

Les intitulés sont repris de la grille. Certains y sont tronqués : ils sont reproduits tels quels, suivis de points de suspension.

## Vue d'ensemble

| Référence | Compétence | Nature de la preuve |
|---|---|---|
| 00.01.B04 | Utiliser des techniques de storytelling pour captiver l'auditoire | Orale, préparée par la documentation |
| 02.01.B03 | Adapter son langage et son ton en fonction du contexte et de l'audience... | Orale et écrite |
| 03.01.B06 | Concevoir une UX ergonomique adaptée aux besoins des utilisateurs | Code et livrables UX |
| 03.03.B01 | Assurer une veille juridique | Documentation juridique |
| 01.01.B03 | Implémenter des algorithmes et des structures de données adaptés à divers problèmes | Code |
| 01.02.B05 | Proposer une solution pour éviter une possible violation de sécurité dans les données | Code et documentation sécurité |
| 01.02.B07 | Assurer la conformité aux réglementations en matière de protection des données et de... | Code et documentation RGPD |
| 04.03.B14 | Explorer et appliquer les technologies émergentes, telles que l'Internet des objets... | Code |
| 05.02.B06 | Reformuler les besoins des clients | Documentation |
| 05.02.B14 | Évaluer l'adéquation entre les technologies existantes et les besoins des utilisateurs... | ADR et documentation |
| 05.03.B02 | Créer un objet à partir de zéro | Dépôt et historique |
| 05.03.B05 | Expérimenter avec des technologies émergentes pour créer de nouvelles expériences... | Code |
| 08.01.B01 | S'exprimer clairement et de manière concise | Orale et écrite |
| 08.01.B06 | Écouter et répondre aux questions ou commentaires avec clarté et professionnalisme | Orale, préparée par la documentation |
| 08.02.B04 | Transformer les idées en projets concrets | Dépôt et historique |

## Compétences techniques

### 01.01.B03 Implémenter des algorithmes et des structures de données adaptés

| Problème | Solution implémentée | Preuve |
|---|---|---|
| Désigner un ticket gagnant en temps constant | Tableau `ticketOwners[roundId]` où chaque ticket est une entrée ; le gagnant est `ticketOwners[roundId][randomWords[0] % ticketCount]` | `fulfillRandomWords` de [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) |
| Plafonner les tickets par participant et rembourser exactement | Tables d'association `ticketsByPlayer` et `contributions` par tour | même fichier, `_buyTickets` et `claimRefund` |
| Empaqueter l'état d'un tour | Structure `Round` aux types dimensionnés (`uint64`, `uint32`, `uint16`) | même fichier |
| Ne jamais traiter deux fois un événement | Curseur de bloc persistant (`ChainCursor`), unicité du couple tour et index de ticket | [`backend/src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts), [Index et contraintes](../base-de-donnees/index-contraintes.md) |
| Rejouer une requête sans doublon | Clé d'idempotence et réponse mise en cache | [`backend/src/middlewares/idempotency.middleware.ts`](src:backend/src/middlewares/idempotency.middleware.ts) |
| Exécuter une action une seule fois malgré plusieurs instances | Verrous Redis `SET NX` avec durée de vie (keeper, dotation) | [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts) |
| Vérifier les invariants financiers | Tests de fuzzing : cagnotte plus commission égale aux fonds collectés, remboursements exacts | [`smart-contract/test/BlockLucky.t.sol`](src:smart-contract/test/BlockLucky.t.sol) |

Pages : [Contrat BlockLucky](../smart-contracts/blocklucky.md), [Indexeur d'événements](../integration-blockchain/indexeur.md), [Tests, fuzzing et couverture](../smart-contracts/tests.md).

### 01.02.B05 Proposer une solution pour éviter une violation de sécurité dans les données

| Risque | Solution | Preuve |
|---|---|---|
| Vol des clés des portefeuilles en cas de fuite de la base | Chiffrement AES-256-GCM avec une clé hors base (`ENCRYPTION_KEY`) | [`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) |
| Vol des secrets 2FA et des codes de secours | Secret TOTP chiffré, codes de secours et codes email hachés | [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts), [`backend/src/services/otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts) |
| Détournement des fonds du contrat | Réentrance bloquée, retraits en mode pull, rôles séparés, pause | [Sécurité du contrat](../smart-contracts/securite.md) |
| Prise de contrôle d'un compte administrateur | 2FA obligatoire, rôle relu en base à chaque requête, sessions révocables | [`backend/src/middlewares/rbac.middleware.ts`](src:backend/src/middlewares/rbac.middleware.ts) |
| Secrets de développement en production | Démarrage refusé si une valeur de développement est détectée | [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) |
| Injection de formules dans un export CSV | Neutralisation des cellules | `neutralizeSpreadsheetCell` |
| Fuite de secrets dans le dépôt | gitleaks sur tout l'historique en CI | [`.gitleaks.toml`](src:.gitleaks.toml) |

Pages : [Modèle de menaces](../securite/menaces.md), [Cryptographie et secrets](../securite/cryptographie-secrets.md), [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

### 01.02.B07 Assurer la conformité aux réglementations de protection des données

| Exigence | Réponse | Preuve |
|---|---|---|
| Droit d'accès et portabilité | Export JSON complet | `GET /api/v1/user/gdpr/export` |
| Droit à l'effacement | Suppression confirmée par email, anonymisation, effacement de la clé du portefeuille, révocation des sessions | [`backend/src/api/user/user.repo.ts`](src:backend/src/api/user/user.repo.ts) |
| Minimisation sur la chaîne | Aucune donnée personnelle dans le contrat : seulement des adresses | [Blockchain et données personnelles](../juridique/blockchain-donnees.md) |
| Consentement à la mesure d'audience | Mesure first-party, refus possible sur `/confidentialite` | [`frontend-web/src/lib/analytics.ts`](src:frontend-web/src/lib/analytics.ts) |
| Registre des traitements | Documenté | [Registre des traitements](../juridique/registre-traitements.md) |

Pages : [RGPD](../juridique/rgpd.md), [Suppression RGPD](../architecture/flux/suppression-rgpd.md).

### 04.03.B14 Explorer et appliquer les technologies émergentes

La technologie émergente appliquée est la blockchain, avec trois briques : un smart contract Solidity sur Ethereum, un oracle de hasard vérifiable (Chainlink VRF v2.5) et un jeton non fongible non transférable (POAP ERC-721). L'Internet des objets cité par l'intitulé n'est pas utilisé.

Preuves : [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol), [`smart-contract/contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol), [Tirage Chainlink VRF](../smart-contracts/chainlink-vrf.md), [Badge POAP](../smart-contracts/poap.md).

### 05.03.B05 Expérimenter avec des technologies émergentes pour créer de nouvelles expériences

L'expérience nouvelle est une loterie municipale vérifiable par tous, accessible sans aucune connaissance de la blockchain. Les expérimentations visibles dans le dépôt :

- le portefeuille intégré et la dotation de bienvenue, qui suppriment MetaMask ([ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md)) ;
- le tirage vécu en direct, du `DrawRequested` au `WinnerPicked`, relayé par Socket.IO ([Relais temps réel](../integration-blockchain/relais-temps-reel.md)) ;
- l'abandon documenté d'une première piste, l'achat « gasless » relayé par la Mairie, dont le code a été retiré ([Réel, simulé ou à venir](reel-ou-simule.md#code-mort)).

### 05.03.B02 Créer un objet à partir de zéro

Le dépôt a été créé le 2 novembre 2026 par un commit initial qui ne contient qu'un fichier `.gitattributes`. Tout le code, des contrats à l'infrastructure, a été écrit dans le cadre du projet : 331 commits jusqu'au 11 novembre. Les contrats héritent de bibliothèques auditées (OpenZeppelin, Chainlink) sans recopie de code tiers.

Pages : [Historique et feuille de route](historique.md), [Le projet en chiffres](../accueil/projet-en-chiffres.md), [Organisation du dépôt](../architecture/organisation-depot.md).

## Compétences de conception

### 03.01.B06 Concevoir une UX ergonomique adaptée aux besoins des utilisateurs

| Besoin utilisateur | Choix d'ergonomie | Preuve |
|---|---|---|
| Ne rien installer, ne rien comprendre à la blockchain | Connexion par email et code, portefeuille automatique | [`frontend-web/src/app/connexion/page.tsx`](src:frontend-web/src/app/connexion/page.tsx) |
| Comprendre ce qu'on engage | Montants « ETH fictif », case de compréhension, règles avant la confirmation | [`frontend-web/src/app/(citoyen)/billetterie/page.tsx`](src:frontend-web/src/app/(citoyen)/billetterie/page.tsx) |
| Éviter les doublons | Bouton désactivé pendant l'envoi, clé d'idempotence | même fichier |
| Lire sur tous les supports | Web responsive, application mobile au même design system, thème clair ou sombre | [Design system](../web/design-system.md), [Thème et composants](../mobile/theme-composants.md) |
| Être accessible | Navigation clavier, focus visible, `aria-live`, `prefers-reduced-motion` | [Accessibilité et responsive](../web/accessibilite.md) |

Livrable de l'équipe : « Recherche utilisateurs et parcours » (profils, protocole de test, parcours en six étapes). Pages : [Profils et parcours](profils-parcours.md), [Pages et espaces](../web/pages.md).

### 05.02.B06 Reformuler les besoins des clients

Chaque attente du kickoff est reformulée en besoin vérifiable, avec la réponse du projet et la preuve dans le dépôt. Les besoins non couverts sont listés.

Pages : [Besoins des parties prenantes](besoins.md), [Objectifs et indicateurs](objectifs-indicateurs.md), [Contexte et kickoff](contexte.md).

### 05.02.B14 Évaluer l'adéquation entre les technologies et les besoins

| Décision | Besoin servi | Preuve |
|---|---|---|
| Ethereum, Hardhat, Chainlink VRF | Contrat solide, hasard vérifiable | [Pourquoi Ethereum, Hardhat et Chainlink](../smart-contracts/choix.md) |
| Portefeuille intégré custodial plutôt que MetaMask | Inclusion | [ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md) |
| Monolithe modulaire plutôt que microservices | Maintenabilité par une petite équipe | [ADR 0001](../architecture/adr/0001-monolithe-modulaire.md) |
| Redis avec repli mémoire | Fluidité malgré une panne | [ADR 0002](../architecture/adr/0002-redis-files-et-repli-memoire.md) |
| Migrations expand et contract | Évolution sans interruption | [ADR 0003](../architecture/adr/0003-migrations-expand-contract.md) |

Page de synthèse : [Choix techniques](../architecture/choix-techniques.md).

### 08.02.B04 Transformer les idées en projets concrets

Le brief demandait un smart contract. Le projet livre un produit utilisable : contrat, API, web, mobile, infrastructure et CI. L'écart entre l'intention et la réalisation est documenté sans l'embellir : le livrable de cadrage classait la boutique, le parrainage et les badges comme des extensions ; le code les implémente, et ce qui reste fictif est listé.

Pages : [Catalogue des fonctionnalités](fonctionnalites.md), [Réel, simulé ou à venir](reel-ou-simule.md), [Historique et feuille de route](historique.md).

## Compétences juridiques

### 03.03.B01 Assurer une veille juridique

La veille de l'équipe couvre les jeux d'argent (Code de la sécurité intérieure, régime expérimental des JONUM), le règlement MiCA sur les crypto-actifs et le RGPD ; le dossier de cadrage cite aussi les lignes directrices 02/2025 du Comité européen de la protection des données sur la blockchain. La partie juridique de cette documentation y ajoute l'accessibilité numérique et les licences. La veille a conduit à des décisions de conception : ethers fictifs, aucune donnée personnelle sur la chaîne, effacement de la clé à la suppression, et une liste de points à faire valider par un juriste.

Pages : [Veille juridique](../juridique/veille-juridique.md), [Crypto-actifs et MiCA](../juridique/crypto-actifs.md), [Licences](../juridique/licences.md), [Points à valider](../juridique/points-a-valider.md), [Registre des risques](../juridique/registre-risques.md).

## Compétences orales

Ces quatre compétences s'évaluent à la soutenance. La documentation ne les prouve pas : elle fournit la matière et la structure de la présentation. Le guide [Préparer la soutenance](../guides/soutenance.md) donne le déroulé.

| Référence | Ce que la documentation apporte |
|---|---|
| 00.01.B04 Storytelling | Un fil narratif tiré du kickoff : la ville, la Maire, les 10 000 participants, puis le citoyen qui achète un ticket et voit le tirage en direct ([Contexte et kickoff](contexte.md), [Profils et parcours](profils-parcours.md)) |
| 02.01.B03 Adapter son langage | Des points d'entrée par profil de lecteur ([Accueil](../README.md)) et, pour chaque partie prenante, un argumentaire dans son vocabulaire : événement pour la Maire, pilotage pour le responsable événementiel, sécurité et fiabilité pour le DSI ([Besoins des parties prenantes](besoins.md)) |
| 08.01.B01 S'exprimer clairement | Des chiffres vérifiés et leurs méthodes de calcul ([Le projet en chiffres](../accueil/projet-en-chiffres.md)), des tableaux de synthèse réutilisables sur des diapositives |
| 08.01.B06 Écouter et répondre | Des réponses préparées aux questions probables du jury : limites, risques, choix custodial ([FAQ](../annexes/faq.md), [Réel, simulé ou à venir](reel-ou-simule.md), [Registre des risques](../juridique/registre-risques.md)) |
