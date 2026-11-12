# Environnements

BlockLucky tourne dans quatre configurations. Elles partagent le même code ; seules changent la façon de lancer les processus, la configuration et la blockchain visée.

| | Développement local | Stack Docker | Démonstration en ligne | Sepolia |
| --- | --- | --- | --- | --- |
| Lancement des applications | `npm run dev` sur le poste | `docker compose --profile app up` | stack Docker sur la VM `vm-etherbay` | backend pointé vers Sepolia |
| `NODE_ENV` | `development` | `production` | `production` | `production` |
| Blockchain | nœud Hardhat du conteneur `blockchain` | nœud Hardhat du conteneur `blockchain` | nœud Hardhat sur la VM | testnet Sepolia (chain ID 11155111) |
| Aléa du tirage | oracle VRF simulé | oracle VRF simulé | oracle VRF simulé | Chainlink VRF v2.5 réel |
| Emails | Mailpit (`localhost:8025`) | Mailpit | Mailpit, à décider (voir plus bas) | à définir |
| Secrets | valeurs de développement de `.env.example` | fichier `.env` racine, obligatoire | fichier `.env` sur la VM | idem |
| Accès | `localhost` | `localhost` | `https://etherbay.tech` et sous-domaines | selon l'hébergement |
| État | opérationnel | opérationnel | VM prête, application non déployée | script prêt, aucun déploiement versionné |

## Développement local

Les dépendances tournent dans Docker, les applications sur le poste. C'est le mode décrit dans [Infrastructure locale](../demarrage/infrastructure-locale.md) et [Lancer les applications](../demarrage/lancer-les-applications.md).

```bash
docker compose up -d --wait
```

Cette commande démarre `postgres` (port 5434), `redis` (6380), `mailpit` (1025 et 8025) et `blockchain` (8545), tous liés à `127.0.0.1`. Chaque application lit ensuite son propre fichier `.env`, copié depuis `.env.example` :

| Projet | Fichier | Valeurs clés |
| --- | --- | --- |
| backend | `backend/.env` | `NODE_ENV=development`, `DATABASE_URL` vers `localhost:5434`, `REDIS_URL` vers `localhost:6380`, `RPC_URL=http://127.0.0.1:8545`, secrets de développement |
| frontend web | `frontend-web/.env` | `NEXT_PUBLIC_API_URL=http://localhost:2053/api`, `NEXT_PUBLIC_WS_URL=http://localhost:2053` |
| mobile | `mobile-app/.env` | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL` ; adresse IP du poste à la place de `localhost` sur un téléphone physique ; `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` pour la connexion Google |
| Office de Tourisme | aucun | `npm run dev` sert le dossier sur le port 4000 |

Particularités de ce mode :

- en `development`, le backend accepte les valeurs par défaut des secrets, la désactivation de `LOGIN_EMAIL_CODE_REQUIRED`, `ADMIN_MFA_REQUIRED` et `AGE_VERIFICATION_REQUIRED`, et `BLOCKCHAIN_MODE=simulated` ;
- `RUN_WORKERS=true` par défaut : un seul processus `npm run dev` porte l'API, les workers BullMQ, l'indexeur et le keeper ;
- les journaux sont colorés et lisibles, au niveau `debug` ;
- `/metrics` et le détail de `/health/deep` sont accessibles sans jeton si `METRICS_TOKEN` est vide ;
- le compte opérateur est le compte Hardhat n° 0, qui a déployé les contrats et garde les rôles opérateur, pause, frappe et `DEFAULT_ADMIN_ROLE` ; l'administrateur de la Mairie est le compte n° 2, la trésorerie le compte n° 1.

Le mode simulé (`BLOCKCHAIN_MODE=simulated`) permet de travailler sans nœud : achats, tirages et badges sont alors fabriqués par [`blockchain.service.ts`](src:backend/src/services/blockchain.service.ts) avec des hachages aléatoires. Il est refusé en production. Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

## Stack Docker

Toute l'application tourne en conteneurs sur le poste, avec les mêmes images que celles visées en production :

```bash
docker compose --profile app up -d --build --wait
```

Ce qui change par rapport au développement local :

| Sujet | Stack Docker |
| --- | --- |
| Configuration | `NODE_ENV=production` dans `x-backend-env` : tous les contrôles de production s'appliquent |
| Secrets | `JWT_SECRET`, `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY`, `WEBHOOK_SECRET` et `METRICS_TOKEN` doivent être fournis par un fichier `.env` racine, sinon l'API et le worker refusent de démarrer |
| Processus | API (`RUN_WORKERS=false`) et worker séparés |
| Opérateur | compte dérivé de `RELAYER_PRIVATE_KEY`, habilité (y compris `DEFAULT_ADMIN_ROLE` additionnel) et approvisionné par `deploy-local.ts` ; le compte n° 0 qui a déployé perd tous ses rôles |
| Migrations | appliquées par le service `migrate` ; aucun seed n'est lancé, la base démarre vide |
| Journaux | JSON sur une ligne, niveau `info` : les requêtes réussies (niveau `http`) ne sont pas journalisées |
| `/metrics` | protégé par `Authorization: Bearer <METRICS_TOKEN>` |
| Frontend | build Next.js de production, URL de l'API figées au build |

Les détails sont dans [Docker Compose](docker-compose.md) et [Stack complète en conteneurs](../demarrage/stack-conteneurs.md).

> [!NOTE]
> La stack Docker est l'environnement le plus proche de la production disponible dans le dépôt. Un changement d'infrastructure (Dockerfile, Compose, variable de configuration) se teste ici avant d'être porté sur la VM de démonstration.

## Démonstration en ligne

La démonstration publique vise `etherbay.tech`, sur une machine virtuelle Azure for Students. Elle reprend la stack Docker avec quatre différences : des URL publiques en HTTPS derrière le proxy Caddy, la prise en compte du proxy (`TRUST_PROXY`), des ports applicatifs limités à `127.0.0.1` et un nœud Hardhat qui tourne sur la VM. À la date de rédaction, la VM et Caddy sont en place, l'application n'est pas encore déployée.

| Nom | Cible |
| --- | --- |
| `etherbay.tech` | frontend web (port 3000) |
| `www.etherbay.tech` | redirection vers `etherbay.tech` |
| `api.etherbay.tech` | API et Socket.IO (`127.0.0.1:2053`) |
| `tourisme.etherbay.tech` | Office de Tourisme (port 4000) |
| `docs.etherbay.tech` | cette documentation, fichiers statiques |

La procédure complète, avec la liste de ce qui reste à faire, est dans [Déploiement sur etherbay.tech](deploiement-etherbay.md).

## Sepolia

Sepolia est le réseau de test public d'Ethereum. C'est le seul environnement où le tirage utilise le vrai service Chainlink VRF v2.5 et où les transactions sont visibles par tous sur un explorateur. Les ethers y sont gratuits mais rares (robinets limités), ce qui change l'exploitation : le compte opérateur paie le gas du keeper, des badges et de chaque dotation de bienvenue.

La mise en place passe par quatre scripts de `smart-contract/`, à lancer dans l'ordre : `npm run vrf:sepolia` crée et finance l'abonnement VRF, `npm run deploy:sepolia` vérifie le réseau, la key hash et le financement, déploie les deux contrats, répartit les rôles entre le multisig de la Mairie (`MAIRIE_ADMIN_ADDRESS`), la trésorerie (`MAIRIE_TREASURY_ADDRESS`) et l'opérateur (`OPERATOR_ADDRESS`), puis écrit `deployments/sepolia.json` (fichier non versionné) ; `npm run automation:sepolia` inscrit l'upkeep Chainlink Automation et `npm run verify:sepolia` publie le code sur Etherscan. Aucun de ces scripts n'a encore été exécuté : ils demandent les clés et les fonds de test de l'équipe, et aucune adresse Sepolia n'est enregistrée dans le dépôt. La procédure est détaillée dans [Déploiement sur Sepolia](../smart-contracts/sepolia.md) et [Redéployer sur Sepolia](../guides/redeployer-sepolia.md).

Côté backend, les variables à changer par rapport à la stack locale :

| Variable | Valeur pour Sepolia |
| --- | --- |
| `RPC_URL` | accès RPC Sepolia (fournisseur ou nœud) |
| `FALLBACK_RPC_URL` | un second accès RPC Sepolia, différent du premier |
| `CHAIN_ID` | `11155111` |
| `CHAIN_START_BLOCK` | `deploymentBlock` de `deployments/sepolia.json` |
| `CHAIN_CONFIRMATIONS` | `2` |
| `EXPLORER_URL` | `https://sepolia.etherscan.io` |
| `LOTTERY_CONTRACT_ADDRESS`, `POAP_CONTRACT_ADDRESS` | adresses déployées |
| `RELAYER_PRIVATE_KEY` | clé de `OPERATOR_ADDRESS`, approvisionnée en ETH Sepolia ; elle n'a pas `DEFAULT_ADMIN_ROLE`, le reversement de commission ne fonctionne donc que vers `MAIRIE_TREASURY_ADDRESS` |
| `WELCOME_GRANT_WEI` | à réduire, voire `0`, selon le solde disponible de l'opérateur |

> [!WARNING]
> Dans `docker-compose.yml`, `RPC_URL`, `CHAIN_ID` et les adresses des contrats sont écrits en dur dans `x-backend-env`, et `CHAIN_START_BLOCK`, `CHAIN_CONFIRMATIONS` et `EXPLORER_URL` n'y figurent pas. Pour viser Sepolia avec Compose, il faut un fichier de surcharge qui redéfinit ces variables pour `backend` et `worker`, et ne pas démarrer le service `blockchain`.

`CHAIN_START_BLOCK` évite de parcourir toute la chaîne depuis le bloc 0 au premier démarrage de l'indexeur. `CHAIN_CONFIRMATIONS` fait attendre l'indexeur deux blocs sous la tête de chaîne, ce qui protège contre une réorganisation courte. Ces mécanismes sont décrits dans [Indexeur d'événements](../integration-blockchain/indexeur.md).

## Ce qui ne change jamais

Quel que soit l'environnement :

- le schéma de configuration de [`env.config.ts`](src:backend/src/config/env.config.ts) valide toutes les variables au démarrage et arrête le processus si l'une est invalide ;
- les migrations Prisma sont appliquées par `prisma migrate deploy`, jamais par `migrate dev`, hors poste de développement ;
- la source de vérité des tickets, tirages et cagnottes est le smart contract ; PostgreSQL n'en est qu'une projection reconstruisible (voir [Reconstruire depuis la chaîne](../base-de-donnees/reconstruction.md)) ;
- les comptes de démonstration ne sont créés que par le seed (`npm run prisma:seed`), lancé à la main.
