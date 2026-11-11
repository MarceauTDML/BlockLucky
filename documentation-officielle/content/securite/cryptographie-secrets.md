# Cryptographie et secrets

Toutes les primitives cryptographiques du backend sont regroupées dans [`backend/src/utils/crypto.util.ts`](src:backend/src/utils/crypto.util.ts) et reposent sur le module `crypto` de Node.js. Les secrets viennent exclusivement de l'environnement et sont validés au démarrage par [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts). Cette page décrit ce qui est chiffré, ce qui est haché, comment les secrets sont contrôlés et comment les faire tourner.

## Inventaire

| Donnée | Traitement | Fonction | Réversible |
|---|---|---|---|
| Clé privée du portefeuille citoyen | AES-256-GCM | `encryptText` | Oui, avec `ENCRYPTION_KEY` |
| Secret TOTP | AES-256-GCM | `encryptText` | Oui, avec `ENCRYPTION_KEY` |
| Code de connexion email | HMAC-SHA-256 avec clé dérivée | `hmacSha256` | Non |
| Code de secours 2FA | SHA-256 de `backup:<code>` | `sha256` | Non |
| Jeton de suppression RGPD | SHA-256 | `sha256` dans [`backend/src/api/user/user.repo.ts`](src:backend/src/api/user/user.repo.ts) | Non |
| Signature des webhooks | HMAC-SHA-256 avec `WEBHOOK_SECRET` | `hmacSha256` | Sans objet |
| Session | JWT HS256 avec `JWT_SECRET` | [`backend/src/services/session.service.ts`](src:backend/src/services/session.service.ts) | Signé, non chiffré |
| Email du citoyen | Aucun, en clair en base | | |

## Chiffrement AES-256-GCM

### Clé

`ENCRYPTION_KEY` contient 64 caractères hexadécimaux, soit 32 octets. Le schéma d'environnement refuse toute autre forme. La clé est chargée une fois au démarrage par `Buffer.from(env.ENCRYPTION_KEY, 'hex')`.

### Format `v2:`

```text
v2:<iv en base64url>:<étiquette en base64url>:<texte chiffré en base64url>
```

| Élément | Taille | Origine |
|---|---|---|
| `v2` | Préfixe | Version du format (pas de la clé) |
| IV | 12 octets | `crypto.randomBytes(12)` à chaque chiffrement |
| Étiquette | 16 octets | `cipher.getAuthTag()` |
| Texte chiffré | Variable | `aes-256-gcm` sur le texte en UTF-8 |

L'IV de 12 octets est la taille recommandée pour GCM. Il est tiré au hasard pour chaque valeur ; avec quelques milliers de valeurs chiffrées sous une même clé, le risque de collision est négligeable. L'étiquette rend le chiffrement authentifié : une valeur modifiée en base ou déchiffrée avec une autre clé fait échouer `decipher.final()` au lieu de produire une clé privée erronée.

### Ancien format CBC

`decryptText` accepte encore, en lecture seule, l'ancien format `iv:données` en hexadécimal chiffré en AES-256-CBC. Ce format n'est plus jamais écrit. Il est non authentifié ; le garder en lecture permet de relire d'anciennes valeurs, mais aucune donnée du schéma actuel ne devrait plus l'utiliser. `readTotpSecret` de [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts) accepte aussi un secret TOTP en clair s'il ne porte pas le préfixe `v2:`, pour la même raison de compatibilité.

## Hachage

| Usage | Algorithme | Justification |
|---|---|---|
| Codes email | `HMAC-SHA-256(HMAC_KEY, "subjectId:code")` | Le code n'a que 10⁶ valeurs : un simple SHA-256 se retrouverait par force brute. La clé HMAC, dérivée de `ENCRYPTION_KEY` par `HMAC(ENCRYPTION_KEY, "blocklucky:hmac")`, l'empêche sans connaître la clé. Le code vit 10 minutes. |
| Codes de secours | `SHA-256("backup:" + code)` | 50 bits d'entropie par code. Pas de sel : un hachage lent serait plus robuste. |
| Jetons RGPD | `SHA-256(jeton)` | Jeton de 32 octets aléatoires : une recherche exhaustive est hors de portée. |

La bibliothèque `bcryptjs` est installée et `hashValue` (bcrypt, coût 12) existe, mais aucune fonctionnalité ne l'utilise aujourd'hui, puisqu'il n'y a pas de mot de passe.

## Aléa et comparaisons

| Fonction | Source | Usage |
|---|---|---|
| `generateOtpCode` | `crypto.randomInt` | Codes email à 6 chiffres |
| `generateBackupCode` | `crypto.randomInt` sur un alphabet de 32 caractères | Codes de secours |
| `generateRandomToken` | `crypto.randomBytes(32)` en base64url | Jetons de suppression RGPD |
| `generatePromoCode` | `crypto.randomBytes(6)` en hexadécimal | Codes promo partenaires (48 bits) |
| `TotpService.generateSecret` | `crypto.randomBytes(32)` | Secret TOTP de 160 bits |
| `Wallet.createRandom` d'ethers | Générateur cryptographique d'ethers | Clés de portefeuille |
| `safeEqual` | `crypto.timingSafeEqual` après comparaison des longueurs | Codes, signatures, jeton de métriques |

Aucun appel à `Math.random` n'intervient dans une valeur de sécurité. Il sert seulement à étaler les durées de cache (`withJitter` de [`backend/src/config/redis.config.ts`](src:backend/src/config/redis.config.ts)).

## Secrets refusés en production

Quand `NODE_ENV` vaut `production`, la validation `superRefine` du schéma d'environnement arrête le processus si l'une de ces conditions est vraie :

| Variable | Condition de refus |
|---|---|
| `JWT_SECRET` | Égale à la valeur de développement |
| `ENCRYPTION_KEY` | Égale à la valeur de développement |
| `RELAYER_PRIVATE_KEY` | Égale à la valeur de développement (compte n°0 de Hardhat, publiquement connu) |
| `WEBHOOK_SECRET` | Égale à la valeur de développement |
| `LOGIN_EMAIL_CODE_REQUIRED` | `false` |
| `ADMIN_MFA_REQUIRED` | `false` |
| `BLOCKCHAIN_MODE` | Différente de `onchain` |
| `METRICS_TOKEN` | Vide alors que `METRICS_ENABLED` vaut `true` |

Le processus écrit la liste des problèmes sur la sortie d'erreur puis s'arrête avec le code 1 :

```text
Configuration invalide, démarrage interrompu :
  - JWT_SECRET : JWT_SECRET utilise la valeur de développement, interdite en production
```

Toutes les variables sont aussi vérifiées en forme dans tous les environnements : `JWT_SECRET` d'au moins 16 caractères, `ENCRYPTION_KEY` de 64 caractères hexadécimaux, `RELAYER_PRIVATE_KEY` au format `0x` suivi de 64 caractères hexadécimaux, `WEBHOOK_SECRET` d'au moins 8 caractères.

Le fichier [`docker-compose.yml`](src:docker-compose.yml) lance le backend avec `NODE_ENV: production` et transmet `${JWT_SECRET:-}` : sans valeur dans l'environnement de l'hôte, la variable est une chaîne vide, que la longueur minimale refuse. La stack en conteneurs ne démarre donc pas sans secrets explicites. La procédure est décrite dans [Stack complète en conteneurs](../demarrage/stack-conteneurs.md).

> [!WARNING]
> Certaines valeurs par défaut ne sont **pas** refusées en production : `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` (`minioadmin`), le mot de passe contenu dans la valeur par défaut de `DATABASE_URL`, et `SMTP_USER` / `SMTP_PASS` vides. Elles doivent être fournies explicitement par l'environnement de production. Ajouter `AWS_SECRET_ACCESS_KEY` à la liste `DEV_DEFAULTS` étendrait le contrôle.

La liste complète des variables est sur la page [Variables d'environnement](../backend/variables-environnement.md). Le fichier [`backend/.env.example`](src:backend/.env.example) est comparé au schéma par `npm run env:check` en CI.

## Stockage des secrets

| Règle | Mise en œuvre |
|---|---|
| Aucun secret réel dans Git | gitleaks analyse tout l'historique en CI ([Chaîne logicielle](chaine-logicielle.md)) |
| Valeurs de développement publiques | Seules deux valeurs sont tolérées par [`.gitleaks.toml`](src:.gitleaks.toml) : la clé de chiffrement de développement et la clé n°0 de Hardhat, toutes deux refusées en production |
| Secrets par environnement | Fournis par l'environnement d'exécution ; aucun gestionnaire de secrets (Vault, KMS) n'est intégré |
| Secrets du frontend | Aucun : les variables `NEXT_PUBLIC_*` et `EXPO_PUBLIC_*` ne contiennent que des URL. La CI recherche des motifs de secret dans le bundle web. |

## Rotation

Il n'existe pas d'outil de rotation automatisé. Le tableau donne l'effet de chaque rotation manuelle et le travail qu'elle demande.

| Secret | Effet immédiat | Travail associé |
|---|---|---|
| `JWT_SECRET` | Toutes les sessions deviennent invalides | Aucun : les utilisateurs se reconnectent |
| `WEBHOOK_SECRET` | Les webhooks signés avec l'ancien secret sont refusés | Mettre à jour l'émetteur en même temps |
| `METRICS_TOKEN` | Le collecteur de métriques reçoit 401 | Mettre à jour le collecteur |
| `RELAYER_PRIVATE_KEY` | Le backend signe avec un nouveau compte | Accorder les rôles au nouveau compte, révoquer l'ancien, transférer les ETH restants (voir [Clés et garde des portefeuilles](cles-portefeuilles.md#compromission-et-revocation)) |
| `ENCRYPTION_KEY` | **Toutes les clés de portefeuille, tous les secrets TOTP et tous les codes email en cours deviennent illisibles** | Re-chiffrer chaque valeur avec la nouvelle clé avant la bascule |

> [!CAUTION]
> Le dépôt ne fournit aucun script de re-chiffrement, et le format `v2:` ne porte pas d'identifiant de clé : il n'est pas possible de faire cohabiter deux clés. Remplacer `ENCRYPTION_KEY` sans re-chiffrement rend les portefeuilles citoyens définitivement inutilisables. Sur un réseau de test, les fonds sont fictifs et redistribuables ; avec des fonds réels, ce serait une perte. Avant toute exploitation, il faut écrire ce script (lire chaque `walletEncryptedKey` et `twoFactorSecret`, déchiffrer avec l'ancienne clé, chiffrer avec la nouvelle, dans une transaction) et ajouter un identifiant de clé au format, par exemple `v3:<kid>:...`.

La sauvegarde de `ENCRYPTION_KEY` est aussi critique que celle de la base : l'une sans l'autre ne permet pas de restaurer les portefeuilles. Voir [Sauvegardes et reprise](../infrastructure/sauvegardes.md).

## Limites connues

| Limite | Détail |
|---|---|
| Clé unique pour tout | Une seule `ENCRYPTION_KEY` protège toutes les données chiffrées et sert aussi, par dérivation, de clé HMAC. Pas de clé par utilisateur ni de séparation par usage. |
| Pas de module matériel | Les clés vivent en mémoire du processus Node.js. |
| Emails en clair | Nécessaires pour envoyer les codes ; protégés seulement par le contrôle d'accès à la base. |
