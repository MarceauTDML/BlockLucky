# Dette technique et limites

Inventaire des limites connues, des fonctionnalités simulées et de la dette accumulée, vérifié dans le code à la date de rédaction. Chaque entrée indique où se trouve le problème et ce qu'il faudrait faire. Les limites propres au contrat sont détaillées dans [Limites connues](../smart-contracts/limites.md) ; la répartition générale entre réel et simulé est dans [Réel, simulé ou à venir](../presentation/reel-ou-simule.md).

Niveaux de priorité :

| Priorité | Sens |
| --- | --- |
| Haute | fausse une fonctionnalité visible, ou bloque une mise en production |
| Moyenne | risque d'incident ou de données incohérentes dans un cas particulier |
| Basse | confusion pour le développeur, code mort, libellé trompeur |

## Fonctionnalités simulées ou incomplètes

### Notifications push codées en dur

**Priorité moyenne.** `GET /api/user/notifications` renvoie toujours les trois mêmes notifications, écrites dans `getPushNotificationsHistory` de [`user.services.ts`](src:backend/src/api/user/user.services.ts) (« Nouveau commerçant partenaire », « Objectif 10 000 participants », « Bienvenue »), avec des dates relatives à l'instant de l'appel. Aucune notification n'est stockée en base. Côté mobile, le paquet `expo-notifications` est déclaré dans `package.json` mais n'est importé nulle part : aucun jeton n'est demandé, aucune notification système n'est reçue. L'écran Notifications affiche la liste de l'API et retient les notifications vues en mémoire seulement ; la fonction `triggerSimulatedOsPush` de [`usePushNotifications.ts`](src:mobile-app/src/hooks/usePushNotifications.ts), qui dessinait une fausse bannière système, n'est plus appelée par aucun écran mobile.

À faire : une table de notifications, l'enregistrement du jeton Expo par appareil et un envoi depuis le worker (par exemple à l'annonce du gagnant).

### Sentry absent

**Priorité moyenne.** Aucun SDK Sentry n'est installé, ni dans le backend, ni dans le web, ni dans le mobile. Le fichier [`sentry.client.ts`](src:mobile-app/src/services/sentry.client.ts) porte le nom de Sentry mais ne fait que garder en mémoire les 20 derniers rapports d'erreur ; la variable `EXPO_PUBLIC_SENTRY_DSN` ne sert qu'à ajouter une ligne à ce journal local. Le « `sentryModal` » du frontend web est une simple fenêtre d'information. Aucune erreur des clients n'est donc remontée.

À faire : intégrer un outil de suivi des erreurs, ou renommer ces éléments pour qu'ils ne laissent pas croire à une intégration.

### Retrait de trésorerie « multi-signatures »

**Priorité haute.** Le schéma de la route `POST /api/admin/treasury/withdraw` et son écran parlent encore d'un « portefeuille multi-signatures », avec un champ `multisigWallet` et un montant `amountEth` plafonné à 1 000. En mode `onchain`, `withdrawFees` de [`lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) :

- appelle `setTreasury(adresse)` si l'adresse diffère de la trésorerie actuelle, sans vérifier qu'il s'agit d'un portefeuille multi-signatures ;
- verse **toute** la commission accumulée (`accruedFees`), quel que soit `amountEth`, qui n'est conservé que dans le journal d'audit (`requestedAmountEth`).

De plus, `setTreasury` exige `DEFAULT_ADMIN_ROLE`, que le compte opérateur ne reçoit pas des scripts de déploiement (il n'a que `OPERATOR_ROLE` et `PAUSER_ROLE`). Dès que l'opérateur n'est pas aussi l'administrateur, ce qui est le cas dans la stack Docker et sur Sepolia, un retrait vers une adresse autre que la trésorerie actuelle échoue avec `AccessControlUnauthorizedAccount`.

À faire : retirer le libellé multi-signatures ou le rendre vrai, ne pas exposer de montant ignoré, et réserver le changement de trésorerie à la Mairie.

### Export « PDF »

**Priorité basse.** `GET /api/admin/reports/export` avec le format PDF envoie au stockage un texte JSON avec le type `application/pdf` ([`admin.services.ts`](src:backend/src/api/admin/admin.services.ts)) : ce n'est pas un PDF. L'export CSV, lui, est correct et neutralise les formules.

### Stockage S3 sans service

**Priorité moyenne.** Les rapports sont envoyés vers S3 par [`s3.service.ts`](src:backend/src/services/s3.service.ts), configuré par défaut sur `http://localhost:9000` avec les identifiants `minioadmin`. Aucun service MinIO ou S3 n'est fourni par `docker-compose.yml`. L'envoi échoue après trois tentatives, l'échec est journalisé en avertissement, et l'API renvoie quand même une `downloadUrl` qui pointe vers un fichier inexistant.

### Quêtes sociales déclaratives

**Priorité basse.** `POST` de validation d'une quête crédite les points sans aucune preuve que l'action (partage, abonnement) a eu lieu. Le catalogue des quêtes est écrit dans [`user.services.ts`](src:backend/src/api/user/user.services.ts).

## Comptes et vérification d'âge

### Code TOTP accepté avec le seul identifiant du compte

**Priorité haute.** `POST /api/auth/2fa/verify` est public (`optionalAuthenticate`). Le contrôleur prend `req.user?.userId`, sinon le `userId` du corps ([`auth.controllers.ts`](src:backend/src/api/auth/auth.controllers.ts)). Quand aucun défi email n'est en attente pour cet identifiant, `verify2FA` de [`auth.services.ts`](src:backend/src/api/auth/auth.services.ts) vérifie un code TOTP ou un code de secours du compte et ouvre une session. Pour un compte en 2FA `APP`, un code TOTP valide et l'identifiant suffisent donc : ni le mot de passe, ni le code email, ni une session préalable ne sont exigés. Le TOTP remplace le premier facteur au lieu de s'y ajouter. L'identifiant interne n'est pas secret : il est renvoyé par `/auth/signin` et diffusé à tous les clients par l'événement `points:awarded`. Le verrouillage (10 échecs par heure et par compte) limite la recherche du code sans supprimer le défaut. Ce comportement existait avant les comptes avec mot de passe et n'a pas été corrigé.

À faire : faire émettre par `/auth/signin` et `/auth/login` un jeton de défi signé et de courte durée, et exiger ce jeton à la place du `userId`.

### Codes de parrainage peu lisibles

**Priorité basse.** `User.referralCode` vaut `@default(uuid())` dans [`schema.prisma`](src:backend/prisma/schema.prisma) : un code de 36 caractères, difficile à dicter ou à recopier. La maquette Figma de l'écran Parrains montre un code court, et l'application affiche le code complet dans `ReferralCodeCard`. Aucun lien profond ne préremplit le code à l'inscription mobile (voir [Navigation et écrans](../mobile/navigation-ecrans.md)).

À faire : un code court généré sans ambiguïté (alphabet de [`crypto.util.ts`](src:backend/src/utils/crypto.util.ts) des codes de secours, par exemple), avec contrainte d'unicité et nouvelle tentative en cas de collision.

### Statut d'âge figé sur le téléphone

**Priorité moyenne.** Le mobile garde `ageVerificationStatus` dans le profil stocké au login. Seul l'écran de vérification d'âge le met à jour, en relisant `GET /user/identity`. Après la décision de la Mairie, le profil local reste `PENDING` jusqu'à une visite de cet écran ou une nouvelle connexion ; l'ouverture automatique de l'écran après un refus dépend de cette valeur.

Le web n'a pas ce défaut : le hook `useAgeVerification` relit `GET /user/identity` et met le profil stocké à jour (voir [Portefeuille et loterie](../web/portefeuille-loterie.md#verification-d-identite)).

### Plafond de jeu responsable sans objet

**Priorité basse.** La page [`profil/securite/page.tsx`](src:frontend-web/src/app/(citoyen)/profil/securite/page.tsx) propose toujours un plafond personnel de 5, 10, 25, 50 ou 100 tickets par tirage, enregistré par `PUT /user/responsible-limit`. Depuis que le contrat et le backend n'acceptent qu'un ticket par participant et par tour, et que la billetterie n'achète plus qu'un ticket, ce plafond n'a plus d'effet. Les pages publiques `/` et `/transparence` le présentent encore comme une garantie de jeu responsable.

À faire : retirer le réglage, ou le remplacer par une mesure qui a un sens avec un ticket par tirage (par exemple une pause volontaire de participation).

### Pièces d'identité sans contrôle d'unicité

**Priorité basse.** Les images sont effacées dès la décision et aucune empreinte n'est conservée : rien n'empêche une même pièce de valider plusieurs comptes. C'est le prix de la minimisation des données ; la règle est à valider avec la Mairie (voir [Points à valider](../juridique/points-a-valider.md)).

### Nom complet Apple ignoré

**Priorité basse.** `appleOAuthSchema` accepte `fullName`, que le mobile envoie à la première connexion Apple, mais `oauthLogin` ne l'enregistre pas. Apple ne le transmet qu'une fois.

### Comptes OAuth rattachés par l'adresse seule

**Priorité moyenne.** `oauthLogin` de [`auth.services.ts`](src:backend/src/api/auth/auth.services.ts) retrouve le compte par l'email du jeton Google ou Apple et n'enregistre pas l'identifiant `sub` du fournisseur. Une adresse relais Apple ou un changement d'adresse chez le fournisseur crée un compte distinct, et la sécurité d'un compte BlockLucky dépend de celle du compte Google ou Apple de même adresse (voir [Authentification et 2FA](../securite/authentification.md#rattachement-par-adresse-email)).

À faire : une table des identités externes (`provider`, `sub`, `userId`), et une confirmation explicite avant de rattacher un fournisseur à un compte qui a déjà un mot de passe.

### Mot de passe non imposé et énumération à l'inscription

**Priorité moyenne.** Un compte qui a un mot de passe reste joignable par `/auth/login`, par simple code email, et par OAuth. `/auth/signup` répond 409 pour une adresse déjà inscrite, ce qui révèle l'existence du compte, alors que `/auth/signin` et `/auth/password/forgot` répondent de façon identique. Aucun contrôle des mots de passe compromis n'est fait, et le hachage par `bcryptjs` en JavaScript, au coût 12, occupe le processus Node à chaque tentative : la limite de 30 requêtes par 10 minutes et par IP est la seule protection contre une saturation par `/auth/signin`.

### Conservation des pièces d'identité en attente

**Priorité moyenne.** Les images sont effacées à la décision, mais une demande jamais traitée garde ses images chiffrées sans limite de durée, et tout compte `ADMIN` peut les consulter : il n'existe ni rôle dédié à l'examen des pièces, ni purge automatique. Les images ne sont pas réencodées, ce qui conserve les métadonnées EXIF d'un fichier envoyé par un autre client que le mobile.

À faire : une purge des demandes `PENDING` au-delà d'une durée fixée avec le DPO, un rôle ou une permission propre à l'examen, et un réencodage des images à la réception.

### Vérification d'âge contournable sur la chaîne

**Priorité basse.** Le contrôle d'âge est fait par l'API. Le contrat accepte `buyTickets` et `buyTicketsFor` de n'importe quelle adresse : un détenteur d'ethers de test peut acheter sans passer par BlockLucky, et le bénéficiaire d'un cadeau reçoit son ticket sans vérification. Sur Sepolia comme en local, ce contournement reste théorique pour un citoyen, dont la clé est gardée par le backend.

## Application mobile

### Mode simulé sans solde ETH

**Priorité moyenne.** `walletService.balanceOf` de [`wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) renvoie `null` hors mode onchain. `GET /lottery/wallet` ne donne alors aucun solde : le profil mobile n'affiche pas la tuile des ETH fictifs et la billetterie considère le solde comme suffisant. Aucun écran mobile n'affiche plus de mention « Mode démonstration », et aucun ne lit `guarantees.paused` : la pause du contrat n'apparaît qu'au refus de l'achat.

### Coûts des tickets à gratter recopiés

**Priorité basse.** Les prix 50 et 100 sont écrits dans `SCRATCH_COSTS` de [`scratchOffers.ts`](src:mobile-app/src/components/marketplace/scratchOffers.ts). Si `SCRATCH_COST_VIOLET` ou `SCRATCH_COST_LUCKY` change côté serveur, l'application affiche un prix faux ; le débit réel reste celui du serveur.

### Pas de clé d'idempotence sur mobile

**Priorité moyenne.** Le mobile n'envoie jamais `Idempotency-Key`. Un nouvel appui après une erreur réseau peut acheter deux tickets à gratter et débiter deux fois les EtherPoints ; pour les tickets du tirage, le contrôle d'un ticket par participant empêche le doublon.

### Erreurs 409 mal classées

**Priorité basse.** `classifyTicketError` de [`useCitizenWallet.ts`](src:mobile-app/src/hooks/useCitizenWallet.ts) traite tout 409 sans `contractError` comme un ticket déjà acheté. « Ce tour est terminé, le tirage va être lancé » s'affiche donc dans la fenêtre du ticket déjà possédé.

### Solde de points jamais relu

**Priorité basse.** `usePoints` lit `pointsBalance` dans la réponse de `GET /marketplace/points`, qui renvoie `balance`. Le solde affiché ne suit que les réponses des achats, cadeaux et échanges.

### Identifiants Google absents de l'exemple

**Priorité basse.** [`SocialAuthButtons.tsx`](src:mobile-app/src/components/auth/SocialAuthButtons.tsx) lit `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` et `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, listés vides dans [`mobile-app/.env.example`](src:mobile-app/.env.example). Sans eux, le bouton Google reste grisé. L'exemple garde aussi `EXPO_PUBLIC_WEB3AUTH_CLIENT_ID`, lu par aucun fichier.

### Code mort après la refonte

**Priorité basse.** Plusieurs éléments ne sont plus utilisés par aucun écran : les composants `IntegratedWalletCard`, `IntegratedWalletButton` et `ExplorerLink`, `generateDeterministicWallet` de `useCitizenWallet`, `triggerSimulatedOsPush`, les fenêtres globales `retryModal`, `queueModal` et `sentryModal` du slice `ui`, les endpoints `getOnboarding` et `setResponsibleLimit`. Le plafond de jeu responsable n'est plus réglable sur mobile. Les dépendances `axios`, `expo-notifications`, `expo-crypto`, `lottie-react-native` et `react-native-gesture-handler` ne sont importées nulle part, et les polices `assets/fonts/Inter-*.ttf` ne sont plus lues depuis le passage à `@expo-google-fonts/inter`. Le détail est dans [Stack et structure](../mobile/structure.md#code-mort-a-connaitre).

## Données et cohérence

### Données de référence dans Redis seul

**Priorité haute.** Plusieurs données n'existent que dans Redis, sans copie en base :

| Clé | Contenu |
| --- | --- |
| `partner:codes:<récompense>` | codes promotionnels importés par les partenaires |
| `partner:offer_expiry:<offre>` | date d'expiration d'une offre |
| `user:ticket_limit:<compte>` | limite personnelle de jeu responsable |
| `user:prefs:<compte>` | thème et langue |
| `user:quests:<compte>` | quêtes déjà validées |

Si Redis est perdu, ces données disparaissent : un citoyen perd sa limite de jeu responsable, les codes importés sont perdus et les quêtes peuvent être validées une seconde fois. Si Redis est seulement indisponible, l'API bascule sur une mémoire locale propre à chaque processus, vide au démarrage.

Les lectures et écritures de ces clés ne sont pas atomiques (lecture, modification en mémoire, réécriture). Deux échanges simultanés de la même récompense peuvent recevoir le même code partenaire ; deux validations simultanées d'une quête peuvent créditer les points deux fois.

À faire : déplacer ces données dans PostgreSQL, avec des contraintes d'unicité.

### Indice de ticket concurrent en mode simulé

**Priorité basse.** En mode simulé, l'indice d'un nouveau ticket vaut le nombre de tickets déjà enregistrés sur le tour (`countTicketsInRound` dans [`lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts)). Deux achats simultanés obtiennent le même indice, et le second échoue sur l'index unique `(lotteryId, ticketIndex)`. En mode onchain, l'indice vient du contrat et ce cas n'existe pas.

### Délai de révélation ignoré par le tirage manuel

**Priorité basse.** `DRAW_REVEAL_DELAY_SECONDS` n'est respecté que par le keeper ([`lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts)). `POST /lottery/draw`, Chainlink Automation et tout compte qui appelle `requestDraw` sur le contrat peuvent tirer avant l'heure `revealAt` affichée aux participants.

### Montants en virgule flottante

**Priorité basse.** `LotteryRound.prizePool` est un `Float` : un montant en ethers converti en nombre JavaScript, donc sujet aux erreurs d'arrondi. Les montants exacts sont aussi stockés en wei sous forme de chaîne (`ticketPriceWei`, `prizeWei`), qui doivent faire foi. Voir [Dictionnaire de données](../base-de-donnees/dictionnaire.md).

### Chaîne locale sans persistance

**Priorité haute pour la démonstration.** Le nœud Hardhat perd son état à chaque redémarrage, alors que PostgreSQL et Redis gardent le leur. L'indexeur détecte la situation et la journalise, mais ne la corrige pas. Voir [Runbooks blockchain](../infrastructure/runbooks-blockchain.md#chaine-locale-reinitialisee).

## Blockchain

### Bascule RPC inutilisable en mode onchain

**Priorité moyenne.** Le seul moyen prévu de basculer sur `FALLBACK_RPC_URL` est l'événement `RPC_FALLBACK_SWITCH` du webhook, qui est refusé en 409 en mode `onchain` ([`blockchain.webhook.ts`](src:backend/src/api/webhooks/blockchain.webhook.ts)). Même en mode simulé, la bascule ne touche que le processus qui reçoit l'appel, pas le worker. La valeur par défaut de `FALLBACK_RPC_URL` est un RPC public Sepolia, incompatible avec la chaîne locale ; comme les fournisseurs ethers sont créés avec `staticNetwork`, un RPC du mauvais réseau ne serait pas détecté. Voir [Runbooks blockchain](../infrastructure/runbooks-blockchain.md#rpc-principal-en-panne).

### Compte opérateur partagé entre deux processus

**Priorité moyenne.** L'API et le worker signent avec la même clé, chacun avec son propre `NonceManager` ([`chain.client.ts`](src:backend/src/blockchain/chain.client.ts)). Seul `sendAndIndex` de l'API retente une transaction après une erreur de nonce. Le keeper prend un verrou Redis, mais pas les autres signataires (dotation, badges, disjoncteur).

À faire : faire signer toutes les transactions de l'opérateur par un seul processus, via la file `chain-actions`.

### Pas de relance automatique d'un tirage bloqué

**Priorité moyenne.** Le contrat prévoit `retryDraw` après `drawTimeout`, mais ni le keeper ni l'API ne l'appellent : un tirage sans réponse VRF reste bloqué jusqu'à une intervention manuelle. En local, l'oracle simulé ([`local-vrf-responder.ts`](src:smart-contract/scripts/local-vrf-responder.ts)) marque une requête comme traitée avant d'y avoir répondu, et ne la retente jamais en cas d'échec.

### Message d'erreur trompeur sur les fonds

**Priorité basse.** `toAppError` traduit toute erreur `INSUFFICIENT_FUNDS` par « Solde d'ethers fictifs insuffisant sur votre portefeuille BlockLucky », y compris quand c'est le compte opérateur qui manque de fonds lors d'une action Mairie.

### Sonde profonde sans test du RPC

**Priorité basse.** `/health/deep` rapporte la configuration blockchain et l'état du disjoncteur, mais ne vérifie pas que le RPC répond : une panne du nœud laisse la sonde à `pass`. Si le RPC ne répond pas, l'état de pause est rapporté à `false`.

## Code mort et héritages

### Adresse pseudo-déterministe à la connexion

**Priorité basse.** La page de connexion web envoie à `POST /api/auth/login` une `walletAddress` calculée à partir de l'email par `generateDeterministicWallet` ([`wallet.ts`](src:frontend-web/src/lib/wallet.ts)), une fonction de hachage non cryptographique. Le backend s'en sert d'abord pour chercher le compte, puis cherche par email. Depuis la création des portefeuilles intégrés, l'adresse réelle du compte est générée par le serveur et cette valeur ne correspond plus à rien. Le champ `provider` (`GOOGLE` par défaut) est un reste de la connexion sociale Web3Auth, qui n'existe plus.

### Chemins du mode simulé

**Priorité basse.** [`blockchain.service.ts`](src:backend/src/services/blockchain.service.ts) contient encore `relayTicketPurchase`, `requestChainlinkVrfDraw`, `mintPoapBadge` et `withdrawTreasuryToMultisig`, qui fabriquent des hachages aléatoires. Ils ne servent qu'en mode simulé, de même que [`blockchain-indexer.worker.ts`](src:backend/src/workers/blockchain-indexer.worker.ts), qui n'est appelé que par le webhook. Ce code double celui de l'indexeur réel et risque de diverger.

### Documentation Swagger

**Priorité basse.** Les blocs `@openapi` des fichiers `*.routes.ts` alimentent Swagger UI (`/api/docs`) et la [Référence de l'API](../backend/reference-api.md). Leurs résumés ont été alignés sur le comportement réel ; les nuances qui ne tiennent pas en une ligne sont listées dans [Lire les résumés OpenAPI](../backend/reference-api.md#lire-les-resumes-openapi). Ils ne décrivent en revanche ni les corps de requête, ni les réponses : Swagger n'affiche que les chemins et les résumés.

La configuration [`swagger.config.ts`](src:backend/src/config/swagger.config.ts) déclare en outre un unique serveur `http://localhost:<PORT>` : le bouton d'essai de Swagger vise toujours le poste local, y compris sur la démonstration en ligne. La référence fiable est la [Référence de l'API](../backend/reference-api.md), générée depuis les routes.

### Fichiers Expo commités

**Priorité basse.** Le dossier `mobile-app/.expo/` (`devices.json`, `README.md`) est versionné alors qu'il est propre à chaque poste. Il n'est pas ignoré par git : le cache `mobile-app/.expo/web/`, produit par `npm run web`, apparaît dans les fichiers non suivis.

## Infrastructure et exploitation

### Configuration Compose figée sur localhost

**Priorité haute pour la mise en ligne.** `FRONTEND_URL`, `CORS_ORIGINS`, `RPC_URL`, `CHAIN_ID`, les adresses des contrats, `SMTP_HOST`, les arguments `NEXT_PUBLIC_*` et `POAP_BASE_URI` sont écrits en dur dans [`docker-compose.yml`](src:docker-compose.yml). `TRUST_PROXY` en est absent, et les ports 2053, 3000 et 4000 sont publiés sur toutes les interfaces. Le site de l'Office de Tourisme renvoie vers l'application par `lotteryAppUrl: 'http://localhost:3000'`, écrit dans [`site.js`](src:frontend-office-tourisme/assets/js/data/site.js). Déployer derrière un proxy demande un fichier de surcharge. Voir [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md).

### Pas de seed dans la stack

**Priorité moyenne.** Le service `migrate` applique les migrations sans charger de données. La stack Docker démarre sans administrateur ni catalogue, et l'image `runtime` ne contient pas `tsx` pour lancer le seed.

### Observabilité incomplète

**Priorité moyenne.**

- Aucune collecte Prometheus, aucun tableau de bord, aucune alerte.
- Dans la stack Docker, les compteurs des files et de l'indexeur vivent dans le worker, dont le `/metrics` (port 2054) n'est ni publié ni protégé par jeton.
- Les seaux de l'histogramme HTTP n'ont pas de borne à 300 ms, seuil historique de l'objectif de consultation.
- En production, les requêtes réussies ne sont pas journalisées (niveau `http` sous le niveau `info`).

Voir [Objectifs de service et métriques](../infrastructure/slo-metriques.md).

### Clients sourds à /api/config

**Priorité basse.** `/api/config` expose `maintenance` et `minimumMobileVersion`, mais ni le web ni le mobile ne l'appellent : pas d'écran de maintenance, pas de mise à jour forcée de l'application mobile.

### Limite de débit non configurable

**Priorité basse.** Les limites du rate limiter (300 requêtes par 15 minutes, 30 tentatives d'authentification par 10 minutes) sont écrites en dur dans [`rateLimiter.middleware.ts`](src:backend/src/middlewares/rateLimiter.middleware.ts), ce qui empêche un test de charge depuis une seule machine. Voir [Tests de charge](../infrastructure/tests-charge.md).

### Sauvegardes manuelles

**Priorité moyenne.** Aucune sauvegarde automatique, ni de PostgreSQL, ni de Redis. Voir [Sauvegardes et reprise](../infrastructure/sauvegardes.md).

### Rotation de la clé de chiffrement

**Priorité moyenne.** Aucun outil ne permet de rechiffrer les clés de portefeuille, les secrets TOTP et les pièces d'identité en attente avec une nouvelle `ENCRYPTION_KEY`. Les images chiffrées par `encryptBuffer` ne portent pas de préfixe de version, contrairement aux textes au format `v2`. [`crypto.util.ts`](src:backend/src/utils/crypto.util.ts) sait encore déchiffrer l'ancien format AES-256-CBC, sans procédure de migration des valeurs restantes.

### Chaîne logicielle

**Priorité basse.**

- Trivy n'analyse pas l'image de la blockchain locale.
- Les images de base ne sont pas épinglées par digest, et les commandes k6 utilisent `grafana/k6` sans version.
- Aucun test de charge ni test de bout en bout des interfaces n'est lancé par la CI.
- Les tests de `mobile-app/__tests__/` ne peuvent pas s'exécuter : le `package.json` mobile ne déclare ni Jest ni script `test`.

Voir [Chaîne logicielle](../securite/chaine-logicielle.md).
