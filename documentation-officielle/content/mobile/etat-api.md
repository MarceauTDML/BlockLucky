# État et appels API

L'application mobile reprend l'architecture du web : un store Redux Toolkit, RTK Query pour les appels au backend et trois slices (`auth`, `lottery`, `ui`). Les noms des endpoints, des tags et des actions sont presque identiques, ce qui permet de passer d'un code à l'autre. Les différences tiennent au périmètre (pas d'endpoint d'administration ni de partenaire) et à plusieurs réglages absents côté mobile.

Le store est créé une fois au chargement du module [`mobile-app/src/store/index.ts`](src:mobile-app/src/store/index.ts) (`export const store`) et fourni par `App.tsx`. Les hooks typés `useAppDispatch` et `useAppSelector` sont exportés depuis ce fichier.

## Le client de base

[`mobile-app/src/store/api/baseApi.ts`](src:mobile-app/src/store/api/baseApi.ts) déclare l'unique `createApi` :

```typescript
export const baseApi = createApi({
  reducerPath: 'blockluckyApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await secureStorage.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Lottery', 'Marketplace', 'Points', 'Quests', 'Notifications', 'Wallet'],
  endpoints: () => ({}),
});
```

| Réglage | Mobile | Web |
|---|---|---|
| `baseUrl` | `EXPO_PUBLIC_API_URL` ou `http://localhost:2053/api` | `NEXT_PUBLIC_API_URL` ou la même valeur |
| Source du jeton | `secureStorage.getToken()` (cache mémoire puis SecureStore) | `state.auth.token` |
| Délai maximal | aucun : une requête bloquée attend le délai du système | 15 000 ms |
| Garde 401 | aucune | efface la session |
| Nouvelles tentatives | aucune (le client axios qui en fait n'est pas utilisé) | aucune |
| En-tête `Idempotency-Key` | non envoyé | non envoyé |

Le jeton est lu dans SecureStore et non dans le store Redux. Il est donc envoyé même quand `isAuthenticated` est faux, par exemple depuis l'écran de connexion après un redémarrage (voir [Authentification et stockage sécurisé](authentification.md#session-au-demarrage)).

`API_BASE_URL` est importé de [`api.client.ts`](src:mobile-app/src/services/api.client.ts). Ce fichier crée aussi un client axios avec intercepteurs, mais celui-ci n'est utilisé nulle part (voir [Résilience réseau](resilience.md)).

## Tags de cache

| Tag | Fourni par | Invalidé par |
|---|---|---|
| `User` | `getProfile`, `getReferrals` | `socialLogin`, `verify2FA`, `disable2FA`, `completeQuest`, `setResponsibleLimit`, `updatePreferences`, `buyTicket`, `giftTicket`, `claimReward` |
| `Lottery` | `getLotteryStatus`, `getLeaderboard`, `getMyTransactions` | `buyTicket`, `giftTicket`, `claimPrize` ; événement `draw:winner` |
| `Wallet` | `getWallet` | `buyTicket`, `giftTicket`, `claimPrize` ; événement `draw:winner` |
| `Marketplace` | `getCatalog`, `getRewardDetail`, `getMyCodes` | `claimReward` |
| `Points` | `getPointsBalance` | `socialLogin`, `completeQuest`, `buyTicket`, `giftTicket`, `claimReward` |
| `Quests` | `getQuests` | `completeQuest` |
| `Notifications` | `getNotifications` | aucune mutation |

Les tags `Admin`, `Partners` et `Audit` du web n'existent pas. Aucune requête n'utilise `pollingInterval` : le statut de la loterie n'est rafraîchi qu'au montage d'un écran, après une mutation, ou à la réception de `draw:winner`. RTK Query ne rafraîchit pas non plus les données au retour de l'application au premier plan, faute d'appel à `setupListeners`.

## Endpoints par fichier

### authApi

[`mobile-app/src/store/api/authApi.ts`](src:mobile-app/src/store/api/authApi.ts) déclare les mêmes 16 endpoints que le web : `getOnboarding`, `socialLogin`, `setup2FA`, `verify2FA`, `disable2FA`, `logout`, `getProfile`, `getReferrals`, `getQuests`, `completeQuest`, `setResponsibleLimit`, `updatePreferences`, `getNotifications`, `exportGdprData`, `requestGdprDeletion`, `confirmGdprDeletion`.

Deux différences :

| Endpoint | Différence |
|---|---|
| `logout` | Argument `{ allDevices }` seul ; le jeton part par `prepareHeaders` |
| `getOnboarding`, `getProfile` | Déclarés mais jamais appelés par un écran : l'introduction est codée en dur et le profil n'est pas rechargé après la connexion |

### lotteryApi

[`mobile-app/src/store/api/lotteryApi.ts`](src:mobile-app/src/store/api/lotteryApi.ts)

| Endpoint | Méthode et route | Type |
|---|---|---|
| `getLotteryStatus` | `GET /lottery/status` | query |
| `getLeaderboard` | `GET /lottery/leaderboard` | query |
| `getTransparencyCharter` | `GET /lottery/transparency-charter` | query |
| `getMyTransactions` | `GET /lottery/my-tickets?page=1&limit=25` par défaut | query |
| `getWallet` | `GET /lottery/wallet` | query |
| `buyTicket` | `POST /lottery/buy` | mutation |
| `giftTicket` | `POST /lottery/gift` | mutation |
| `claimPrize` | `POST /lottery/claim-prize` | mutation |

`triggerDraw` et `refundRound`, réservés à la Mairie, n'existent pas sur mobile.

### marketplaceApi

[`mobile-app/src/store/api/marketplaceApi.ts`](src:mobile-app/src/store/api/marketplaceApi.ts)

| Endpoint | Méthode et route | Type |
|---|---|---|
| `getCatalog` | `GET /marketplace/catalog` | query |
| `getRewardDetail` | `GET /marketplace/rewards/:rewardId` | query |
| `getPointsBalance` | `GET /marketplace/points` | query |
| `claimReward` | `POST /marketplace/claim` | mutation |
| `getMyCodes` | `GET /marketplace/my-codes` | query |

La validation en caisse (`redeemCode`) est propre à l'espace partenaire du web. Il n'y a pas d'`adminApi` ni de `partnersApi` sur mobile.

Les routes et leurs schémas sont décrits dans [Référence de l'API](../backend/reference-api.md).

> [!WARNING]
> `GET /marketplace/points` renvoie `{ balance, history }` (voir `getUserLedgerHistory` dans [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts)). Le hook [`usePoints`](src:mobile-app/src/hooks/usePoints.ts) lit `data.pointsBalance`, qui n'existe pas : le solde affiché retombe sur `user.pointsBalance`, mis à jour seulement par les actions faites dans l'application. Le web lit `balance` en priorité. De plus, aucun des deux clients ne reçoit `ledgerIntegrityValid` : l'indicateur d'intégrité du registre de points vaut toujours « valide » par défaut.

## Slices Redux

### Slice auth

[`mobile-app/src/store/slices/authSlice.ts`](src:mobile-app/src/store/slices/authSlice.ts)

| Champ | Rôle |
|---|---|
| `isAuthenticated`, `token`, `user` | Session ; `isAuthenticated` commande l'arbre de navigation |
| `hasSeenOnboarding` | Introduction vue pendant cette exécution |
| `pendingTwoFactorUserId`, `pendingTwoFactorMethod` | Vérification en cours (l'écran utilise plutôt ses paramètres de route) |

Actions : `completeOnboarding`, `setCredentials`, `setPendingTwoFactor`, `updateUserPoints`, `updateUserProfile`, `logout`. Il n'y a pas d'action d'hydratation ni de champ `hydrated`.

### Slice lottery

[`mobile-app/src/store/slices/lotterySlice.ts`](src:mobile-app/src/store/slices/lotterySlice.ts) contient `onlineWaitingUsers`, `liveChatMessages` (100 au plus, deux messages d'accueil codés en dur et horodatés au chargement), `lastWinnerAnnouncement` et `isRouletteSpinning`. Par rapport au web, il manque `socketConnected` et le dédoublonnage des messages par identifiant.

### Slice ui

[`mobile-app/src/store/slices/uiSlice.ts`](src:mobile-app/src/store/slices/uiSlice.ts) pilote les feuilles rendues par `RootNavigator` :

| Champ | Feuille ou effet |
|---|---|
| `pointsPopup` | « Points crédités » |
| `retryModal` | « Réseau encombré » et bouton « Réessayer l'achat » |
| `queueModal` | « File d'attente active », position 245 codée en dur |
| `sentryModal` | Information réseau ou erreur de transaction |
| `notificationDrawerOpen` | Tiroir des notifications |
| `osPushBanner` | Bandeau de notification simulé (4,5 s) |
| `fallbackNetworkActive` | Déclaré avec `setFallbackNetworkActive`, jamais lu ni modifié |

`retryModal` ne garde pas la quantité demandée : le bouton de la feuille relance toujours `purchaseTickets(1, retryAttempt)`. Un achat de cinq tickets interrompu par une erreur 503 est donc rejoué pour un seul ticket. Le web conserve la quantité.

## Gestion des erreurs

Les erreurs de transaction sont traduites par `describeBlockchainError` et `useCitizenWallet` (voir [Portefeuille et loterie](portefeuille-loterie.md#messages-d-erreur)). Les autres écrans affichent `err?.data?.message` ou un texte de repli. Il n'y a pas d'équivalent de `getErrorMessage` : une panne réseau (`FETCH_ERROR`) produit le texte de repli propre à chaque écran, sans message « serveur injoignable » commun.

Les messages du backend sont en français et s'affichent tels quels quand l'interface est en anglais.
