# Inscription et portefeuille

Un citoyen crée son compte en deux requêtes : il saisit son email et reçoit un code à 6 chiffres, puis il saisit ce code. À la validation, le backend crée le compte, génère un portefeuille Ethereum chiffré, crédite les EtherPoints de bienvenue et lance la dotation d'ethers fictifs. Le même parcours sert à la connexion d'un citoyen existant.

Ce flux décrit le comportement par défaut : `LOGIN_EMAIL_CODE_REQUIRED=true`, obligatoire en production.

## Diagramme de séquence

```mermaid
sequenceDiagram
  autonumber
  participant C as Client web ou mobile
  participant API as API auth
  participant S as AuthService
  participant R as Redis
  participant Q as File emails-queue
  participant W as Worker
  participant DB as PostgreSQL
  participant WS as WalletService
  participant N as Noeud RPC

  C->>API: POST /auth/login avec email, walletAddress, isAdultConfirmed
  API->>S: socialLogin(input)
  S->>DB: findByWallet puis findByEmail
  DB-->>S: aucun compte
  S->>R: issue SIGNUP, auth:otp:subjectId, 10 min
  S->>Q: enqueueEmail otp-code
  S-->>C: 200 requiresTwoFactor EMAIL, userId = subjectId
  Q-->>W: job send-email
  W->>W: sendTemplateEmail via SMTP
  C->>API: POST /auth/2fa/verify avec userId et code
  API->>S: verify2FA(subjectId, code)
  S->>R: assertNotLocked, consume
  R-->>S: challenge SIGNUP et données d'inscription
  S->>WS: createCustodialWallet
  WS-->>S: adresse et clé chiffrée AES-256-GCM
  S->>DB: createUser avec walletEncryptedKey
  S-)WS: grantWelcomeEthers, sans attendre
  WS->>R: setIfAbsent wallet:grant-lock:id, 120 s
  WS->>N: operator.sendTransaction WELCOME_GRANT_WEI
  S->>DB: creditPoints 25 SOCIAL_QUEST
  S->>Q: enqueueEmail welcome
  S->>DB: recordAuthAnalytics USER_SIGNUP
  S-->>C: 200 token JWT et user
  N-->>WS: reçu de la dotation
  WS->>DB: welcomeGrantTxHash
```

## Étape 1 : demande du code

**Route.** `POST /api/v1/auth/login`, déclarée dans [`backend/src/api/auth/auth.routes.ts`](src:backend/src/api/auth/auth.routes.ts) avec `authRateLimiter` (30 requêtes par 10 minutes et par IP) puis `validate(socialLoginSchema)`.

**Validation.** `socialLoginSchema` ([`backend/src/api/auth/auth.validators.ts`](src:backend/src/api/auth/auth.validators.ts)) exige une adresse `walletAddress` au format `0x` suivi de 40 caractères hexadécimaux (convertie en minuscules), un email facultatif, `isAdultConfirmed` strictement égal à `true`, et accepte `provider`, `ageGroup`, `referralCode`, `utmSource`.

> [!NOTE]
> L'adresse `walletAddress` envoyée par les clients n'est pas un vrai portefeuille. Le web ([`frontend-web/src/lib/wallet.ts`](src:frontend-web/src/lib/wallet.ts)) et le mobile la dérivent de l'email par `generateDeterministicWallet`. Le backend ne s'en sert que pour retrouver un compte existant. Le portefeuille réel du citoyen est celui que le backend génère à l'étape 2.

**Service.** `authController.socialLogin` appelle `authService.socialLogin` ([`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts)) :

1. Recherche du compte par adresse (`authRepository.findByWallet`), puis par email (`findByEmail`).
2. Si le compte existe et a une 2FA par application (`twoFactorMethod === 'APP'`), la réponse demande un code TOTP sans envoyer d'email.
3. Sinon, comme `LOGIN_EMAIL_CODE_REQUIRED` est vrai :
   - pour un compte existant, `otpChallengeService.assertNotLocked` puis `issue(user.id, 'LOGIN')` ;
   - pour un nouveau citoyen, le parrain est cherché par `findByReferralCode`, un identifiant temporaire est tiré par `newSubjectId()` (UUID), puis `issue(subjectId, 'SIGNUP', signup)` stocke les données d'inscription avec le défi.
4. `sendCodeEmail` met en file l'email `otp-code`.
5. La réponse contient `requiresTwoFactor: true`, `twoFactorMethod: 'EMAIL'` et `userId`. En développement uniquement, `devOtpPreview` contient le code.

**Défi OTP.** `OtpChallengeService` ([`backend/src/services/otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts)) génère 6 chiffres par `crypto.randomInt`, stocke sous `auth:otp:<subjectId>` un HMAC-SHA256 de `<subjectId>:<code>` (jamais le code en clair), le nombre d'essais et l'échéance, avec une expiration Redis de 10 minutes.

**Email.** `enqueueEmail` ([`backend/src/queues/emails.queue.ts`](src:backend/src/queues/emails.queue.ts)) ajoute un job `send-email` à `emails-queue`. Le worker ([`backend/src/workers/email.worker.ts`](src:backend/src/workers/email.worker.ts)) rend le gabarit [`backend/src/templates/emails/otp-code.html`](src:backend/src/templates/emails/otp-code.html) et l'envoie. Si la file est indisponible, l'email part directement dans la requête.

## Étape 2 : validation du code et création du compte

**Route.** `POST /api/v1/auth/2fa/verify` avec `authRateLimiter`, `optionalAuthenticate` et `validate(verify2FASchema)`. Le controller prend l'identifiant du jeton s'il y en a un, sinon `req.body.userId` ; sans l'un ni l'autre, il renvoie 400.

**Vérification.** `authService.verify2FA` :

1. `assertNotLocked(subjectId)` : 429 si 10 échecs ont été enregistrés dans l'heure.
2. `hasPending(subjectId)` est vrai : `consume(subjectId, code)` compare le HMAC en temps constant (`safeEqual`). Un code faux incrémente le compteur d'essais ; au cinquième, le défi est supprimé. Un code juste supprime le défi.
3. En cas d'échec, `recordFailure` incrémente `auth:otp-failures:<subjectId>` pour une heure et la réponse est 401. En cas de succès, `clearFailures`.
4. Le défi est de type `SIGNUP` : `createVerifiedUser(challenge.signup)`.

**Création du compte.** `createVerifiedUser` :

1. Revérifie qu'aucun compte n'existe avec cette adresse ou cet email. S'il en existe un, il est renvoyé tel quel, sans rien créer.
2. `walletService.createCustodialWallet()` ([`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts)) : `Wallet.createRandom()` d'ethers, adresse en minuscules, clé privée chiffrée par `encryptText` ([`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts)) en AES-256-GCM avec `ENCRYPTION_KEY`.
3. `authRepository.createUser` ([`backend/src/api/auth/auth.repo.ts`](src:backend/src/api/auth/auth.repo.ts)) avec l'adresse générée, `walletEncryptedKey`, l'email, `isEmailVerified: true` et le parrain éventuel.
4. `walletService.grantWelcomeEthers(user)` est lancé sans être attendu. Une erreur est seulement journalisée.
5. `ledgerService.creditPoints` : 25 EtherPoints `SOCIAL_QUEST`. Avec un parrain : 100 EtherPoints `REFERRAL` au parrain et 50 `REFERRAL` au filleul.
6. Email `welcome` mis en file, avec l'adresse du portefeuille et le code de parrainage.
7. `recordAuthAnalytics` enregistre un événement `USER_SIGNUP` dans `Analytics`.

**Session.** `issueSession` signe un JWT HS256 par `sessionService.sign` ([`backend/src/services/session.service.ts`](src:backend/src/services/session.service.ts)) avec `userId`, `walletAddress`, `role`, `twoFactorVerified: true` et un `jti` aléatoire, valable `JWT_EXPIRES_IN` (12 h par défaut). La réponse contient `token`, `user` (sans aucune donnée de portefeuille sensible) et `isNewUser: true`.

## La dotation de bienvenue

`grantWelcomeEthers` ([`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts)) :

1. Ne fait rien en mode `simulated`, si `welcomeGrantTxHash` est déjà renseigné ou si `WELCOME_GRANT_WEI` vaut 0.
2. Pose le verrou `wallet:grant-lock:<userId>` pour 120 s par `redis.setIfAbsent`. Si le verrou existe déjà, une dotation est en cours : la fonction attend sa fin par `waitForPendingGrant`.
3. Envoie `WELCOME_GRANT_WEI` (0,1 ETH par défaut) depuis le compte opérateur `chainClient.operator` ([`backend/src/blockchain/chain.client.ts`](src:backend/src/blockchain/chain.client.ts)), attend le reçu, puis enregistre `welcomeGrantTxHash`.
4. En cas d'échec, supprime le verrou, journalise l'erreur et renvoie `null`. Le verrou n'est pas supprimé après un succès : il expire seul, et `welcomeGrantTxHash` empêche toute nouvelle dotation.

`waitForPendingGrant` interroge la base toutes les 500 ms pendant 30 s au plus. Elle renvoie le hash dès qu'il apparaît, ou `null` si le verrou a disparu (échec) ou si le délai est écoulé.

La dotation est rejouée à la première utilisation du portefeuille : `lotteryGateway.prepareWallet` ([`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts)), appelé par l'achat, le cadeau et `GET /lottery/wallet`, appelle `ensureWallet` (crée un portefeuille pour un compte qui n'en a pas) puis `grantWelcomeEthers` tant que `welcomeGrantTxHash` est vide. C'est ce qui permet à un achat lancé juste après l'inscription d'attendre la dotation au lieu d'échouer faute de fonds. Voir [Achat et cadeau de ticket](achat-cadeau.md).

## Erreurs possibles

| Étape | Code | Cause |
|---|---|---|
| Login | 400 | Adresse au mauvais format, email invalide, `isAdultConfirmed` absent ou faux (le refus de Zod intervient avant le 403 du service) |
| Login | 400 | Aucun email fourni pour un nouveau compte : « Une adresse email est requise pour recevoir le code de connexion » |
| Login | 429 | Plus de 30 requêtes en 10 minutes depuis la même IP, ou compte bloqué après 10 codes faux |
| Verify | 400 | Ni jeton ni `userId` |
| Verify | 401 | Code faux, expiré, ou défi supprimé après 5 essais : « Code de vérification invalide ou expiré » |
| Verify | 429 | 10 échecs dans l'heure pour cet identifiant |
| Verify | 409 | Création concurrente du même email ou de la même adresse (unicité `P2002` ou `23505`) |

## Idempotence et concurrence

- Un code ne sert qu'une fois : `consume` supprime le défi dès qu'il est validé. Rejouer la même requête de vérification renvoie 401.
- `consume` n'est pas atomique : elle lit le défi, puis le supprime. Deux validations strictement simultanées du même code peuvent donc toutes deux réussir. `createVerifiedUser` revérifie alors l'existence du compte, et si les deux créations passent quand même, l'unicité de `email` en base fait échouer la seconde en 409.
- La création du compte, les EtherPoints et les emails ne sont pas dans une même transaction. Un échec au milieu (par exemple de `creditPoints`) laisse un compte créé sans ses points de bienvenue, et la requête répond en erreur. Une nouvelle connexion avec le même email retrouve ce compte.
- La dotation est protégée deux fois : par le verrou Redis contre les envois concurrents, et par `welcomeGrantTxHash` contre un second envoi. Si Redis est indisponible, le verrou passe par la mémoire du process et ne protège plus contre un envoi depuis un autre process.

## Connexion d'un citoyen existant

Le parcours est le même, avec un défi `LOGIN` au lieu de `SIGNUP` stocké sous l'identifiant du compte. À la validation, `verify2FA` marque l'email vérifié si besoin, enregistre un `USER_LOGIN` et émet un nouveau jeton. Si le compte a une 2FA par application, `/auth/login` renvoie `twoFactorMethod: 'APP'` et `/auth/2fa/verify` attend un code TOTP ou un code de secours. Voir [Authentification et 2FA](../../securite/authentification.md).

## En mode simulé

`grantWelcomeEthers` ne fait rien. Le portefeuille est créé et chiffré de la même manière, mais aucun ether n'est envoyé.
