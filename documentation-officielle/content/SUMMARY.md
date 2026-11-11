# Sommaire

- [Accueil](README.md)
- [Comment lire cette documentation](accueil/lire-la-documentation.md)
- [Le projet en chiffres](accueil/projet-en-chiffres.md)

## 1. Présentation du projet

- [Contexte et kickoff](presentation/contexte.md)
- [Besoins des parties prenantes](presentation/besoins.md)
- [Objectifs et indicateurs](presentation/objectifs-indicateurs.md)
- [Profils et parcours](presentation/profils-parcours.md)
- [Catalogue des fonctionnalités](presentation/fonctionnalites.md)
- [Volet marketing](presentation/marketing.md)
- [Réel, simulé ou à venir](presentation/reel-ou-simule.md)
- [Grille de compétences](presentation/competences.md)
- [Historique et feuille de route](presentation/historique.md)

## 2. Démarrage rapide

- [Prérequis](demarrage/prerequis.md)
- [Infrastructure locale](demarrage/infrastructure-locale.md)
- [Lancer les applications](demarrage/lancer-les-applications.md)
- [Comptes de démonstration et connexion](demarrage/comptes-et-connexion.md)
- [Stack complète en conteneurs](demarrage/stack-conteneurs.md)
- [Dépannage](demarrage/depannage.md)

## 3. Architecture

- [Vue d'ensemble](architecture/vue-ensemble.md)
- [Organisation du dépôt](architecture/organisation-depot.md)
- [Choix techniques](architecture/choix-techniques.md)
- [Versions de la stack](architecture/versions.md)
- [Décisions d'architecture](architecture/adr/index.md)
  - [0001 Monolithe modulaire](architecture/adr/0001-monolithe-modulaire.md)
  - [0002 Redis et repli mémoire](architecture/adr/0002-redis-files-et-repli-memoire.md)
  - [0003 Migrations expand et contract](architecture/adr/0003-migrations-expand-contract.md)
  - [0004 Smart contract et portefeuille intégré](architecture/adr/0004-smart-contract-portefeuille-integre.md)
- [Flux métier](architecture/flux/index.md)
  - [Inscription et portefeuille](architecture/flux/inscription.md)
  - [Achat et cadeau de ticket](architecture/flux/achat-cadeau.md)
  - [Tirage et versement de la cagnotte](architecture/flux/tirage.md)
  - [Annulation et remboursement](architecture/flux/annulation.md)
  - [Disjoncteur](architecture/flux/disjoncteur.md)
  - [Échange de récompense](architecture/flux/recompense.md)
  - [Suppression RGPD](architecture/flux/suppression-rgpd.md)
- [Conventions de code](architecture/conventions.md)

## 4. Smart contracts

- [Vue d'ensemble](smart-contracts/index.md)
- [Pourquoi Ethereum, Hardhat et Chainlink](smart-contracts/choix.md)
- [Contrat BlockLucky](smart-contracts/blocklucky.md)
- [Cycle de vie d'un tour](smart-contracts/cycle-tour.md)
- [Référence de BlockLucky](smart-contracts/reference-blocklucky.md)
- [Tirage Chainlink VRF](smart-contracts/chainlink-vrf.md)
- [Chainlink Automation](smart-contracts/automation.md)
- [Badge POAP](smart-contracts/poap.md)
- [Référence de BlockLuckyPOAP](smart-contracts/reference-poap.md)
- [Sécurité du contrat](smart-contracts/securite.md)
- [Tests, fuzzing et couverture](smart-contracts/tests.md)
- [Blockchain locale](smart-contracts/blockchain-locale.md)
- [Déploiement sur Sepolia](smart-contracts/sepolia.md)
- [Utiliser Remix](smart-contracts/remix.md)
- [Exploitation du contrat](smart-contracts/exploitation.md)
- [Limites connues](smart-contracts/limites.md)

## 5. Intégration blockchain du backend

- [Vue d'ensemble](integration-blockchain/index.md)
- [Mode onchain ou simulé](integration-blockchain/modes.md)
- [Portefeuilles intégrés](integration-blockchain/portefeuilles.md)
- [Client RPC et compte opérateur](integration-blockchain/client-rpc.md)
- [Passerelle du contrat et erreurs](integration-blockchain/passerelle.md)
- [Indexeur d'événements](integration-blockchain/indexeur.md)
- [Keeper du tirage](integration-blockchain/keeper.md)
- [File d'actions on-chain](integration-blockchain/actions.md)
- [Relais temps réel](integration-blockchain/relais-temps-reel.md)
- [Métadonnées POAP](integration-blockchain/metadonnees-poap.md)
- [Tests sur une vraie chaîne](integration-blockchain/tests.md)

## 6. Base de données

- [Modèle de données](base-de-donnees/modele.md)
- [Dictionnaire de données](base-de-donnees/dictionnaire.md)
- [Index et contraintes](base-de-donnees/index-contraintes.md)
- [Données Redis](base-de-donnees/redis.md)
- [Migrations](base-de-donnees/migrations.md)
- [Seed](base-de-donnees/seed.md)
- [Reconstruire depuis la chaîne](base-de-donnees/reconstruction.md)
- [Performance et sauvegardes](base-de-donnees/performance-sauvegardes.md)

## 7. Backend

- [Structure et cycle d'une requête](backend/structure.md)
- [Configuration](backend/configuration.md)
- [Variables d'environnement](backend/variables-environnement.md)
- [Modules métier](backend/modules/index.md)
  - [Authentification](backend/modules/auth.md)
  - [Loterie](backend/modules/loterie.md)
  - [Boutique et récompenses](backend/modules/boutique.md)
  - [Partenaires](backend/modules/partenaires.md)
  - [Utilisateur et RGPD](backend/modules/utilisateur.md)
  - [Analytique](backend/modules/analytique.md)
  - [Administration Mairie](backend/modules/administration.md)
  - [Webhooks et système](backend/modules/webhooks-systeme.md)
- [Référence de l'API](backend/reference-api.md)
- [Réponses et erreurs](backend/reponses-erreurs.md)
- [Services transverses](backend/services.md)
- [Temps réel Socket.IO](backend/socket-io.md)
- [Files et workers](backend/files-workers.md)
- [Observabilité](backend/observabilite.md)
- [Tests](backend/tests.md)
