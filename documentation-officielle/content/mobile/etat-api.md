# État et appels API

L'application mobile reprend l'architecture du web : un store Redux Toolkit, RTK Query pour les appels au backend et trois slices (`auth`, `lottery`, `ui`). Les noms des endpoints de loterie et de boutique, des tags et des actions sont proches de ceux du web, ce qui permet de passer d'un code à l'autre. Les différences tiennent au périmètre (pas d'endpoint d'administration ni de partenaire, mais des endpoints de mot de passe, de connexion Google et de vérification d'âge) et à plusieurs réglages absents côté mobile.

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
| `User` | `getProfile`, `getReferrals`, `getIdentityStatus` | `signIn`, `googleSignIn`, `submitIdentity`, `verify2FA`, `disable2FA`, `completeQuest`, `updatePreferences`, `buyTicket`, `giftTicket`, `claimReward`, `scratchTicket` |
| `Lottery` | `getLotteryStatus`, `getLeaderboard`, `getMyTransactions` | `buyTicket`, `giftTicket`, `claimPrize` ; événement `draw:winner` |
| `Wallet` | `getWallet` | `buyTicket`, `giftTicket`, `claimPrize` ; événement `draw:winner` |
| `Marketplace` | `getCatalog`, `getRewardDetail`, `getMyCodes` | `claimReward`, `scratchTicket` |
| `Points` | `getPointsBalance` | `signIn`, `googleSignIn`, `completeQuest`, `buyTicket`, `giftTicket`, `claimReward`, `scratchTicket` |
| `Quests` | `getQuests` | `completeQuest` |
| `Notifications` | `getNotifications` | aucune mutation |

Les tags `Admin`, `Partners`, `Audit`, `Identity` et `Accounts` du web n'existent pas. Quatre écrans rafraîchissent le statut de la loterie par `pollingInterval` :

| Écran | Période |
|---|---|
| Accueil | 30 s |
| Mes tickets | 30 s |
| Salle d'attente | 5 s |
| Tirage en direct | 4 s |

RTK Query ne rafraîchit pas les données au retour de l'application au premier plan, faute d'appel à `setupListeners`. Les intervalles de rafraîchissement s'arrêtent quand l'écran est démonté.

## Endpoints par fichier

### authApi

[`mobile-app/src/store/api/authApi.ts`](src:mobile-app/src/store/api/authApi.ts) déclare 26 endpoints :

| Groupe | Endpoints | Routes |
|---|---|---|
| Connexion et compte | `signIn`, `signUp`, `googleSignIn`, `forgotPassword`, `resetPassword` | `POST /auth/signin`, `/auth/signup`, `/auth/oauth/google`, `/auth/password/forgot`, `/auth/password/reset` |
| Email et mot de passe du compte connecté | `requestEmailChange`, `confirmEmailChange`, `changePassword` | `POST /auth/email/change`, `/auth/email/confirm`, `/auth/password/change` |
| Double authentification | `setup2FA`, `verify2FA`, `disable2FA`, `logout` | `POST /auth/2fa/setup`, `/auth/2fa/verify`, `/auth/2fa/disable`, `/auth/logout` |
| Vérification d'âge | `getIdentityStatus`, `submitIdentity` | `GET /user/identity`, `POST /user/identity` |
| Profil et parrainage | `getProfile`, `getReferrals`, `getQuests`, `completeQuest`, `updatePreferences`, `getNotifications` | Routes `/user/*` |
| Paramètres | `updateProfileNames`, `sendSupportMessage` | `PATCH /user/profile`, `POST /user/support` |
| RGPD | `exportGdprData`, `requestGdprDeletion`, `confirmGdprDeletion` | `GET /user/gdpr/export`, `POST /user/gdpr/delete-request`, `POST /user/gdpr/confirm-delete` |
| Introduction | `getOnboarding` | `GET /auth/onboarding` |

L'endpoint `socialLogin` (`POST /auth/login`), que le web utilise toujours, a été retiré du mobile, de même que `appleSignIn` (connexion Apple supprimée) et `setResponsibleLimit` (route `PUT /user/responsible-limit` supprimée).

| Endpoint | Remarque |
|---|---|
| `logout` | Argument `{ allDevices }` seul ; le jeton part par `prepareHeaders` |
| `getOnboarding` | Déclaré mais jamais appelé : l'introduction est codée en dur |
| `signUp` | Envoie `acceptTerms: true` et `isAdultConfirmed: true`, exigés par le backend |
| `verify2FA` | Argument `{ userId, code, loginTicket? }` ; le ticket accompagne un code de l'application après le premier facteur. La réponse peut demander un second facteur (`requiresTwoFactor`, `twoFactorMethod`, `userId`, `loginTicket`) au lieu d'une session |
| `updatePreferences` | Accepte `theme`, `language`, `pushNotificationsEnabled` et `notifications` (objet partiel `drawReminders`, `results`, `rewards`, `referrals`) ; renvoie les préférences complètes |
| `changePassword` | Renvoie une nouvelle session comme `signIn` ; l'écran la passe à `applyRenewedSession` de `useAuth`, qui enregistre le nouveau jeton |
| `updateProfileNames`, `confirmEmailChange` | La réponse est reportée dans le slice et le stockage sécurisé par `patchUser` de `useAuth` |
| `exportGdprData` | Déclaré en mutation alors que la route est un `GET` : l'appel n'a lieu qu'à l'appui sur le bouton et le résultat n'est pas mis en cache |

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

`triggerDraw` et `refundRound`, réservés à la Mairie, n'existent pas sur mobile. Les types de [`api.types.ts`](src:mobile-app/src/types/api.types.ts) déclarent les champs ajoutés par le backend : `phase`, `waitingRoomOpensAt`, `revealAt`, `participants` et `maxParticipants` pour le tour ; `ticketNumber`, `isWinner`, `winningTicketNumber` et `prizeEth` pour les tickets.

### marketplaceApi

[`mobile-app/src/store/api/marketplaceApi.ts`](src:mobile-app/src/store/api/marketplaceApi.ts)

| Endpoint | Méthode et route | Type |
|---|---|---|
| `getCatalog` | `GET /marketplace/catalog` | query |
| `getRewardDetail` | `GET /marketplace/rewards/:rewardId` | query |
| `getPointsBalance` | `GET /marketplace/points` | query |
| `claimReward` | `POST /marketplace/claim` | mutation |
| `scratchTicket` | `POST /marketplace/scratch` avec `{ offer: 'violet' \| 'lucky' }` | mutation |
| `getMyCodes` | `GET /marketplace/my-codes` | query |

La validation en caisse (`redeemCode`) est propre à l'espace partenaire du web. Il n'y a pas d'`adminApi` ni de `partnersApi` sur mobile.

Les routes et leurs schémas sont décrits dans [Référence de l'API](../backend/reference-api.md).

> [!WARNING]
> `GET /marketplace/points` renvoie `{ balance, history }` (voir `getUserLedgerHistory` dans [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts)). Le hook [`usePoints`](src:mobile-app/src/hooks/usePoints.ts) attend `data.pointsBalance`, qui n'existe pas, et renvoie de toute façon `user.pointsBalance` du slice `auth`. Le solde affiché n'est donc mis à jour que par les réponses des actions faites dans l'application (`newPointsBalance` d'un achat, `newBalance` d'un ticket à gratter, nouvelle connexion). Le web lit `balance` en priorité. De plus, aucun des deux clients ne reçoit `ledgerIntegrityValid` : l'indicateur d'intégrité du registre de points vaut toujours « valide » par défaut.

## Slices Redux

### Slice auth

[`mobile-app/src/store/slices/authSlice.ts`](src:mobile-app/src/store/slices/authSlice.ts)

| Champ | Rôle |
|---|---|
| `isAuthenticated`, `token`, `user` | Session ; `isAuthenticated` commande l'arbre de navigation |
| `hasSeenOnboarding` | Introduction vue pendant cette exécution |
| `pendingTwoFactorUserId`, `pendingTwoFactorMethod` | Vérification en cours (l'écran utilise plutôt ses paramètres de route) |

Actions : `completeOnboarding`, `setCredentials`, `setPendingTwoFactor`, `updateUserPoints`, `updateUserProfile`, `logout`. Il n'y a pas d'action d'hydratation ni de champ `hydrated`. `useAuth` dérive de `user` trois valeurs : `hasPassword`, `ageVerificationStatus` (`NONE` par défaut) et `isAgeVerified`.

### Slice lottery

[`mobile-app/src/store/slices/lotterySlice.ts`](src:mobile-app/src/store/slices/lotterySlice.ts) contient `onlineWaitingUsers` (0 au départ), `liveChatMessages` (vide au départ, 100 au plus, sans doublon d'identifiant), `lastWinnerAnnouncement` et `isRouletteSpinning`. Par rapport au web, il manque `socketConnected`.

### Slice ui

[`mobile-app/src/store/slices/uiSlice.ts`](src:mobile-app/src/store/slices/uiSlice.ts) pilote les fenêtres rendues par `RootNavigator` :

| Champ | Fenêtre ou effet | Déclencheur |
|---|---|---|
| `pointsPopup` | « +n EtherPoints » | Événement `points:awarded`, validation d'une mission, nouvel essai d'achat réussi |
| `retryModal` | « Réseau encombré » et bouton « Réessayer l'achat » | Seulement `retryPurchaseFromQueue`, lui-même appelé par ce bouton |
| `queueModal` | « Forte affluence », position 245 codée en dur | Seulement `retryPurchaseFromQueue` |
| `sentryModal` | Information réseau ou erreur de transaction | Seulement `retryPurchaseFromQueue` |
| `osPushBanner` | Bandeau de notification simulé (4,5 s) | `triggerSimulatedOsPush`, plus appelé |
| `notificationDrawerOpen` | Ancien tiroir des notifications | Plus lu |
| `fallbackNetworkActive` | Déclaré avec `setFallbackNetworkActive` | Jamais lu ni modifié |

Depuis la refonte, la billetterie et le cadeau affichent leurs propres fenêtres à partir du résultat de `useCitizenWallet`. Plus aucun écran n'ouvre `retryModal` : les fenêtres globales de nouvel essai, d'affluence et d'information ne sont accessibles que par une chaîne qui ne démarre jamais. Le slice et ces fenêtres sont à retirer ou à rebrancher.

## Gestion des erreurs

Les erreurs de transaction sont traduites par `classifyTicketError` et `describeBlockchainError` de `useCitizenWallet` (voir [Portefeuille et loterie](portefeuille-loterie.md#messages-d-erreur)). Les autres écrans utilisent des fonctions de lecture du message du backend avec un texte de repli : `getErrorMessage` ([`authErrors.ts`](src:mobile-app/src/components/auth/authErrors.ts) et [`drawFormat.ts`](src:mobile-app/src/components/draw/drawFormat.ts)) et `getApiErrorMessage` ([`lotteryFormat.ts`](src:mobile-app/src/components/lottery/lotteryFormat.ts) et [`apiErrors.ts`](src:mobile-app/src/components/marketplace/apiErrors.ts)). Ces fonctions sont dupliquées dans plusieurs dossiers. Une panne réseau (`FETCH_ERROR`) produit le texte de repli propre à chaque écran, sans message « serveur injoignable » commun.

Les messages du backend sont en français et s'affichent tels quels quand l'interface est en anglais.
