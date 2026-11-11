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
