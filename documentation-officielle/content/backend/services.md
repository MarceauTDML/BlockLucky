# Services transverses

Le dossier `backend/src/services` contient les services partagés par plusieurs modules métier. Ce sont des classes instanciées une seule fois et exportées par défaut. Ils ne connaissent ni Express ni les requêtes : ils reçoivent des valeurs, lèvent des `AppError` et s'appuient sur Prisma, Redis ou des clients externes. Les services propres à la blockchain (`walletService`, `lotteryGateway`, `lotteryIndexer`, keeper, file d'actions) sont dans `backend/src/blockchain` et décrits dans la partie [Intégration blockchain du backend](../integration-blockchain/index.md).

| Service | Fichier | Utilisé par |
|---|---|---|
| `sessionService` | [`session.service.ts`](src:backend/src/services/session.service.ts) | middleware d'authentification, Socket.IO, auth, RGPD |
| `otpChallengeService` | [`otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts) | auth |
| `totpService` | [`totp.service.ts`](src:backend/src/services/totp.service.ts) | auth |
| `ledgerService` | [`ledger.service.ts`](src:backend/src/services/ledger.service.ts) | auth, loterie, boutique, utilisateur, indexeurs, worker ledger |
| `emailService` | [`email.service.ts`](src:backend/src/services/email.service.ts) | file et worker d'emails |
| `s3Service` | [`s3.service.ts`](src:backend/src/services/s3.service.ts) | export des rapports d'administration |
| `blockchainService` | [`blockchain.service.ts`](src:backend/src/services/blockchain.service.ts) | loterie et administration en mode simulé, sondes, webhook |

## sessionService

Signe et vérifie les jetons de session JWT et gère leur révocation. Le comportement vu de l'API est décrit dans [Authentification](modules/auth.md#jeton-de-session).

| Méthode | Rôle |
|---|---|
| `sign(payload)` | JWT HS256 avec `userId`, `walletAddress`, `role`, `twoFactorVerified`, `iss = blocklucky-api`, `aud = blocklucky-clients`, `jti` aléatoire, durée `JWT_EXPIRES_IN` |
| `decode(token)` | vérification synchrone : algorithme HS256 seul, émetteur, audience, expiration avec 30 secondes de tolérance, présence de `jti` et `userId` |
| `verify(token)` | `decode` puis lecture de `auth:revoked:<jti>` et `auth:revoked-before:<userId>` dans Redis ; lève une erreur si la session est révoquée |
| `revoke(token)` | pose `auth:revoked:<jti>` pour la durée de vie restante multipliée par 1,2, plus 30 secondes |
| `revokeAllForUser(userId)` | pose `auth:revoked-before:<userId>` à l'instant courant moins une seconde, pour 30 jours |
| `isRecent(token, maxAgeSeconds = 900)` | vrai si le jeton a été émis il y a moins de 15 minutes |

`revokeAllForUser` est appelé à l'activation d'une 2FA, à la déconnexion de tous les appareils et à la confirmation d'une suppression RGPD. La marge d'une seconde garantit que le jeton émis juste après, dans la même requête, reste valable. Si un compte reste inactif plus de 30 jours, la clé expire, mais tous les jetons antérieurs ont expiré depuis longtemps.

## otpChallengeService

Gère les codes à 6 chiffres envoyés par email, le compteur d'échecs par compte et l'anti-rejeu des codes TOTP. Tout est stocké dans Redis.

| Clé | Contenu | Durée |
|---|---|---|
| `auth:otp:<sujet>` | `{ hash, purpose, attempts, expiresAt, signup? }` | 10 minutes |
| `auth:otp-failures:<sujet>` | nombre d'échecs | 1 heure après le dernier échec |
| `auth:totp-used:<userId>:<compteur>` | marqueur de code TOTP consommé | 120 secondes |

| Méthode | Rôle |
|---|---|
| `newSubjectId()` | UUID provisoire pour une inscription en attente |
| `issue(sujet, purpose, signup?)` | tire un code avec `crypto.randomInt`, stocke `HMAC-SHA-256("<sujet>:<code>")` et remplace tout code précédent du sujet ; finalités `LOGIN`, `SIGNUP`, `SETUP` |
| `hasPending(sujet)` | vrai si un code non expiré attend |
| `consume(sujet, code)` | compare en temps constant ; incrémente `attempts` sur échec et supprime le code au cinquième essai ; supprime le code sur succès et renvoie sa finalité et l'inscription en attente |
| `assertNotLocked(sujet)` | lève `429` à partir de 10 échecs |
| `recordFailure`, `clearFailures` | incrémente ou efface le compteur d'échecs |
| `markTotpUsed(userId, compteur)` | `SET NX` : renvoie `false` si ce pas TOTP a déjà servi |

La clé HMAC est dérivée de `ENCRYPTION_KEY` (`HMAC(ENCRYPTION_KEY, "blocklucky:hmac")`) dans [`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) : un dump Redis ne révèle pas les codes. Le compteur d'échecs est lu puis réécrit sans opération atomique : des tentatives parallèles peuvent en perdre quelques-unes.

## totpService

Implémentation interne de TOTP (RFC 6238) sans dépendance externe pour le calcul, la bibliothèque `qrcode` produisant seulement l'image.

| Méthode | Rôle |
|---|---|
| `generateSecret(32)` | secret Base32 de 32 caractères (160 bits) |
| `generateOtpAuthUrl(compte, secret)` | URL `otpauth://totp/...` avec l'émetteur `BlockLucky EtherBay`, SHA1, 6 chiffres, période de 30 secondes |
| `generateQrCodeDataUrl(url)` | image PNG en data URL |
| `generateToken(secret, date)` | code courant, utilisé par les tests |
| `matchCounter(code, secret, fenêtre = 1)` | renvoie le compteur du pas qui correspond parmi le précédent, le courant et le suivant, ou `null` ; comparaison en temps constant |
| `verifyToken(code, secret)` | variante booléenne, utilisée par les tests |
| `generateBackupCodes(10)` | 10 codes `XXXXX-XXXXX` tirés dans un alphabet de 32 caractères sans `I`, `O`, `0` ni `1` |

Le secret est stocké chiffré en AES-256-GCM (`encryptText`) ; les codes de secours sont stockés hachés (`SHA-256("backup:" + code normalisé)`). Un ancien secret enregistré en clair est encore accepté à la lecture (`isEncrypted`).

## ledgerService

Seul point d'écriture des EtherPoints. Chaque opération modifie `User.pointsBalance` et ajoute une ligne `PointTransaction` dans une même transaction Prisma.

| Méthode | Rôle | Erreurs |
|---|---|---|
| `creditPoints(userId, montant, type, description?)` | incrément atomique du solde et ligne positive | `400 Le montant à créditer doit être strictement positif` |
| `debitPoints(userId, montant, type = 'REWARD_CLAIM', description?)` | vérifie le solde puis décrément et ligne négative | `400` montant nul ou négatif, `404 Utilisateur introuvable`, `400 Solde d'EtherPoints insuffisant (x disponibles, y requis)` |
| `getUserLedgerHistory(userId, limit = 50)` | solde et derniers mouvements | `404 Utilisateur introuvable` |

Les types autorisés sont `TICKET_PURCHASE`, `REFERRAL`, `REWARD_CLAIM`, `SOCIAL_QUEST`, `GIFT_TICKET` et `ADMIN_BONUS` ; la colonne `actionType` est une chaîne libre en base. Chaque opération incrémente la métrique `business_events_total{event="points_credited_<type>"}` ou `points_debited_<type>`.

La vérification du solde de `debitPoints` est faite avant la transaction : deux débits simultanés peuvent passer la vérification, mais la contrainte `CHECK ("pointsBalance" >= 0)` fait alors échouer le second en `409`. La file `ledger-queue` qui devait sérialiser ces écritures n'est utilisée par aucun appelant (voir [Files et workers](files-workers.md#file-ledger-queue)).

## emailService

Rend un gabarit HTML et l'envoie par Nodemailer ([`backend/src/config/mailer.config.ts`](src:backend/src/config/mailer.config.ts)). Les modules n'appellent pas ce service directement : ils passent par `enqueueEmail`, qui met le message dans la file `emails-queue` ou l'envoie immédiatement si la file est indisponible.

| Gabarit | Variables | Envoyé par |
|---|---|---|
| `otp-code` | `CODE`, `EXPIRES_MINUTES` | connexion, inscription, activation de la 2FA par email, réinitialisation du mot de passe |
| `welcome` | `WALLET_ADDRESS`, `REFERRAL_CODE` | création de compte |
| `security-alert` | `EVENT`, `DATE` | activation ou désactivation de la 2FA, utilisation d'un code de secours, mot de passe réinitialisé ou défini |
| `reward-claim` | `REWARD_TITLE`, `PARTNER_NAME`, `PROMO_CODE` | échange de récompense, ticket à gratter |
| `identity-decision` | `DECISION`, `DETAILS` | décision de la Mairie sur une pièce d'identité |
| `gdpr-deletion` | `CONFIRM_URL`, `TOKEN` | demande de suppression RGPD |

Les gabarits sont dans `backend/src/templates/emails/`. Chaque `{{VARIABLE}}` est remplacée par sa valeur échappée pour HTML. Si le fichier est introuvable, le corps se réduit aux variables en JSON. `npm run compile` copie le dossier dans `dist/src/templates`.

| Situation | Comportement de `sendTemplateEmail` |
|---|---|
| `NODE_ENV=test` | aucun envoi, renvoie `true` |
| envoi réussi | log `info` avec l'adresse masquée (`c***@etherbay.fr`), renvoie `true` |
| échec SMTP | log `warn`, renvoie `false` sans lever d'erreur |

Comme l'échec SMTP ne lève pas d'erreur, un job de la file d'emails est considéré comme réussi même si le message n'est pas parti, et les 5 tentatives de BullMQ ne sont jamais utilisées. Les méthodes `sendOtpEmail`, `sendSecurityAlertEmail`, `sendGdprDeletionEmail`, `sendRewardClaimEmail` et `sendWelcomeEmail` existent mais ne sont appelées par aucun code. Le guide [Ajouter un email](../guides/ajouter-email.md) décrit la création d'un gabarit.

## s3Service

Client `@aws-sdk/client-s3` configuré par `AWS_REGION`, `AWS_S3_ENDPOINT`, `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`, en style chemin (`forcePathStyle`, compatible MinIO), 3 tentatives, délais de 3 secondes à la connexion et 10 secondes par requête.

| Méthode | Rôle |
|---|---|
| `uploadFile(clé, contenu, type)` | `PutObject` dans `AWS_S3_BUCKET` ; renvoie `{ key, url }` avec `url = endpoint/bucket/clé`. En test, aucun envoi. Un échec est journalisé en `warn` et l'URL est quand même renvoyée. |
| `getPresignedDownloadUrl(clé, 3600)` | URL présignée de lecture ; non utilisée par le code actuel |

Le seul appelant est l'export de rapports (`GET /admin/reports/export`). Aucun conteneur MinIO n'est défini dans `docker-compose.yml` : en local, l'envoi échoue et l'URL renvoyée ne pointe vers rien.

## blockchainService

Façade historique du mode simulé. En mode `onchain`, seules deux méthodes délèguent au vrai contrat ; les autres ne servent qu'en mode simulé.

| Méthode | Mode onchain | Mode simulé | Appelant |
|---|---|---|---|
| `getNetworkStatus()` | mode, chaîne, RPC actif, adresses, `isPaused` lu sur le contrat | idem, `isPaused` lu dans Redis | sondes, statut, tableau de bord, webhook |
| `setCircuitBreaker(paused)` | `pause()` ou `unpause()` via la passerelle | clé `blockchain:circuit_breaker` et hachage aléatoire | administration |
| `isCircuitBreakerPaused()` | `paused()` du contrat, `false` si le nœud ne répond pas | clé Redis ou mémoire | les deux précédentes |
| `switchToFallback(active)` | bascule du client RPC | idem | webhook (mode simulé seulement) |
| `relayTicketPurchase(wallet, tour)` | non utilisé | refuse si pause, sinon hachage et bloc aléatoires | achat et cadeau simulés |
| `requestChainlinkVrfDraw(tour, participants)` | non utilisé | gagnant tiré par `crypto.randomInt`, identifiants aléatoires | tirage simulé |
| `withdrawTreasuryToMultisig(adresse, montant)` | non utilisé | hachage aléatoire, aucun versement | trésorerie simulée |
| `mintPoapBadge(wallet, tour)` | non utilisé | identifiant et URI `ipfs://QmEtherBayPOAP2026/...` fictifs | achat simulé |

Le service crée ses propres fournisseurs ethers vers `RPC_URL` et `FALLBACK_RPC_URL` (délai de 10 secondes), qu'il n'utilise pas : les appels réels passent par `chainClient`. Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

## Utilitaires associés

| Fonction | Fichier | Rôle |
|---|---|---|
| `encryptText`, `decryptText`, `isEncrypted` | `crypto.util.ts` | AES-256-GCM au format `v2:iv:tag:données` ; relit l'ancien format AES-256-CBC `iv:données` |
| `hmacSha256`, `sha256`, `safeEqual` | `crypto.util.ts` | hachages et comparaison en temps constant |
| `generateOtpCode`, `generateRandomToken`, `generatePromoCode`, `generateBackupCode` | `crypto.util.ts` | aléas cryptographiques |
| `anonymizeWallet`, `maskEmail` | `crypto.util.ts` | `0x8b3f...6a08`, `c***@etherbay.fr` |
| `neutralizeSpreadsheetCell` | `crypto.util.ts` | met entre guillemets et préfixe d'une apostrophe une cellule commençant par `=`, `+`, `-`, `@`, tabulation ou retour chariot |
| `hashValue`, `compareHash` | `crypto.util.ts` | bcrypt à 12 tours, pour les mots de passe |
| `encryptBuffer`, `decryptBuffer` | `crypto.util.ts` | AES-256-GCM sur des octets, au format binaire vecteur d'initialisation de 12 octets, étiquette de 16 octets puis données ; utilisés pour les images des pièces d'identité |
| `decodeIdentityImage`, `detectImageMime`, `toDataUrl` | [`identity-image.util.ts`](src:backend/src/utils/identity-image.util.ts) | décodage du base64, contrôle de la taille et des octets d'un JPEG ou d'un PNG, URL `data:` pour l'affichage Mairie |

Les choix cryptographiques sont justifiés dans [Cryptographie et secrets](../securite/cryptographie-secrets.md).
