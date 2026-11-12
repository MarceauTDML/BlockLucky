# Authentification et 2FA

Un compte BlockLucky s'ouvre de trois façons : avec une adresse email et un mot de passe, avec un compte Google ou Apple, ou, sur le web, avec un code à usage unique reçu par email. Une fois connecté, le citoyen peut ajouter une double authentification par application TOTP ou par email. Cette page décrit les mécanismes et leurs paramètres tels qu'ils sont codés. Le fonctionnement fonctionnel du module (routes, réponses) est décrit dans [le module Authentification](../backend/modules/auth.md).

Fichiers principaux :

| Fichier | Rôle |
|---|---|
| [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts) | Logique de connexion, d'inscription, de réinitialisation, d'activation et de désactivation de la 2FA |
| [`backend/src/api/auth/auth.validators.ts`](src:backend/src/api/auth/auth.validators.ts) | Politique de mot de passe et schémas des routes |
| [`backend/src/services/oauth-verifier.service.ts`](src:backend/src/services/oauth-verifier.service.ts) | Vérification des jetons Google et Apple |
| [`backend/src/services/otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts) | Codes email : émission, vérification, compteurs d'échecs, anti-rejeu TOTP |
| [`backend/src/services/totp.service.ts`](src:backend/src/services/totp.service.ts) | Implémentation TOTP (RFC 6238) et génération des codes de secours |
| [`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) | Aléa, bcrypt, HMAC, comparaison en temps constant, chiffrement |
| [`backend/src/middlewares/rbac.middleware.ts`](src:backend/src/middlewares/rbac.middleware.ts) | 2FA obligatoire pour les administrateurs |
| [`backend/__tests__/api/auth-security.test.ts`](src:backend/__tests__/api/auth-security.test.ts), [`auth-password.test.ts`](src:backend/__tests__/api/auth-password.test.ts), [`auth-oauth.test.ts`](src:backend/__tests__/api/auth-oauth.test.ts) | Tests de sécurité de l'authentification |

## Vue d'ensemble

| Route | Client | Preuve demandée | Résultat sans 2FA |
|---|---|---|---|
| `POST /api/auth/signup` | Mobile | Mot de passe conforme, conditions acceptées, puis code email | Compte créé et session délivrée par `/2fa/verify` |
| `POST /api/auth/signin` | Mobile | Email et mot de passe | Session immédiate |
| `POST /api/auth/password/forgot`, `/password/reset` | Mobile | Code email à 6 chiffres | Nouveau mot de passe, toutes les sessions révoquées |
| `POST /api/auth/oauth/google`, `/oauth/apple` | Mobile | Jeton d'identité signé par le fournisseur | Session immédiate, compte créé au besoin |
| `POST /api/auth/login` | Web | Code email, avec déclaration de majorité dans la requête | Session délivrée par `/2fa/verify` |

Quelle que soit la route, un compte vérifié dont la 2FA est active doit encore fournir son code TOTP ou son code email à `/2fa/verify` avant de recevoir un jeton (`completePrimaryLogin`). Toutes ces routes passent par `authRateLimiter` : 30 requêtes par adresse IP en 10 minutes.

## Mot de passe

### Politique et stockage

| Règle | Valeur | Source |
|---|---|---|
| Longueur | 10 à 128 caractères | `passwordPolicy` |
| Composition | Au moins une lettre (`\p{L}`, accents compris) et un chiffre | `passwordPolicy` |
| Hachage | bcrypt, coût 12, sel intégré | `hashValue` |
| Colonne | `User.passwordHash`, `NULL` pour un compte sans mot de passe | [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) |
| Conditions | `acceptTerms` doit valoir `true` à l'inscription | `signupSchema` |

La politique ne vérifie ni les mots de passe compromis (aucune consultation d'une liste de fuites) ni la ressemblance avec l'email. Le mobile affiche les mêmes règles avant l'envoi ([`PasswordRules.tsx`](src:mobile-app/src/components/auth/PasswordRules.tsx)).

### Inscription

`POST /api/auth/signup` ne crée pas le compte. Il hache le mot de passe, place l'empreinte, l'email, le parrain éventuel et la source dans un défi `SIGNUP` stocké dans Redis, puis envoie un code à 6 chiffres. Le compte n'est créé qu'à la vérification de ce code par `POST /api/auth/2fa/verify` : un mot de passe ne peut donc pas être attaché à une adresse que son auteur ne contrôle pas.

Si l'adresse appartient à un compte non vérifié, par exemple créé pour le bénéficiaire d'un ticket offert, la vérification active ce compte et lui donne le mot de passe au lieu d'en créer un second (`activateExistingAccount`). Si elle appartient à un compte vérifié ou anonymisé, la route répond 409 « Un compte existe déjà avec cette adresse email. ».

### Connexion

`POST /api/auth/signin` applique trois protections :

| Protection | Mise en œuvre |
|---|---|
| Message unique | « Email ou mot de passe incorrect. » (401), que l'adresse soit inconnue, anonymisée ou sans mot de passe, ou que le mot de passe soit faux |
| Temps de réponse égalisé | Sans empreinte enregistrée, le mot de passe est comparé à une empreinte bcrypt factice calculée une seule fois (`dummyHash`), pour que la réponse prenne le même temps |
| Blocage | 10 échecs en une heure bloquent le sujet pendant une heure (429). Le sujet est l'identifiant du compte ou, pour une adresse inconnue, `signin:<HMAC de l'adresse>` |

Pour un compte existant, le compteur d'échecs est celui des codes email : des échecs de mot de passe et des codes faux s'additionnent. Comme pour les codes, un tiers peut bloquer la connexion d'un compte pendant une heure. Le test `bloque le compte après 10 échecs, y compris pour une adresse inconnue` couvre ce comportement.

### Réinitialisation

| Étape | Comportement |
|---|---|
| `POST /api/auth/password/forgot` | Réponse identique (`{ "sent": true }`, 200) que le compte existe ou non. Pour un compte actif, un code `PASSWORD_RESET` est émis sous le sujet `password-reset:<userId>` et envoyé par email, sans attendre la fin de l'envoi |
| `POST /api/auth/password/reset` | Email, code et nouveau mot de passe conforme. Code faux ou adresse inconnue : 400 « Code invalide ou expiré. » et un échec compté (sujet anonyme `password-reset:<HMAC>` pour une adresse inconnue) |
| Effet | Nouveau `passwordHash`, `isEmailVerified` à `true`, révocation de toutes les sessions du compte (`revokeAllForUser`), email `security-alert` |

Le code suit les paramètres décrits dans [Paramètres du code](#parametres-du-code). La même route permet à un compte créé sans mot de passe d'en définir un ; l'alerte indique alors « Mot de passe défini sur votre compte ».

## Google et Apple

Le mobile obtient un jeton d'identité auprès du fournisseur et l'envoie au backend, qui le vérifie lui-même avant toute création de compte.

| Contrôle | Google (`/oauth/google`) | Apple (`/oauth/apple`) |
|---|---|---|
| Bibliothèque | `google-auth-library`, `verifyIdToken` | `jose`, `jwtVerify` |
| Clés | Clés publiques de Google, gérées par la bibliothèque | JWKS `https://appleid.apple.com/auth/keys` |
| Algorithme et émetteur | Contrôlés par la bibliothèque | `RS256` seulement, émetteur `https://appleid.apple.com` |
| Audience | `GOOGLE_CLIENT_IDS` | `APPLE_CLIENT_IDS` |
| Email | Obligatoire, `email_verified` doit être vrai | Obligatoire ; `email_verified`, s'il est présent, doit être vrai |
| Fournisseur non configuré | 503 « Connexion Google non configurée. » | 503 « Connexion Apple non configurée. » |
| Jeton refusé | 401 | 401 |

Les deux listes d'identifiants sont vides par défaut : la connexion sociale reste donc désactivée tant qu'elles ne sont pas renseignées (voir [Variables d'environnement](../backend/variables-environnement.md)).

### Rattachement par adresse email

`oauthLogin` cherche le compte par l'adresse email du jeton, sans enregistrer l'identifiant `sub` du fournisseur.

| Situation | Effet |
|---|---|
| Aucun compte | Création du compte, du portefeuille et des 25 EtherPoints de bienvenue, session immédiate |
| Compte non vérifié (bénéficiaire d'un cadeau) | Activation du compte et session immédiate |
| Compte vérifié | Connexion à ce compte, avec l'étape 2FA si elle est active |
| Compte anonymisé | Création d'un nouveau compte |

> [!WARNING]
> Le rattachement repose entièrement sur l'adresse email garantie par le fournisseur. Quiconque contrôle chez Google ou Apple l'adresse d'un compte BlockLucky existant ouvre une session sur ce compte sans connaître son mot de passe. Le niveau de preuve équivaut à celui du code email (la possession de l'adresse), mais la sécurité du compte dépend aussi de celle du compte Google ou Apple. Une adresse relais Apple crée un compte distinct de celui de l'adresse réelle, et un changement d'adresse chez le fournisseur crée un nouveau compte, puisque `sub` n'est pas conservé. Le nom transmis par Apple (`fullName`) est validé puis ignoré.

## Connexion par code email

Ce parcours est celui du web (`POST /api/auth/login`). Il reste ouvert à tous les comptes, y compris à ceux qui ont un mot de passe.

### Déroulé

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant R as Redis
    participant M as File d'emails
    C->>A: "POST /api/auth/login (email, walletAddress, isAdultConfirmed)"
    A->>A: "Recherche du compte par adresse puis par email"
    A->>R: "Code haché, tentatives = 0, TTL 10 min"
    A->>M: "Email otp-code"
    A-->>C: "requiresTwoFactor, twoFactorMethod EMAIL, userId"
    C->>A: "POST /api/auth/2fa/verify (userId, code)"
    A->>R: "Comparaison en temps constant, suppression du code"
    A-->>C: "Jeton JWT et profil"
```

`POST /api/auth/login` ne délivre jamais de jeton quand `LOGIN_EMAIL_CODE_REQUIRED` vaut `true`, ce qui est la valeur par défaut et la seule acceptée en production. Le jeton n'est délivré qu'après `POST /api/auth/2fa/verify`.

Le champ `walletAddress` envoyé par le client sert uniquement à retrouver un compte existant. Il n'est jamais utilisé comme portefeuille : le backend crée le sien (voir [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md)). Comme une adresse de portefeuille est publique sur la chaîne, elle ne prouve rien ; la preuve vient du code reçu par email.

### Paramètres du code

| Paramètre | Valeur | Source |
|---|---|---|
| Longueur | 6 chiffres, chacun tiré par `crypto.randomInt(0, 10)` | `generateOtpCode` |
| Stockage | `HMAC-SHA-256(clé dérivée de ENCRYPTION_KEY, "subjectId:code")` dans la clé Redis `auth:otp:<subjectId>` | `hashCode` |
| Durée de validité | 10 minutes | `CODE_TTL_SECONDS` |
| Essais par code | 5, puis le code est supprimé | `MAX_ATTEMPTS_PER_CODE` |
| Blocage du compte | 10 échecs en une heure bloquent toute vérification pour ce compte pendant une heure (réponse 429) | `MAX_FAILURES_PER_ACCOUNT`, `FAILURE_WINDOW_SECONDS` |
| Limite par adresse IP | 30 requêtes en 10 minutes sur chaque route d'authentification (`/login`, `/signup`, `/signin`, `/password/*`, `/oauth/*`, `/2fa/verify`, `/2fa/disable`) | `authRateLimiter` |
| Comparaison | `crypto.timingSafeEqual` sur les empreintes | `safeEqual` |
| Usage | Unique : le code est supprimé dès qu'il est accepté | `consume` |

Le compteur d'échecs est indexé par compte, pas par adresse IP. Un attaquant qui change d'adresse IP ne contourne donc pas le blocage. En contrepartie, un tiers peut bloquer la connexion d'un compte pendant une heure en saisissant dix codes faux : le blocage est temporaire et ne demande aucune intervention humaine.

### Inscription par code

Un compte n'existe qu'une fois l'email prouvé. Pour une adresse inconnue, le backend :

1. génère un identifiant de défi aléatoire (`randomUUID`) ;
2. stocke dans le défi les données d'inscription (email, code de parrainage résolu, tranche d'âge, source UTM) ;
3. envoie le code.

À la vérification, `createVerifiedUser` crée le compte avec `isEmailVerified: true`, son portefeuille chiffré, les 25 EtherPoints de bienvenue et, le cas échéant, le bonus de parrainage. Aucun point n'est donc attribué à une adresse non prouvée. Le test `exige le code envoyé par email avant de créer le compte et de délivrer un jeton` couvre ce comportement.

La case `isAdultConfirmed` doit valoir `true` : le schéma Zod la refuse sinon. Il s'agit d'une déclaration ; la vérification d'âge effective passe par la pièce d'identité (voir [Vérification d'âge](autorisations.md#verification-d-age)). Les routes `/signup`, `/signin` et OAuth ne demandent pas cette déclaration.

### Code visible en développement

Quand `NODE_ENV` vaut `development`, les réponses qui déclenchent un code email (`/login`, `/signup`, `/signin` avec 2FA par email, `/password/forgot`, `/2fa/setup`) contiennent `devOtpPreview`, la valeur du code. Ce champ n'existe ni en test ni en production.

## Double authentification TOTP

### Activation

1. `POST /api/auth/2fa/setup` avec `{ "method": "APP" }` (route authentifiée).
2. Le backend génère un secret de 32 caractères base32, soit 160 bits, à partir de `crypto.randomBytes(32)`. Comme 256 est un multiple de 32, l'opération `octet % 32` n'introduit pas de biais.
3. Il enregistre le secret chiffré (`encryptText`, format `v2:`) et dix codes de secours hachés, avec `isTwoFactorEnabled: false`.
4. Il renvoie une seule fois le secret, l'URL `otpauth://`, le QR code et les codes de secours en clair.
5. Le citoyen saisit un premier code TOTP dans `POST /api/auth/2fa/verify`. Ce n'est qu'alors que `isTwoFactorEnabled` passe à `true`.
6. Toutes les sessions existantes sont révoquées (`revokeAllForUser`), un email d'alerte est envoyé et une nouvelle session est délivrée.

Une 2FA déjà active ne peut pas être reconfigurée directement : `setup` répond 409 et il faut d'abord la désactiver.

### Vérification

| Paramètre | Valeur |
|---|---|
| Algorithme | HOTP sur HMAC-SHA-1, compteur `floor(t / 30)` |
| Longueur | 6 chiffres |
| Fenêtre | ±1 pas de 30 secondes, soit trois codes acceptés à un instant donné |
| Comparaison | `safeEqual` sur chaque candidat |
| Anti-rejeu | La clé Redis `auth:totp-used:<userId>:<compteur>` est posée par `setIfAbsent` pendant 120 secondes : un code déjà accepté est refusé dans sa fenêtre |

Le test `refuse le rejeu d'un code TOTP déjà utilisé` vérifie l'anti-rejeu.

### Codes de secours

| Propriété | Valeur |
|---|---|
| Nombre | 10 |
| Format | 10 caractères tirés dans `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 symboles), présentés `XXXXX-XXXXX` |
| Entropie | 50 bits par code |
| Stockage | `SHA-256("backup:" + code normalisé)`, dans le tableau `User.twoFactorBackupCodes` |
| Usage | Unique : le code utilisé est retiré du tableau |
| Alerte | Email `security-alert` indiquant le nombre de codes restants |
| Diffusion | Affichés une seule fois dans la réponse de `setup`, jamais envoyés par email |

La normalisation (`normalizeBackupCode`) met en majuscules et retire tout caractère non alphanumérique : `abcde-fghij` et `ABCDEFGHIJ` désignent le même code. Le hachage n'est pas salé ; avec 50 bits d'entropie par code, une attaque par dictionnaire sur une base volée reste coûteuse, mais un hachage lent (bcrypt, déjà disponible via `hashValue`) serait plus robuste.

## Double authentification par email

Avec `{ "method": "EMAIL" }`, `setup` envoie un code de type `SETUP`. Sa vérification active la 2FA par email, révoque les sessions existantes et envoie une alerte. Ensuite, chaque connexion passe par le même code email que la connexion standard.

## Connexion d'un compte protégé par TOTP

Pour un compte dont `twoFactorMethod` vaut `APP` et `isTwoFactorEnabled` vaut `true`, `POST /api/auth/login`, `/signin` et les routes OAuth ne délivrent pas de session et ne génèrent pas de code email. Ils renvoient directement `twoFactorMethod: "APP"` et l'identifiant du compte. Le client envoie ensuite un code TOTP ou un code de secours à `/2fa/verify`.

## Désactivation

`POST /api/auth/2fa/disable` exige l'une de ces preuves :

- un code TOTP ou un code de secours valide ;
- une session de moins de 15 minutes (`sessionService.isRecent`).

Sans preuve, la réponse est 401 et un échec est compté. Quand la 2FA était active, un email d'alerte est envoyé. Le test `exige une authentification récente pour désactiver la 2FA` couvre ce cas.

## 2FA obligatoire pour les administrateurs

`requireRoles` refuse avec 403 toute route ADMIN si le compte n'a pas `isTwoFactorEnabled`, tant que `ADMIN_MFA_REQUIRED` vaut `true`. Cette variable est forcée en production : le schéma de [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) refuse de démarrer avec `false`. Le contrôle lit la base à chaque requête, pas le jeton : un administrateur qui désactive sa 2FA perd l'accès aux routes ADMIN immédiatement.

## Notifications de sécurité

Le modèle [`backend/src/templates/emails/security-alert.html`](src:backend/src/templates/emails/security-alert.html) est envoyé lors des événements suivants :

| Événement | Message |
|---|---|
| Activation de la 2FA par application | « Double authentification par application activée » |
| Activation de la 2FA par email | « Double authentification par email activée » |
| Désactivation de la 2FA | « Double authentification désactivée » |
| Utilisation d'un code de secours | Nombre de codes restants |
| Réinitialisation du mot de passe | « Mot de passe réinitialisé » ou « Mot de passe défini sur votre compte » |

## Limites connues

> [!WARNING]
> Le mot de passe n'est pas un facteur imposé. `POST /api/auth/login` et les routes OAuth restent ouverts à tous les comptes : la possession de la boîte mail, ou du compte Google ou Apple de même adresse, suffit à ouvrir une session sans mot de passe. De plus, `POST /api/auth/2fa/verify` accepte un code TOTP valide accompagné du seul `userId`, sans exiger qu'une connexion par mot de passe ait eu lieu juste avant. Avec la méthode `APP`, le code TOTP peut donc **remplacer** le premier facteur au lieu de s'y ajouter. Avec la méthode `EMAIL` sur `/login`, la connexion est identique à celle d'un compte sans 2FA. Seuls `/signin` et `/oauth/*` suivis d'une 2FA active combinent deux facteurs, et rien n'oblige un attaquant à passer par eux.

Autres limites relevées dans le code :

| Limite | Détail |
|---|---|
| Revendication `twoFactorVerified` | Elle est toujours écrite à `true` dans le jeton et n'est lue nulle part. Elle ne doit pas servir de contrôle. |
| Énumération | La réponse de `/login` diffère selon que le compte existe avec TOTP (`twoFactorMethod: "APP"`) ou non. Pour un compte existant, `userId` est l'identifiant réel ; pour une adresse inconnue, c'est un identifiant de défi aléatoire. `/signup` répond 409 pour une adresse déjà vérifiée. `/signin` et `/password/forgot` ne révèlent rien par leur réponse. |
| Pas de contrôle des mots de passe compromis | La politique se limite à la longueur et à la composition. |
| Défi non atomique | `consume` lit puis réécrit le défi dans Redis. Deux requêtes simultanées peuvent chacune consommer un essai sans que le compteur reflète les deux. La limite par IP et le blocage par compte bornent l'effet. |
| Pas de facteur résistant au hameçonnage | WebAuthn et les clés d'accès (passkeys) ne sont pas implémentés. |
| Mode sans code | Avec `LOGIN_EMAIL_CODE_REQUIRED=false`, possible uniquement hors production, `/login` délivre un jeton sur la seule adresse de portefeuille ou email fournie. Ce mode ne doit servir qu'en développement. |
| Dépendance `otplib` | Elle figure dans [`backend/package.json`](src:backend/package.json) mais le code ne l'importe pas : le TOTP est implémenté à la main dans `totp.service.ts`. |

Ces points sont repris dans [Points à valider](../juridique/points-a-valider.md) et dans la synthèse des [audits](audits.md).
