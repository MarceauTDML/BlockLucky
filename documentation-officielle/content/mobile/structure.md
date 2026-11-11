# Stack et structure

L'application mobile est l'interface citoyenne de BlockLucky sur iOS et Android. Elle couvre le parcours du citoyen : connexion, achat et cadeau de tickets, tirage en direct, boutique des commerçants, profil, sécurité et RGPD. Elle n'a ni dashboard Mairie ni espace partenaire, qui n'existent que sur le [frontend web](../web/structure.md). Comme le web, elle ne gère aucune clé : le portefeuille de chaque citoyen est créé et utilisé par le backend (voir [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md)).

Le code se trouve dans [`mobile-app/`](src:mobile-app). Il est écrit en TypeScript avec Expo et React Native.

## Stack technique

Les versions viennent de [`mobile-app/package.json`](src:mobile-app/package.json). Contrairement au web, la plupart sont des plages (`^`, `~`) ; les versions exactes sont figées par `package-lock.json`.

| Rôle | Paquet | Version demandée |
|---|---|---|
| Plateforme | `expo` | ^58.0.22 |
| Moteur natif | `react-native` | 0.88.1 |
| Bibliothèque UI | `react` | 19.3.0 |
| Navigation | `@react-navigation/native`, `native-stack`, `bottom-tabs` | ^7.5.1, ^7.21.0, ^7.21.0 |
| État et appels API | `@reduxjs/toolkit`, `react-redux` | ^2.11.2, ^9.2.0 |
| Temps réel | `socket.io-client` | ^4.8.1 |
| Stockage sécurisé | `expo-secure-store` | ~58.0.2 |
| Presse-papiers | `expo-clipboard` | ~58.0.4 |
| Zones sûres | `react-native-safe-area-context` | ~5.10.1 |
| Images SVG distantes | `react-native-svg` | 15.16.0 |
| Langage | `typescript` | ~6.0.3 |
| Lint | `eslint` 8, `eslint-config-universe` | ^8.57.1, ^12.1.0 |

Node.js 22.12 ou plus est requis. La CI utilise la version du fichier `.nvmrc` à la racine.

### Dépendances installées mais inutilisées

Plusieurs paquets figurent dans `package.json` sans être importés dans `src/` :

| Paquet | Situation |
|---|---|
| `axios` | [`api.client.ts`](src:mobile-app/src/services/api.client.ts) crée un client axios avec des nouvelles tentatives, mais seul `API_BASE_URL` est importé ailleurs ; toutes les requêtes passent par `fetch` via RTK Query (voir [Résilience réseau](resilience.md)) |
| `expo-notifications` | Aucun import : pas de notification push native (voir [Temps réel et notifications](temps-reel-notifications.md)) |
| `lottie-react-native` | Aucun import ; les trois animations de `assets/animations` ne sont pas affichées |
| `react-native-gesture-handler` | Aucun import ; la carte à gratter utilise `PanResponder` de React Native |
| `expo-font` | Déclaré en plugin, mais aucun `useFonts` : les polices Inter de `assets/fonts` ne sont pas chargées et l'application utilise la police système |

Ces dépendances alourdissent le binaire sans rien apporter. Elles sont à retirer ou à brancher.

## Arborescence

```text
mobile-app/
├── __tests__/               tests Jest (sans exécuteur installé)
├── assets/
│   ├── animations/          confetti, loading-spinner, roulette-spin (Lottie, inutilisés)
│   ├── fonts/               Inter Regular, Medium, Bold (non chargées)
│   └── images/              icon, adaptive-icon, splash, favicon
├── src/
│   ├── App.tsx              point d'entrée
│   ├── navigation/          RootNavigator, AuthStack, MainTabs, SettingsStack
│   ├── screens/             16 écrans : auth, lottery, marketplace, settings
│   ├── components/
│   │   ├── lottery/         ChatBox, CountdownTimer, LeaderboardList, POAPBadge, RouletteAnimation, TicketCard, WinnerClaimCard
│   │   ├── marketplace/     PointsBalanceCard, RewardCard, ScratchCanvas
│   │   ├── ui/              AppButton, AppInput, AppText, BackButton, BottomSheet, Loader, ProgressBar
│   │   └── web3/            IntegratedWalletCard, IntegratedWalletButton, ExplorerLink
│   ├── hooks/               useAuth, useCitizenWallet, useSocket, usePoints, usePushNotifications, useAppTheme
│   ├── services/            api.client, secureStorage, socket.client, sentry.client
│   ├── store/               store Redux, RTK Query (api/) et slices
│   ├── theme/               ThemeProvider, colors, spacing, typography
│   ├── types/               types de l'API, de la navigation et de l'utilisateur
│   └── utils/               date, formatters, validators
├── app.json                 configuration Expo
├── eas.json                 profils EAS Build
├── babel.config.js          preset babel-preset-expo
├── metro.config.js          configuration Metro par défaut d'Expo
└── .env.example
```

## Point d'entrée

`package.json` déclare `"main": "src/App.tsx"`. [`mobile-app/src/App.tsx`](src:mobile-app/src/App.tsx) appelle `registerRootComponent(App)` et monte, dans cet ordre :

1. le `Provider` Redux avec le store unique de [`store/index.ts`](src:mobile-app/src/store/index.ts) ;
2. `SafeAreaProvider` ;
3. `ThemeProvider` (thème, langue, dimensions d'écran) ;
4. `AppShell`, qui choisit le style de la barre d'état selon le thème et rend `RootNavigator`.

Au montage, `App` appelle `sentryClient.init()`. Ce « client Sentry » ([`sentry.client.ts`](src:mobile-app/src/services/sentry.client.ts)) n'est pas le SDK Sentry : il garde en mémoire les 20 derniers rapports d'erreur et n'envoie rien à aucun serveur, même si `EXPO_PUBLIC_SENTRY_DSN` est renseigné.

```mermaid
flowchart TD
  A["App.tsx"] --> R["Provider Redux"]
  R --> S["SafeAreaProvider"]
  S --> T["ThemeProvider"]
  T --> SH["AppShell : StatusBar"]
  SH --> RN["RootNavigator"]
  RN -->|"non connecté"| AU["AuthStack"]
  RN -->|"connecté"| MT["MainTabs et écrans empilés"]
  RN --> BS["Feuilles globales BottomSheet"]
```

## Organisation du code applicatif

| Dossier | Contenu | Page détaillée |
|---|---|---|
| `src/navigation` | Navigateurs et feuilles modales globales | [Navigation et écrans](navigation-ecrans.md) |
| `src/store` | `baseApi` et trois fichiers d'endpoints, slices `auth`, `lottery`, `ui` | [État et appels API](etat-api.md) |
| `src/services` | Stockage sécurisé, client Socket.IO, client axios inutilisé, faux client Sentry | [Authentification](authentification.md), [Temps réel](temps-reel-notifications.md) |
| `src/hooks` | Hooks métier | [Portefeuille et loterie](portefeuille-loterie.md) |
| `src/theme`, `src/components/ui` | Couleurs, espacements, typographie et composants de base | [Thème et composants](theme-composants.md) |

Les imports sont relatifs (`../../hooks/useAuth`) : il n'y a pas d'alias `@/` comme sur le web.

## Configuration

[`mobile-app/.env.example`](src:mobile-app/.env.example) liste quatre variables. Expo intègre au bundle toute variable préfixée `EXPO_PUBLIC_` au moment du démarrage de Metro ou du build.

| Variable | Valeur d'exemple | Lue par |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:2053/api` | [`api.client.ts`](src:mobile-app/src/services/api.client.ts), donc `baseApi` |
| `EXPO_PUBLIC_WS_URL` | `http://localhost:2053` | [`socket.client.ts`](src:mobile-app/src/services/socket.client.ts) |
| `EXPO_PUBLIC_SENTRY_DSN` | vide | `sentry.client.ts`, qui ne l'utilise que pour écrire une trace locale |
| `EXPO_PUBLIC_WEB3AUTH_CLIENT_ID` | `blocklucky-etherbay-client` | aucun fichier : vestige d'une intégration Web3Auth abandonnée |

> [!IMPORTANT]
> `localhost` désigne le téléphone lui-même. Sur un appareil physique ou un émulateur Android, l'URL doit pointer vers l'adresse IP de la machine qui fait tourner le backend. La procédure est dans [Tester sur un téléphone](telephone-physique.md).

L'ancien README mentionne `EXPO_PUBLIC_CHAIN_ID=11155111` : aucune ligne du code ne lit cette variable.

## Scripts npm

| Commande | Effet |
|---|---|
| `npm start` | `expo start` : serveur Metro et QR code |
| `npm run android` | `expo start --android` |
| `npm run ios` | `expo start --ios` |
| `npm run web` | `expo start --web` ; les paquets `react-dom` et `react-native-web` ne sont pas installés, cette cible ne démarre donc pas en l'état |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint avec `universe/native` et `universe/shared/typescript-analysis` |

Il n'existe pas de script `test` et Jest n'est pas installé, bien que le dossier `__tests__` contienne trois fichiers et que l'ancien README cite `npm test` (voir [Builds et publication](builds-publication.md#tests)).

## Code mort à connaître

Le hook `useGaslessWeb3.ts`, qui présentait les achats comme sponsorisés par la plateforme, et le composant `WalletConnectButton.tsx`, qui invitait à « connecter » un portefeuille externe, ont été supprimés : plus rien ne les importait. Ils sont remplacés par [`useCitizenWallet`](portefeuille-loterie.md#le-hook-usecitizenwallet) et [`IntegratedWalletButton`](portefeuille-loterie.md#integratedwalletbutton). Les citoyens ne connectent pas de portefeuille externe.

La fonction `generateDeterministicWallet` de `useCitizenWallet` est, elle, encore utilisée par l'écran de connexion, pour une adresse que le backend ignore à la création du compte (voir [Authentification](authentification.md#adresse-envoyee-au-login)).
