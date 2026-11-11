# BlockLucky Mobile App — Ville d'EtherBay

Application mobile citoyenne multiplateforme (iOS & Android) propulsée par **React Native 0.88**, **Expo SDK 58** et **TypeScript 6**. Elle constitue l'interface mobile officielle de la **Grande Loterie Citoyenne de Fin d'Année** et du programme d'économie circulaire **EtherPoints** de la Ville d'EtherBay.

---

## Fonctionnalités Clés

1. **Authentification Web3 Social Login & Majorité 18+ (`src/screens/auth/`)**
   - Connexion sans friction via **Google** ou **Email Passwordless** avec création par le backend d'un portefeuille Ethereum citoyen intégré (custodial), crédité d'une dotation de bienvenue en ethers fictifs par la Mairie.
   - Vérification réglementaire obligatoire de majorité (18 ans révolus) et sélection de la tranche d'âge.
   - Double authentification (**2FA**) complète par application d'authentification (**TOTP**) ou par code **Email**, avec codes de secours.
   - Carrousel d'introduction (**Onboarding**) bilingue en 4 étapes.

2. **Loterie Municipale On-Chain & Tirage Temps Réel (`src/screens/lottery/`)**
   - **Tableau de bord temps réel (`HomeScreen`)** : Compte à rebours connecté au Smart Contract, cagnotte en ETH, jauge de participation communautaire avec paliers déblocables, classement des ambassadeurs (**Leaderboard**) et indicateur de haute disponibilité du nœud Ethereum.
   - **Billetterie 1-Clic (`BuyTicketScreen`)** : Achat de tickets signé par le portefeuille BlockLucky intégré du citoyen, qui règle le prix du ticket et les frais de réseau en ethers fictifs, affichage du solde et envoi de **Tickets Cadeaux** par email à ses proches.
   - **Salle de Tirage en Direct (`LiveDrawScreen`)** : Salle d'attente temps réel (**Socket.IO**), roue de tirage certifiée **Chainlink VRF v2.5** (indication « Mode démonstration » en mode simulé), retrait de la cagnotte en secours pour le gagnant et discussion en direct entre citoyens avec réactions rapides.
   - **Historique & Galerie POAP (`TransactionHistoryScreen`)** : Liste des tickets avec liens vers l'explorateur blockchain (quand le réseau en fournit un) et galerie des certificats commémoratifs **POAP** débloqués.

3. **Boutique Partenaires & Cartes à Gratter (`src/screens/marketplace/`)**
   - **Catalogue des commerçants (`RewardsCatalogScreen` & `RewardDetailScreen`)** : Consultation des offres locales d'EtherBay, jauge de stock en temps réel et vérification d'intégrité du registre **SHA-256**.
   - **Carte à gratter interactive (`ScratchCardScreen`)** : Surface tactile à gratter au doigt (`PanResponder`) dévoilant le code promotionnel unique.
   - **Portefeuille de codes (`MyCodesScreen`)** : Conservation des codes débloqués à présenter en magasin.

4. **Profil, Missions, Jeu Responsable & RGPD (`src/screens/settings/`)**
   - **Passeport Citoyen (`ProfileScreen`)** : Bascule dynamique du thème (**Clair / Sombre**), changement instantané de langue (**FR / EN**), lien de parrainage partageable en 1 clic et **Missions citoyennes** rémunérées en EtherPoints.
   - **Sécurité & Jeu Responsable (`SecurityScreen`)** : Plafond personnel de tickets par tirage, gestion de la 2FA et contrôle d'accès **RBAC**.
   - **Conformité RGPD (`GDPRScreen`)** : Export intégral des données personnelles au format **JSON** (portabilité) et procédure d'anonymisation définitive On/Off-Chain (droit à l'oubli).
   - **Charte de Transparence (`HelpSupportScreen`)** : Consultation de la charte officielle de la DSI d'EtherBay et simulateur de bannière de notification Push OS.

---

## Architecture Technique

```text
mobile-app/
├── assets/                  # Polices Inter, icônes et animations Lottie
├── __tests__/               # Suites de tests unitaires Jest
├── src/
│   ├── App.tsx              # Point d'entrée Expo, Redux Provider, SafeAreaProvider et ThemeProvider
│   ├── theme/               # Design System minimaliste (couleurs, typographie et espacements adaptatifs)
│   ├── types/               # Interfaces TypeScript (API, Navigation, Utilisateur)
│   ├── utils/               # Formatage d'adresses Web3, dates et validateurs
│   ├── services/            # Client HTTP, Socket.IO temps réel, stockage sécurisé et Sentry
│   ├── store/               # Redux Toolkit + RTK Query (authApi, lotteryApi, marketplaceApi)
│   ├── hooks/               # Hooks métier (useAuth, useCitizenWallet, usePoints, useSocket, useAppTheme)
│   ├── components/          # Composants UI réutilisables, Loterie, Boutique et Web3
│   ├── screens/             # 16 écrans répartis en 4 domaines (auth, lottery, marketplace, settings)
│   └── navigation/          # Navigation React Navigation (RootNavigator, AuthStack, MainTabs, SettingsStack)
├── app.json                 # Configuration Expo SDK 58
├── package.json             # Dépendances et scripts npm
└── tsconfig.json            # Configuration TypeScript stricte
```

---

## Prérequis & Installation

1. Assurez-vous que le serveur **Backend BlockLucky** est démarré (par défaut sur le port configuré dans `backend/.env`, ex: `2053` ou `3000`).
2. Installez les dépendances dans le dossier `mobile-app` :

```bash
cd mobile-app
npm install
```

3. Configurez le fichier `.env` à partir de `.env.example` avec l'adresse IP locale de votre machine hôte pour qu'un téléphone physique sous **Expo Go** puisse joindre le backend :

```env
EXPO_PUBLIC_API_URL=http://<VOTRE_IP_LOCALE>:2053/api
EXPO_PUBLIC_WS_URL=http://<VOTRE_IP_LOCALE>:2053
EXPO_PUBLIC_CHAIN_ID=11155111
```

---

## Commandes Utiles

- **Lancer le serveur de développement Expo (avec nettoyage du cache Metro)** :
  ```bash
  npx expo start -c
  ```
- **Vérifier le typage TypeScript** :
  ```bash
  npm run typecheck
  ```
- **Exécuter les tests unitaires** :
  ```bash
  npm test
  ```
