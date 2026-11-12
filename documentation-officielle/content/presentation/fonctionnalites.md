# Catalogue des fonctionnalités

Ce catalogue liste toutes les fonctionnalités présentes dans le code, regroupées par domaine. Pour chacune, il indique sur quels supports elle est disponible, la route ou le contrat qui la porte et son état réel.

## Lire le catalogue

| Colonne | Valeurs |
|---|---|
| Web | Page du frontend web (`frontend-web/src/app/`) |
| Mobile | Écran de l'application (`mobile-app/src/screens/`) ; un tiret signifie absent du mobile |
| État | **Réel** : fonctionne de bout en bout avec le contrat en mode onchain. **Partiel** : fonctionne avec une limite notable. **Fictif** : données ou comportement codés en dur |

Les limites sont détaillées dans [Réel, simulé ou à venir](reel-ou-simule.md). La liste exhaustive des routes est dans la [référence de l'API](../backend/reference-api.md).

## Smart contract

Fonctions portées par [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) et [`smart-contract/contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol).

| Fonctionnalité | Fonctions | État |
|---|---|---|
| Tours successifs, ouverture automatique du suivant | `_openRound`, appelé à la fin de chaque tour terminé ou annulé | Réel |
| Achat de tickets au prix exact | `buyTickets`, `buyTicketsFor` (achat pour un tiers) | Réel |
| Fermeture par capacité ou par durée | `isDrawReady`, `requestDraw` appelable par tous | Réel |
| Tirage aléatoire vérifiable | Chainlink VRF v2.5, `fulfillRandomWords` | Réel (coordinateur simulé en local) |
| Relance d'un tirage sans réponse de l'oracle | `retryDraw` après `drawTimeout` | Réel |
| Annulation et remboursement intégral | `closeExpiredRound`, `cancelRound`, `claimRefund` | Réel |
| Versement de la cagnotte au gagnant | `claimPrize` (retrait en mode pull) | Réel |
| Commission de la Mairie plafonnée | `feeBps` (10 % par défaut, 20 % au plus), `withdrawFees` vers `treasury` | Réel |
| Disjoncteur | `pause`, `unpause` (rôle `PAUSER_ROLE`) | Réel |
| Plafond de tickets par participant | `maxTicketsPerPlayer` (1 par défaut au déploiement, `MAX_TICKETS_PER_PLAYER`) | Réel |
| Compatibilité Chainlink Automation | `checkUpkeep`, `performUpkeep` | Réel, non enregistré auprès de Chainlink |
| Badge de participation non transférable | `mintBadge` (ERC-721, un par participant et par tour) | Réel |

Voir [Contrat BlockLucky](../smart-contracts/blocklucky.md) et [Badge POAP](../smart-contracts/poap.md).

## Compte et connexion

| Fonctionnalité | Web | Mobile | Route ou fichier | État |
|---|---|---|---|---|
| Onboarding illustré | `/connexion` (quatre écrans) | `OnboardingScreen` (trois écrans écrits dans l'écran) | `GET /api/v1/auth/onboarding` pour le web | Réel |
| Déclaration de majorité obligatoire et tranche d'âge | `/connexion` | - | Validée par `socialLoginSchema` | Réel (déclaratif) |
| Connexion sans mot de passe par code à 6 chiffres | `/connexion`, `/connexion/verification` | - | `POST /api/v1/auth/login`, `POST /api/v1/auth/2fa/verify` | Réel |
| Inscription par email et mot de passe, confirmée par un code à 6 chiffres | - | `SignUpScreen`, `Verify2FAScreen` | `POST /api/v1/auth/signup`, `POST /api/v1/auth/2fa/verify` | Réel |
| Connexion par email et mot de passe | - | `SignInScreen` | `POST /api/v1/auth/signin` | Réel |
| Mot de passe oublié et réinitialisation par code | - | `ForgotPasswordScreen`, `ResetPasswordScreen` | `POST /api/v1/auth/password/forgot`, `POST /api/v1/auth/password/reset` | Réel |
| Connexion Google et Apple | - | `SignInScreen`, `SignUpScreen` | `POST /api/v1/auth/oauth/google`, `POST /api/v1/auth/oauth/apple` | Partiel : 503 tant que `GOOGLE_CLIENT_IDS` ou `APPLE_CLIENT_IDS` est vide |
| Vérification d'âge par pièce d'identité validée par la Mairie | `/profil/identite` | `VerifyAgeScreen` | `POST /api/v1/user/identity`, `GET /api/v1/user/identity` | Réel |
| Double authentification TOTP avec codes de secours | `/profil/securite/2fa` | `Setup2FAScreen` | `POST /api/v1/auth/2fa/setup` | Réel |
| Double authentification par email | `/profil/securite/2fa` | `Setup2FAScreen` | même route, méthode `EMAIL` | Réel |
| Désactivation de la 2FA (code ou connexion récente) | `/profil/securite` | `SecurityScreen` | `POST /api/v1/auth/2fa/disable` | Réel |
| Déconnexion de l'appareil, ou de tous les appareils | `/profil/securite` | `ProfileScreen` (cet appareil seulement) | `POST /api/v1/auth/logout` | Réel |
| Changement d'adresse email confirmé par un code envoyé à la nouvelle adresse | - | `SecurityScreen`, `ChangeEmailScreen` | `POST /api/v1/auth/email/change`, `POST /api/v1/auth/email/confirm` | Réel |
| Création ou changement du mot de passe, avec déconnexion des autres appareils | - | `SecurityScreen`, `ChangePasswordScreen` | `POST /api/v1/auth/password/change` | Réel |
| Alertes de sécurité par email | - | - | Template `security-alert` | Réel |
| Verrouillage après codes ou mots de passe erronés | - | - | 5 essais par code, 10 échecs par heure et par compte | Réel |

Détails : [Authentification](../backend/modules/auth.md), [Authentification et 2FA](../securite/authentification.md).

## Portefeuille intégré

| Fonctionnalité | Web | Mobile | Route ou fichier | État |
|---|---|---|---|---|
| Création d'un portefeuille Ethereum par citoyen, clé chiffrée AES-256-GCM | automatique | automatique | [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) | Réel |
| Dotation de bienvenue en ethers fictifs (0,5 ETH par défaut, une fois) | automatique | automatique | `WELCOME_GRANT_WEI` | Réel |
| Adresse, solde et lien vers l'explorateur | `/accueil` | `HomeScreen`, `ProfileScreen` | `GET /api/v1/lottery/wallet` | Réel ; aucun solde en mode simulé |
| Effacement de la clé à la suppression RGPD | `/profil/rgpd` | `PersonalDataScreen` | [`backend/src/api/user/user.repo.ts`](src:backend/src/api/user/user.repo.ts) | Réel |

## Loterie

| Fonctionnalité | Web | Mobile | Route | État |
|---|---|---|---|---|
| État du tour, compte à rebours, jauge | `/accueil`, `/` | `HomeScreen` | `GET /api/v1/lottery/status` | Réel |
| Phase du tour (ouvert, salle d'attente, tirage, terminé, annulé) et heure de révélation | `/accueil` | `HomeScreen`, `WaitingRoomScreen` | même route, champs `phase` et `revealAt` | Réel |
| Paliers communautaires de la jauge (5 000, 7 500, 9 000 et 10 000 participants) | `/accueil` | `HomeScreen` | même route | Fictif : récompenses jamais appliquées |
| Achat de son ticket unique du grand tirage en un geste, âge vérifié | `/billetterie` | `BuyTicketScreen` | `POST /api/v1/lottery/buy` | Réel |
| Numéro de ticket à cinq chiffres | `/historique` | `MyTicketsScreen`, `TransactionHistoryScreen` | champ `ticketNumber` | Réel |
| Plafond personnel de jeu responsable (50 par défaut) | `/profil/securite` | - | `PUT /api/v1/user/responsible-limit` | Réel, sans effet tant qu'un seul ticket est permis |
| Ticket offert à un proche par email, s'il n'a pas encore le sien | `/billetterie` | `GiftTicketScreen` | `POST /api/v1/lottery/gift` | Réel |
| Historique des tickets et galerie POAP | `/historique` | `MyTicketsScreen`, `TransactionHistoryScreen` | `GET /api/v1/lottery/my-tickets` | Réel |
| Tirage automatique (keeper) après le délai de révélation `DRAW_REVEAL_DELAY_SECONDS` | - | - | [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts), [`backend/src/blockchain/draw-reveal.ts`](src:backend/src/blockchain/draw-reveal.ts) | Réel |
| Versement automatique de la cagnotte et des remboursements | - | - | [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) | Réel |
| Réclamation manuelle de la cagnotte | `/accueil`, `/tirage` | `LiveDrawScreen` | `POST /api/v1/lottery/claim-prize` | Réel |
| Classement anonymisé des ambassadeurs | `/accueil` | `SponsorsScreen` | `GET /api/v1/lottery/leaderboard` | Réel |
| Charte de transparence | `/transparence`, `/profil/aide` | `HowItWorksScreen` | `GET /api/v1/lottery/transparency-charter` | Réel |
| Métadonnées et visuel des badges POAP | - | - | `GET /api/v1/lottery/poap/:file` | Réel |

## Tirage en direct

| Fonctionnalité | Web | Mobile | Événement Socket.IO | État |
|---|---|---|---|---|
| Salle d'attente entre la fermeture des achats et la révélation | `/tirage` | `WaitingRoomScreen` | `draw:join`, `draw:waiting-room` | Réel |
| Chat en direct et réactions | `/tirage` | `WaitingRoomScreen`, `LiveDrawScreen` (sans réactions) | `chat:send`, `chat:message`, `chat:react`, `chat:reaction` | Réel |
| Annonce du gagnant à tous les clients, roue animée sur mobile | `/tirage` | `LiveDrawScreen` | `draw:winner` | Réel |
| Notification des EtherPoints gagnés | modale | modale | `points:awarded` | Réel |

Détails : [Temps réel Socket.IO](../backend/socket-io.md).

## EtherPoints et boutique

| Fonctionnalité | Web | Mobile | Route | État |
|---|---|---|---|---|
| Gain de points : 50 par ticket, 75 par ticket offert, 25 à l'inscription, 100 au parrain et 50 au filleul | automatique | automatique | Montants dans [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts) et [`backend/src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts), écriture par [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts) | Réel |
| Solde et historique des points | `/boutique` | `RewardsCatalogScreen`, `HomeScreen` | `GET /api/v1/marketplace/points` | Réel |
| Catalogue des offres et détail avec stock | `/boutique`, `/boutique/[rewardId]` | `RewardsCatalogScreen`, `RewardDetailScreen` | `GET /api/v1/marketplace/catalog`, `GET /api/v1/marketplace/rewards/:id` | Réel |
| Échange d'une offre choisie contre une carte à gratter et un code promo, âge vérifié | `/boutique/carte` | `RewardDetailScreen`, `ScratchCardScreen` | `POST /api/v1/marketplace/claim` | Réel |
| Ticket à gratter acheté en EtherPoints (violet 50, lucky 100), qui tire au hasard une offre en stock, âge vérifié | - | `ScratchCardScreen` | `POST /api/v1/marketplace/scratch` | Réel |
| Codes obtenus avec QR code | `/boutique/mes-codes` | `MyCodesScreen` | `GET /api/v1/marketplace/my-codes` | Réel |
| Quêtes sociales | `/profil` | `SponsorsScreen` | `GET /api/v1/user/quests`, `POST /api/v1/user/quests/complete` | Partiel : validées sur déclaration |
| Parrainage et liens de partage | `/profil`, `/invite/[code]` | `SponsorsScreen` | `GET /api/v1/user/referrals` | Réel |

Les EtherPoints sont tenus en base (table `PointTransaction`), pas sur la chaîne.

## Espace partenaire

| Fonctionnalité | Web | Route | État |
|---|---|---|---|
| Liste des partenaires et choix de l'établissement | `/partenaire`, `/mairie/partenaires` | `GET /api/v1/partners/` | Réel |
| Création de son établissement | `/partenaire` | `POST /api/v1/partners/` | Réel |
| Création d'une offre | `/partenaire/offres` | `POST /api/v1/partners/offers` | Partiel : la date d'expiration n'est pas appliquée |
| Import de codes promo (CSV ou JSON) | `/partenaire/codes` | `POST /api/v1/partners/codes/upload` | Partiel : codes stockés dans Redis |
| Validation d'un code en caisse | `/partenaire/validation` | `POST /api/v1/marketplace/redeem` | Réel |
| Suivi de consommation des codes | `/partenaire` | `GET /api/v1/partners/:partnerId/consumption` | Réel |

L'espace partenaire n'existe que sur le web. Détails : [Partenaires](../backend/modules/partenaires.md).

## Dashboard Mairie

| Fonctionnalité | Web | Route | État |
|---|---|---|---|
| Indicateurs globaux | `/mairie` | `GET /api/v1/admin/dashboard` | Partiel : commission estimée à 10 % en base |
| Tirage manuel | `/mairie` | `POST /api/v1/lottery/draw` | Réel, si le contrat l'autorise |
| Annulation et remboursement du tour | `/mairie` | `POST /api/v1/lottery/refund` | Réel |
| Disjoncteur | `/mairie/securite` | `POST /api/v1/admin/circuit-breaker` | Réel |
| Reversement de la commission | `/mairie/securite` | `POST /api/v1/admin/treasury/withdraw` | Réel, libellé « multi-signatures » trompeur |
| Approbation ou suspension d'un partenaire | `/mairie/partenaires` | `PATCH /api/v1/admin/partners/:partnerId/status` | Réel |
| Analytique : âges et sources d'acquisition | `/mairie/analytique` | `GET /api/v1/analytics/dashboard` | Partiel : répartition par âge fictive sans données |
| Export de rapport CSV ou PDF | `/mairie/analytique` | `GET /api/v1/admin/reports/export` | Partiel : le « PDF » serveur est du JSON ; le web imprime le PDF dans le navigateur |
| Vérification des pièces d'identité : consultation journalisée, décision, effacement des images, email au citoyen | `/mairie/identites` | `GET /api/v1/admin/identity-verifications`, `GET /api/v1/admin/identity-verifications/:id`, `POST /api/v1/admin/identity-verifications/:id/decision` | Réel |
| Journal d'audit | `/mairie/audit` | `GET /api/v1/admin/audit-logs` | Réel |

Détails : [Administration Mairie](../backend/modules/administration.md).

## Profil, préférences et RGPD

| Fonctionnalité | Web | Mobile | Route | État |
|---|---|---|---|---|
| Profil et statistiques | `/profil` | `ProfileScreen` | `GET /api/v1/user/profile` | Réel |
| Accueil des paramètres, ouvert par la roue dentée de l'en-tête | - | `SettingsScreen` | `GET /api/v1/user/profile` | Réel |
| Thème clair ou sombre, français ou anglais | partout | `DisplaySettingsScreen` | `PUT /api/v1/user/preferences` | Réel |
| Choix des notifications par catégorie | - | `NotificationSettingsScreen` | `PUT /api/v1/user/preferences` | Partiel : filtre le centre de notifications, aucun envoi push |
| Prénom et nom | - | `PersonalDataScreen` | `PATCH /api/v1/user/profile` | Réel |
| Centre de notifications | cloche | `NotificationsScreen` | `GET /api/v1/user/notifications` | Fictif : trois notifications codées en dur |
| Export des données personnelles en JSON | `/profil/rgpd` | `PersonalDataScreen` | `GET /api/v1/user/gdpr/export` | Réel |
| Suppression du compte confirmée par email | `/profil/rgpd` | `PersonalDataScreen` | `POST /api/v1/user/gdpr/delete-request`, `POST /api/v1/user/gdpr/confirm-delete` | Réel |
| Refus de la mesure d'audience | `/confidentialite` | - | stockage local | Réel |
| Aide et support | `/profil/aide` | `HelpSupportScreen` | `POST /api/v1/user/support` (mobile) | Réel ; centre d'aide « Bientôt » tant que `EXPO_PUBLIC_HELP_CENTER_URL` est vide |

## Plateforme et exploitation

| Fonctionnalité | Fichier ou route | État |
|---|---|---|
| Sondes de vivacité, de disponibilité et diagnostic | `/health`, `/health/live`, `/health/ready`, `/health/deep` | Réel |
| Configuration des clients (version mobile minimale, maintenance) | `GET /api/config` | Réel |
| Mode maintenance | `MAINTENANCE_MODE` | Réel |
| Métriques Prometheus protégées par jeton | `/metrics` | Réel |
| Documentation interactive | `/api/docs` | Réel |
| Journaux JSON et identifiant de corrélation | [`backend/src/observability/request-context.ts`](src:backend/src/observability/request-context.ts) | Réel |
| Idempotence des achats, cadeaux, échanges et tickets à gratter | `Idempotency-Key` | Réel côté API ; le mobile n'envoie pas l'en-tête |
| Nœud RPC de secours | `FALLBACK_RPC_URL` | Réel |
| Indexation des événements du contrat | [`backend/src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts) | Réel |
| Webhook blockchain signé HMAC | `POST /api/v1/webhooks/blockchain` | Mode simulé uniquement ; répond 409 en mode onchain |
| Stockage des rapports sur S3 | [`backend/src/services/s3.service.ts`](src:backend/src/services/s3.service.ts) | Partiel : aucun service S3 en local |
| Remontée d'erreurs Sentry | `mobile-app/src/services/sentry.client.ts` | Fictif : journal en mémoire |

## Office de Tourisme

Le site statique `frontend-office-tourisme/` (14 pages) présente la destination : découverte, agenda, restaurants, hébergements, magazine, favoris, billetterie avec panier, tunnel de commande simulé et billets avec QR code. Il ne communique pas avec le backend. Voir [Rôle dans le projet](../office-tourisme/role.md).
