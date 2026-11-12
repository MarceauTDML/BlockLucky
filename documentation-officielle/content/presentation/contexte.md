# Contexte et kickoff

BlockLucky répond à un appel à projet fictif de la Ville d'EtherBay, présenté lors du kickoff du rush « BlockLucky, création d'un smart contract » de l'Epitech Digital School (promotion DIGI3). Cette page résume ce document de 23 pages, puis explique comment l'équipe l'a interprété et quel périmètre elle a retenu.

## Le brief

Le brief tient en une phrase, reproduite telle quelle dans le kickoff :

> Créer un smart contract pour une loterie simple. Les participants pourront acheter des tickets avec des ethers fictifs, et après un certain nombre de participants ou une certaine durée, un gagnant sera choisi au hasard pour remporter la cagnotte.

Chaque élément de cette phrase se retrouve dans le contrat [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) :

| Exigence du brief | Traduction dans le contrat |
|---|---|
| Acheter des tickets | `buyTickets(quantity)` et `buyTicketsFor(player, quantity)`, payables au prix exact du tour |
| Avec des ethers fictifs | Déploiement sur un réseau de test : nœud Hardhat local (chain ID 31337), Sepolia prévu |
| Après un certain nombre de participants | Tour fermé dès que `maxTickets` est atteint (`isDrawReady`) |
| Ou une certaine durée | Tour fermé à `endTime` s'il compte au moins `minTicketsToDraw` tickets ; sinon annulé et remboursé (`closeExpiredRound`) |
| Un gagnant choisi au hasard | Nombre aléatoire fourni par Chainlink VRF v2.5, `randomWords[0] % ticketCount` |
| Remporter la cagnotte | Cagnotte moins la commission de la Mairie, retirable par le gagnant (`claimPrize`) et versée automatiquement par le backend |

Le cycle complet est décrit dans [Cycle de vie d'un tour](../smart-contracts/cycle-tour.md).

## Objectifs pédagogiques

Le kickoff fixe trois objectifs à l'exercice :

1. comprendre le fonctionnement des smart contracts ;
2. apprendre à utiliser des outils de développement blockchain ;
3. mettre en pratique les concepts théoriques.

Il présente deux outils : Remix, un environnement de développement web adapté au prototypage, et Hardhat, un environnement en ligne de commande adapté aux tests avancés et aux déploiements. L'équipe a retenu Hardhat 3 pour le développement, les tests et le déploiement ; les contrats restent compilables dans Remix (voir [Utiliser Remix](../smart-contracts/remix.md)). Les raisons sont détaillées dans [Pourquoi Ethereum, Hardhat et Chainlink](../smart-contracts/choix.md).

## Les cinq concepts clés

Le kickoff définit cinq notions. Le tableau indique comment le projet les met en œuvre.

| Concept | Définition du kickoff (résumée) | Mise en œuvre dans BlockLucky |
|---|---|---|
| Smart contract | Programme autonome qui exécute les conditions prévues | Le contrat encaisse, ferme, tire au sort et paie sans intervention humaine ; le backend n'a aucun moyen de désigner le gagnant |
| Transparence | Transactions et résultats visibles et vérifiables par tous | Chaque ticket est une transaction ; les liens vers l'explorateur sont fournis quand `EXPLORER_URL` est défini ; page publique `/transparence` |
| Décentralisation | Aucune entité centrale ne contrôle le système | Hasard fourni par l'oracle Chainlink ; `requestDraw` et `closeExpiredRound` appelables par n'importe qui |
| Sécurité | Données protégées par la cryptographie | Protection contre la réentrance, retraits en mode pull, rôles séparés, pause ; clés des portefeuilles chiffrées en AES-256-GCM |
| Interactivité | Interface intuitive et engageante | Achat en un geste, salle d'attente et annonce du gagnant en direct, badges POAP, EtherPoints |

> [!NOTE]
> La décentralisation est partielle, et la documentation le dit : le backend garde les clés des portefeuilles des citoyens (modèle dit custodial). Ce compromis, choisi pour l'inclusion, est argumenté dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md) et ses risques dans [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

## Le scénario EtherBay

### La ville

| Donnée du kickoff | Valeur |
|---|---|
| Population | 120 000 habitants |
| Cible principale | 35 % de la population a entre 18 et 35 ans, soit 42 000 personnes |
| Événement à digitaliser | La loterie des fêtes de fin d'année |
| Objectif d'engagement | Au moins 10 000 participants |

La ville est décrite comme dynamique et ouverte à l'innovation. Elle veut rassembler la communauté locale et envisage la blockchain pour garantir la transparence et la confiance dans le tirage.

### Les attentes de la ville

Le kickoff liste cinq attentes : éducatif (sensibiliser à la blockchain), engagement (10 000 participants), innovation (positionner EtherBay comme ville innovante), transparence (confiance totale dans le système) et collaboration (renforcer le partenariat Mairie et Epitech). Elles sont traduites en indicateurs mesurables dans [Objectifs et indicateurs](objectifs-indicateurs.md).

### Les parties prenantes

| Partie prenante | Ce qu'elle attend |
|---|---|
| Madame la Maire | Un événement mémorable, un succès auprès de la communauté, qui fasse parler de lui et soit inclusif |
| Le responsable événementiel | L'aspect pratique, la facilité d'utilisation et la fluidité de l'expérience |
| Le DSI | La sécurité, la fiabilité et l'efficacité du système |

Leurs besoins sont reformulés, un par un, avec la réponse du projet et la preuve dans le dépôt, dans [Besoins des parties prenantes](besoins.md).

## Les critères de sélection

L'appel à projet retient le projet qui :

1. a développé un smart contract solide et sécurisé ;
2. a su convaincre les parties prenantes de la pertinence de sa solution, de sa facilité d'utilisation et de sa capacité à garantir la transparence et la confiance.

Le premier critère est couvert par la partie [Smart contracts](../smart-contracts/index.md), en particulier [Sécurité du contrat](../smart-contracts/securite.md) et [Tests, fuzzing et couverture](../smart-contracts/tests.md). Le second par la partie 1 de cette documentation et le guide [Préparer la soutenance](../guides/soutenance.md).

## La timeline imposée

Le kickoff demande de répondre à l'appel à projet en moins de 48 heures, en cinq étapes.

| Étape du kickoff | Ce qui existe dans le dépôt |
|---|---|
| 1. Configuration de l'environnement | Projet Hardhat 3, nœud local en conteneur (service `blockchain` de [`docker-compose.yml`](src:docker-compose.yml)) |
| 2. Création du smart contract | `BlockLucky.sol` et `BlockLuckyPOAP.sol` |
| 3. Test du smart contract | 54 tests dont 4 de fuzzing, 100 % des lignes couvertes, Slither en CI |
| 4. Déploiement | Déploiement local automatique avec rôles séparés ; scripts Sepolia ([`smart-contract/scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts), abonnement VRF, Automation, vérification Etherscan) prêts mais non exécutés, faute des clés et des fonds de l'équipe |
| 5. Soutenance | Préparée avec [ce guide](../guides/soutenance.md) |

L'historique Git montre que le travail a dépassé le cadre strict des 48 heures et du seul contrat : le dépôt contient aussi le backend, le web, le mobile et un site vitrine, développés entre le 2 et le 11 novembre 2026. Voir [Historique et feuille de route](historique.md).

## Les axes complémentaires

Les dernières pages du kickoff ouvrent trois axes au-delà du code.

| Axe | Contenu demandé | Où le trouver |
|---|---|---|
| UI/UX research | Une interface fonctionnelle, intuitive et agréable | [Profils et parcours](profils-parcours.md), [Design system](../web/design-system.md), [Accessibilité et responsive](../web/accessibilite.md) |
| Stratégie marketing et communication | Marché (besoins et comportements), promotion, KPI | [Volet marketing](marketing.md), [Objectifs et indicateurs](objectifs-indicateurs.md) |
| Aspects éthiques et réglementaires | Éthique, réglementation, gestion des risques | [Veille juridique](../juridique/veille-juridique.md), [Crypto-actifs et MiCA](../juridique/crypto-actifs.md), [Registre des risques](../juridique/registre-risques.md) |

Le kickoff contient aussi des statistiques de marché (détention de cryptomonnaies, adoption de la blockchain, taille du marché des loteries). Les livrables de l'équipe les écartent explicitement, faute de source, et cette documentation fait de même.

## Le périmètre retenu par l'équipe

L'équipe (Rajeeva, Myriam, Marie et Marceau) a fait trois choix structurants, consignés dans ses livrables de cadrage et dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md).

### Un pilote pédagogique en ethers fictifs

Aucune mise en euros ni en ethers réels. Ce choix écarte la qualification de jeu d'argent et le régime des crypto-actifs : il est justifié dans [Crypto-actifs et MiCA](../juridique/crypto-actifs.md). Toutes les interfaces rappellent que les ethers sont fictifs ; la page de billetterie demande de cocher une case de compréhension avant l'achat.

### Aucun prérequis technique ni financier

L'inclusion demandée par la Maire a conduit à supprimer MetaMask et l'achat de crypto. Le backend crée le portefeuille, la Mairie le dote en ethers fictifs, et la connexion se fait par un code envoyé par email ou, sur mobile, par un mot de passe. Le citoyen n'a jamais à manipuler de clé.

### Un produit complet autour du contrat

Le contrat seul ne suffit pas à convaincre la Mairie, le responsable événementiel et le DSI. Le projet livre donc les outils d'exploitation (dashboard Mairie, disjoncteur, annulation et remboursement), d'animation (tirage en direct, chat, cadeaux, parrainage, EtherPoints chez les commerçants) et de supervision (sondes, métriques, CI). Le livrable de cadrage de l'équipe classait la boutique, les avantages partenaires, le parrainage et les badges comme des extensions : le code les implémente, avec les limites listées dans [Réel, simulé ou à venir](reel-ou-simule.md).

### Hors périmètre

- Les mises en monnaie réelle et l'achat de crypto-monnaie par les citoyens.
- Le déploiement sur le réseau Ethereum principal.
- La vérification d'identité au-delà de l'âge : la Mairie contrôle la majorité sur une photo de la pièce d'identité, sans conserver l'image ni vérifier l'authenticité du document par un service tiers.
