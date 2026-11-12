# Variables d'environnement

Cette page est la référence des variables lues par le backend. Le tableau est généré à la construction de la documentation depuis [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) : type, valeur par défaut et contraintes viennent directement du schéma Zod, il ne peut donc pas diverger du code. Le chargement, la validation et les règles propres à la production sont expliqués sur la page [Configuration](configuration.md).

Les mêmes variables servent aux deux process, l'API (`server.ts`) et le worker (`worker.ts`). Une valeur incohérente entre les deux, par exemple deux `REDIS_KEY_PREFIX` différents, casse le relais Socket.IO et l'idempotence. Dans la stack Docker, l'ancre `x-backend-env` de `docker-compose.yml` garantit qu'ils reçoivent les mêmes valeurs.

## Générer les secrets

Quatre variables sont des secrets refusés en production s'ils gardent leur valeur de développement. Les commandes suivantes utilisent Node, déjà requis par le projet. La dernière s'exécute depuis `backend/`, où `ethers` est installé.

| Variable | Format attendu | Commande |
|---|---|---|
| `JWT_SECRET` | au moins 16 caractères | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ENCRYPTION_KEY` | exactement 64 caractères hexadécimaux | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `WEBHOOK_SECRET` | au moins 8 caractères | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RELAYER_PRIVATE_KEY` | `0x` suivi de 64 caractères hexadécimaux | `node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"` |
| `METRICS_TOKEN` | chaîne non vide en production | `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"` |

> [!CAUTION]
> `ENCRYPTION_KEY` chiffre en AES-256-GCM la clé privée de chaque portefeuille intégré (`User.walletEncryptedKey`), les secrets TOTP et les images des pièces d'identité en attente. Si elle est perdue ou changée, les portefeuilles ne peuvent plus signer : les ethers fictifs et les tickets qu'ils détiennent deviennent inaccessibles, les citoyens doivent reconfigurer leur 2FA et les pièces en attente ne peuvent plus être examinées. Sauvegardez-la hors du serveur avant la mise en service et ne la faites jamais tourner sans plan de rechiffrement. Voir [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

Changer `JWT_SECRET` invalide toutes les sessions ouvertes : c'est un moyen radical de déconnecter tout le monde. Changer `WEBHOOK_SECRET` impose de mettre à jour l'émetteur du webhook en même temps.

## Valeurs selon l'environnement

### Développement local

`cp .env.example .env` suffit. Les valeurs visent l'infrastructure lancée par `docker compose up -d --wait` depuis la racine du dépôt.

| Besoin | Réglage |
|---|---|
| Travailler sans nœud blockchain | `BLOCKCHAIN_MODE=simulated` : achats, tirages et pause sont simulés, `/lottery/claim-prize` répond 409 |
| Lire le code de connexion sans ouvrir Mailpit | rien à faire : en `NODE_ENV=development`, les réponses de `/auth/login`, `/auth/signup` et `/auth/password/forgot` contiennent `devOtpPreview` |
| Se connecter sans code email | `LOGIN_EMAIL_CODE_REQUIRED=false` (refusé en production) |
| Utiliser l'administration sans 2FA | `ADMIN_MFA_REQUIRED=false` (refusé en production) |
| Jouer sans faire vérifier son âge | `AGE_VERIFICATION_REQUIRED=false` (refusé en production) ; les comptes du seed sont déjà vérifiés |
| Raccourcir la salle d'attente du tirage | `DRAW_REVEAL_DELAY_SECONDS=0` pour un tirage dès la fermeture des achats, ou une valeur courte pour une démonstration |
| Tester la connexion Google ou Apple | renseigner `GOOGLE_CLIENT_IDS` ou `APPLE_CLIENT_IDS` avec les identifiants client de l'application ; sans eux, les routes répondent 503 |
| Voir les requêtes SQL | `DB_LOG_QUERIES=true` |
| Tester l'application mobile sur un téléphone | ajouter l'origine Expo à `CORS_ORIGINS` (voir [Tester sur un téléphone](../mobile/telephone-physique.md)) |

Après un redémarrage du nœud Hardhat, la chaîne repart du bloc 0 alors que la base garde son curseur d'indexation : l'indexeur journalise alors que le curseur dépasse la tête de chaîne. Il faut réinitialiser la base avec `npm run prisma:reset`, comme décrit dans [Blockchain locale](../smart-contracts/blockchain-locale.md).

### Stack Docker

Le fichier `docker-compose.yml` fixe déjà les variables d'infrastructure dans l'ancre `x-backend-env` : `NODE_ENV=production`, `DATABASE_URL` sur `postgres:5432`, `REDIS_URL` sur `redis:6379`, `BLOCKCHAIN_MODE=onchain`, `RPC_URL=http://blockchain:8545`, `CHAIN_ID=31337`, les deux adresses de contrats, `SMTP_HOST=mailpit` et les origines CORS. Le service `backend` y ajoute `RUN_WORKERS=false` ; le service `worker` démarre `dist/src/worker.js`.

Comme la stack tourne en `production`, les règles de production s'appliquent. Les cinq secrets sont lus depuis un fichier `.env` placé à la racine du dépôt, lu par Docker Compose pour l'interpolation :

```ini
JWT_SECRET=valeur-generee
ENCRYPTION_KEY=64-caracteres-hexadecimaux
RELAYER_PRIVATE_KEY=0x64-caracteres-hexadecimaux
WEBHOOK_SECRET=valeur-generee
METRICS_TOKEN=valeur-generee
```

Si l'une manque, `backend` et `worker` s'arrêtent au démarrage avec `Configuration invalide`. La même `RELAYER_PRIVATE_KEY` est transmise au conteneur `blockchain` sous le nom `OPERATOR_PRIVATE_KEY` pour habiliter ce compte sur les contrats déployés. Le détail est sur la page [Stack complète en conteneurs](../demarrage/stack-conteneurs.md).

### Sepolia

Pour brancher le backend sur le déploiement public, reprendre les valeurs du fichier `smart-contract/deployments/sepolia.json` écrit par `npm run deploy:sepolia` (voir [Déploiement sur Sepolia](../smart-contracts/sepolia.md)).

| Variable | Valeur |
|---|---|
| `BLOCKCHAIN_MODE` | `onchain` |
| `CHAIN_ID` | `11155111` |
| `RPC_URL` | URL d'un fournisseur RPC Sepolia avec clé d'API |
| `FALLBACK_RPC_URL` | un second fournisseur ; la valeur par défaut est déjà un nœud public Sepolia |
| `LOTTERY_CONTRACT_ADDRESS`, `POAP_CONTRACT_ADDRESS` | `contracts.lottery` et `contracts.poap` du fichier de déploiement |
| `CHAIN_START_BLOCK` | `deploymentBlock` du fichier de déploiement, sans quoi l'indexeur parcourt Sepolia depuis le bloc 0 par tranches de 2 000 blocs |
| `CHAIN_CONFIRMATIONS` | supérieur à 0 sur un réseau public, pour ne pas indexer un bloc qui serait réorganisé |
| `EXPLORER_URL` | `https://sepolia.etherscan.io` |
| `RELAYER_PRIVATE_KEY` | clé du compte `operator` habilité par le script de déploiement (rôles opérateur, pause et frappe) |
| `WELCOME_GRANT_WEI` | à dimensionner selon les ethers de test dont dispose le compte opérateur : chaque nouveau citoyen en reçoit une fois |
| `INDEXER_INTERVAL_MS`, `KEEPER_INTERVAL_MS` | à rallonger si le fournisseur RPC limite le nombre d'appels |

> [!WARNING]
> Sur Sepolia, le compte opérateur paie le gaz des tirages, des annulations, de la frappe des POAP et des dotations. Un solde vide bloque silencieusement les dotations (journalisées en erreur) puis les achats des nouveaux citoyens, qui reçoivent `402 Solde d'ethers fictifs insuffisant`.

`POST /admin/treasury/withdraw` appelle `setTreasury` sur le contrat quand l'adresse demandée diffère de la trésorerie actuelle. Cette fonction exige le rôle d'administrateur du contrat : si le compte opérateur n'est pas aussi administrateur, seul un retrait vers la trésorerie déjà configurée fonctionne.

## Référence

{{generated:variables-environnement}}
