# Docker Compose

Le fichier [`docker-compose.yml`](src:docker-compose.yml), à la racine du dépôt, décrit toute l'infrastructure de BlockLucky : les dépendances (PostgreSQL, Redis, Mailpit, nœud Hardhat) et, derrière le profil `app`, l'application complète (migrations, API, worker, frontend web, site de l'Office de Tourisme). Le projet Compose s'appelle `blocklucky` (clé `name`), ce qui préfixe les volumes et le réseau.

Cette page décrit le fichier tel qu'il est. Pour lancer la stack pas à pas, voir [Stack complète en conteneurs](../demarrage/stack-conteneurs.md) ; pour le contenu des images, voir [Images Docker](images.md).

## Services

{{generated:services-compose}}

## Profils

Compose ne démarre un service doté d'une clé `profiles` que si ce profil est demandé. Deux modes d'utilisation en découlent.

| Commande | Services démarrés | Usage |
| --- | --- | --- |
| `docker compose up -d --wait` | `postgres`, `redis`, `mailpit`, `blockchain` | Développement : le backend, le web et le mobile tournent sur le poste avec `npm run dev` et se connectent aux ports publiés sur `127.0.0.1`. |
| `docker compose --profile app up -d --build --wait` | les quatre précédents, puis `migrate`, `backend`, `worker`, `web`, `tourisme` | Stack complète conteneurisée, proche de la production. |

`--wait` fait attendre la commande jusqu'à ce que chaque service soit sain (ou terminé pour `migrate`). Le service `blockchain` n'a pas de profil : il démarre aussi en mode développement, car le backend fonctionne par défaut en `BLOCKCHAIN_MODE=onchain` (voir [Mode onchain ou simulé](../integration-blockchain/modes.md)).

## Ordre de démarrage

Les dépendances sont déclarées par `depends_on` avec une condition. Compose n'ouvre un service que lorsque la condition de chacune de ses dépendances est remplie.

```mermaid
flowchart LR
    PG["postgres (healthy)"] --> MIG["migrate (completed)"]
    MIG --> API["backend (healthy)"]
    MIG --> WK["worker"]
    RD["redis (healthy)"] --> API
    RD --> WK
    BC["blockchain (healthy)"] --> API
    BC --> WK
    API --> WEB["web"]
    TOU["tourisme"]
    MP["mailpit"]
```

- `migrate` attend que PostgreSQL réponde à `pg_isready`, applique les migrations et s'arrête (`restart: "no"`). Un échec de migration bloque donc le démarrage de l'API et du worker : c'est voulu, l'application ne doit jamais tourner sur un schéma incomplet.
- `backend` et `worker` attendent la fin réussie de `migrate`, un Redis sain et une blockchain saine. La blockchain n'est saine qu'une fois les contrats déployés (fichier témoin `/tmp/blockchain-ready`), ce qui peut prendre jusqu'à une minute au premier démarrage.
- `web` attend que l'API soit saine. Sa sonde utilise `HEALTHCHECK` du Dockerfile backend (`/health/live`).
- `tourisme` et `mailpit` n'ont aucune dépendance.

`depends_on` ne joue qu'au démarrage. Si Redis redémarre plus tard, l'API et le worker ne sont pas relancés automatiquement : voir [Runbooks](runbooks.md#redis-indisponible).

## Sondes de santé

| Service | Origine de la sonde | Commande | Rythme |
| --- | --- | --- | --- |
| `postgres` | Compose | `pg_isready -U etherbay_admin -d blocklucky_db` | 5 s, 10 essais, 10 s de grâce |
| `redis` | Compose | `redis-cli ping` | 5 s, 10 essais |
| `mailpit` | Compose | `/mailpit readyz` | 15 s, 5 essais |
| `blockchain` | Dockerfile de `smart-contract/` | `test -f /tmp/blockchain-ready` | 5 s, 20 essais, 60 s de grâce |
| `backend` | Dockerfile de `backend/` | `fetch` sur `http://127.0.0.1:2053/health/live` | 15 s, 3 essais, 20 s de grâce |
| `worker` | Compose (remplace celle de l'image) | `fetch` sur `http://127.0.0.1:2054/health/live` | 15 s, 3 essais |
| `web` | Dockerfile de `frontend-web/` | `fetch` sur `http://127.0.0.1:3000/`, sain si statut inférieur à 500 | 15 s, 3 essais, 15 s de grâce |
| `tourisme` | Dockerfile de `frontend-office-tourisme/` | `wget` sur `http://127.0.0.1:8080/health` | 30 s |

La colonne Sonde du tableau précise si la sonde est écrite dans le fichier Compose ou héritée de l'instruction `HEALTHCHECK` du Dockerfile. La sonde du worker porte sur le petit serveur HTTP ouvert par [`backend/src/worker.ts`](src:backend/src/worker.ts) sur `PORT + 1`, qui répond 503 pendant l'arrêt.

## Durcissement

L'ancre YAML `x-hardening` regroupe les options de sécurité appliquées par fusion (`<<: *hardening`) à `migrate`, `backend`, `worker`, `web` et `tourisme` :

```yaml
x-hardening: &hardening
  read_only: true
  cap_drop: [ALL]
  security_opt: [no-new-privileges:true]
  tmpfs:
    - /tmp:size=64m
```

| Option | Effet |
| --- | --- |
| `read_only: true` | Le système de fichiers racine du conteneur est en lecture seule. Un attaquant qui obtient une exécution de code ne peut ni modifier le code de l'application, ni déposer un binaire persistant. |
| `cap_drop: [ALL]` | Retire toutes les capacités Linux (par exemple `NET_RAW`, `CHOWN`, `SETUID`). Aucun processus n'en a besoin : tous tournent sans privilège et écoutent sur des ports supérieurs à 1024. |
| `no-new-privileges:true` | Interdit tout gain de privilège par un binaire setuid ou setgid. |
| `tmpfs: /tmp:size=64m` | Seul répertoire inscriptible, en mémoire et limité à 64 Mo, vidé à chaque redémarrage. |

Le service `web` redéfinit `tmpfs` pour ajouter `/app/.next/cache` (128 Mo, propriétaire uid et gid 1000, c'est-à-dire l'utilisateur `node`) : le serveur Next.js y écrit le cache d'optimisation des images. Comme la clé `tmpfs` remplace celle de l'ancre au lieu de la compléter, `/tmp` y est répété.

Le service `blockchain` n'utilise pas l'ancre complète : il garde `cap_drop` et `no-new-privileges`, mais pas `read_only`, car Hardhat écrit dans `/app` (cache de compilation, `deployments/localhost.json`) et dans `/tmp`. Les services d'images tierces (`postgres`, `redis`, `mailpit`) ne sont pas durcis par Compose. Tous les conteneurs applicatifs tournent en outre sous un utilisateur non root défini dans leur image.

## Réseau

Un seul réseau, `default`, est déclaré avec un sous-réseau fixe :

```yaml
networks:
  default:
    ipam:
      driver: default
      config:
        - subnet: 172.40.0.0/16
```

Les services se joignent par leur nom (`postgres:5432`, `redis:6379`, `blockchain:8545`, `mailpit:1025`). Le sous-réseau est fixé pour éviter qu'il chevauche un réseau local ou d'entreprise attribué automatiquement par Docker.

### Ports publiés sur l'hôte

| Port hôte | Service | Liaison |
| --- | --- | --- |
| `5434` | PostgreSQL | `127.0.0.1` uniquement |
| `6380` | Redis | `127.0.0.1` uniquement |
| `1025`, `8025` | Mailpit (SMTP, interface web) | `127.0.0.1` uniquement |
| `8545` | Nœud Hardhat | `127.0.0.1` uniquement |
| `2053` | API | toutes les interfaces |
| `3000` | Frontend web | toutes les interfaces |
| `4000` | Office de Tourisme (port 8080 du conteneur) | toutes les interfaces |

Les ports de PostgreSQL et Redis sont décalés (`5434`, `6380`) pour ne pas entrer en conflit avec une instance installée sur le poste. Les ports applicatifs sont ouverts sur toutes les interfaces pour qu'un téléphone du réseau local atteigne l'API pendant le développement.

> [!WARNING]
> Les ports publiés par Docker contournent le pare-feu `ufw` de l'hôte, car Docker écrit ses propres règles iptables. Sur un serveur exposé à Internet, il faut publier `2053`, `3000` et `4000` sur `127.0.0.1` et laisser le proxy inverse seul face au réseau. La procédure est décrite dans [Déploiement sur etherbay.tech](deploiement-etherbay.md).

## Volumes

| Volume | Monté sur | Contenu |
| --- | --- | --- |
| `pgdata` | `/var/lib/postgresql/data` du service `postgres` | Données PostgreSQL |
| `redisdata` | `/data` du service `redis` | Fichiers AOF de Redis |
| `./docker/postgres/init` (bind, lecture seule) | `/docker-entrypoint-initdb.d` | [`01-extensions.sql`](src:docker/postgres/init/01-extensions.sql), qui crée l'extension `pg_stat_statements` à l'initialisation d'un volume vierge |

Le script d'initialisation ne s'exécute qu'à la création du volume `pgdata`. Sur un volume plus ancien, l'extension se crée à la main (voir [Runbooks](runbooks.md#requetes-lentes-postgresql)).

La blockchain n'a pas de volume. `docker compose down` suivi de `up` repart d'une chaîne neuve, alors que PostgreSQL garde les tickets et le curseur d'indexation de l'ancienne. Pour repartir de zéro, supprimer aussi les volumes avec `docker compose down -v`. Le cas d'un redémarrage involontaire est traité dans [Runbooks blockchain](runbooks-blockchain.md#chaine-locale-reinitialisee).

## Configuration de PostgreSQL et Redis

PostgreSQL est lancé avec ces paramètres, passés en ligne de commande :

| Paramètre | Valeur | Raison |
| --- | --- | --- |
| `shared_preload_libraries` | `pg_stat_statements` | Statistiques par requête normalisée |
| `pg_stat_statements.track` | `all` | Inclut les requêtes imbriquées |
| `log_min_duration_statement` | `500` | Journalise toute requête de plus de 500 ms |
| `log_lock_waits` | `on` | Journalise les attentes de verrou au-delà de `deadlock_timeout` |
| `idle_in_transaction_session_timeout` | `60000` | Coupe une transaction ouverte et inactive depuis 60 s |
| `max_connections` | `100` | Plafond partagé par toutes les instances de l'API et du worker |

Redis est lancé avec `--appendonly yes --appendfsync everysec` (au plus une seconde d'écritures perdues en cas de crash), `--maxmemory 256mb --maxmemory-policy noeviction` (Redis refuse les écritures plutôt que d'évincer une clé, donc un job BullMQ n'est jamais supprimé en silence) et `--slowlog-log-slower-than 10000` (commandes de plus de 10 ms dans le slowlog).

## Variables passées au backend

L'ancre `x-backend-env` est partagée par `backend` et `worker`. Les valeurs sans `${...}` sont écrites en dur dans le fichier ; les autres viennent de l'environnement du shell ou d'un fichier `.env` placé à la racine du dépôt, à côté de `docker-compose.yml`.

| Variable | Valeur | Remarque |
| --- | --- | --- |
| `NODE_ENV` | `production` | Active les contrôles de production de [`env.config.ts`](src:backend/src/config/env.config.ts) |
| `DATABASE_URL` | `postgresql://etherbay_admin:etherbay_password@postgres:5432/blocklucky_db?schema=public` | Identifiants de démonstration en clair |
| `REDIS_URL` | `redis://redis:6379` | |
| `BLOCKCHAIN_MODE` | `onchain` | Obligatoire en production |
| `RPC_URL`, `CHAIN_ID` | `http://blockchain:8545`, `31337` | Nœud Hardhat du service `blockchain` |
| `LOTTERY_CONTRACT_ADDRESS`, `POAP_CONTRACT_ADDRESS` | `0xCf7E…0Fc9`, `0x5FC8…5707` | Adresses déterministes du déploiement local |
| `SMTP_HOST`, `SMTP_PORT` | `mailpit`, `1025` | Emails capturés par Mailpit |
| `FRONTEND_URL` | `http://localhost:3000` | Liens des emails, parrainage, métadonnées POAP |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:8081` | Origines web et Expo autorisées |
| `JWT_SECRET`, `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY`, `WEBHOOK_SECRET`, `METRICS_TOKEN` | `${NOM:-}` | Secrets à fournir, vides sinon |

Le backend reçoit en plus `RUN_WORKERS: "false"`. Toutes les autres variables prennent la valeur par défaut du schéma (voir [Variables d'environnement](../backend/variables-environnement.md)) : notamment `TRUST_PROXY=false`, `PORT=2053`, `AWS_S3_ENDPOINT=http://localhost:9000` (aucun service S3 n'est fourni, les envois échouent et sont journalisés en avertissement) et `FALLBACK_RPC_URL` vers un RPC public Sepolia.

### Secrets obligatoires

Avec `NODE_ENV=production`, le schéma de configuration refuse de démarrer si une valeur est absente ou égale à sa valeur de développement :

- `JWT_SECRET` : 16 caractères au moins ;
- `ENCRYPTION_KEY` : exactement 64 caractères hexadécimaux ;
- `RELAYER_PRIVATE_KEY` : clé privée `0x` suivie de 64 caractères hexadécimaux, différente de la clé du compte Hardhat n° 0 ;
- `WEBHOOK_SECRET` : 8 caractères au moins ;
- `METRICS_TOKEN` : obligatoire tant que `METRICS_ENABLED` vaut `true` (valeur par défaut).

La substitution `${NOM:-}` transmet une chaîne vide quand la variable manque. Une chaîne vide n'est pas « absente » pour Zod : la valeur par défaut ne s'applique pas et la validation échoue. Le conteneur s'arrête alors avec le message `Configuration invalide, démarrage interrompu` suivi de la liste des variables en cause. Un exemple de génération des valeurs :

```bash
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
RELAYER_PRIVATE_KEY=0x$(openssl rand -hex 32)
WEBHOOK_SECRET=$(openssl rand -hex 24)
METRICS_TOKEN=$(openssl rand -hex 24)
EOF
```

> [!CAUTION]
> `ENCRYPTION_KEY` chiffre les clés privées des portefeuilles intégrés et les secrets TOTP. La perdre rend tous les portefeuilles inutilisables ; la changer impose de rechiffrer les données (voir [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md)). Le fichier `.env` ne doit jamais être commité.

## Service blockchain et compte opérateur

Le service `blockchain` est construit depuis [`smart-contract/Dockerfile`](src:smart-contract/Dockerfile) et lance [`start-local-chain.sh`](src:smart-contract/docker/start-local-chain.sh), qui enchaîne :

1. `npx hardhat node --hostname 0.0.0.0 --port 8545` en arrière-plan ;
2. une boucle qui interroge `eth_chainId` jusqu'à ce que le nœud réponde ;
3. `npx hardhat run scripts/deploy-local.ts --network localhost`, qui déploie `VRFCoordinatorV2_5Mock`, crée et finance un abonnement, déploie `BlockLucky` (tours de 30 minutes) et `BlockLuckyPOAP`, puis enregistre le contrat comme consommateur VRF ;
4. la création de `/tmp/blockchain-ready`, qui rend la sonde saine ;
5. `scripts/local-vrf-responder.ts` en arrière-plan : il surveille les événements `RandomWordsRequested` toutes les 2 secondes et répond avec le compte Hardhat n° 9.

Le service reçoit deux variables :

| Variable | Valeur | Rôle |
| --- | --- | --- |
| `OPERATOR_PRIVATE_KEY` | `${RELAYER_PRIVATE_KEY:-}` | Clé du compte opérateur du backend |
| `POAP_BASE_URI` | `http://localhost:2053/api/v1/lottery/poap/` | Préfixe des métadonnées des badges (`tokenURI`) |

`OPERATOR_PRIVATE_KEY` est la même clé que `RELAYER_PRIVATE_KEY` côté backend. [`deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) en déduit l'adresse et, si elle diffère du compte administrateur (compte Hardhat n° 0), lui accorde `OPERATOR_ROLE` et `PAUSER_ROLE` sur `BlockLucky`, `MINTER_ROLE` sur `BlockLuckyPOAP`, et lui envoie 1 000 ethers fictifs (`OPERATOR_FUNDING_ETH`). Sans cette habilitation, le keeper ne pourrait pas demander le tirage, le disjoncteur serait refusé et les badges ne seraient pas émis. Le rôle du compte opérateur est détaillé dans [Client RPC et compte opérateur](../integration-blockchain/client-rpc.md).

Les adresses des contrats sont déterministes : elles dépendent seulement du compte qui déploie et de son nonce. Tant que l'ordre des transactions de `deploy-local.ts` ne change pas, `BlockLucky` est en `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` et `BlockLuckyPOAP` en `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`, les valeurs écrites dans `x-backend-env`. Modifier le script de déploiement impose de vérifier ces adresses.

> [!IMPORTANT]
> Le nœud Hardhat garde son état en mémoire. Tout redémarrage du conteneur (`docker compose restart blockchain`, redémarrage de Docker ou de la machine, `restart: unless-stopped` après un crash) recrée une chaîne vierge aux mêmes adresses. La base PostgreSQL, elle, conserve tickets, tours et curseur : voir [Runbooks blockchain](runbooks-blockchain.md#chaine-locale-reinitialisee).

## Arrêt

`backend` et `worker` déclarent `stop_grace_period: 30s`. À `docker compose stop`, Docker envoie `SIGTERM` (le Dockerfile fixe `STOPSIGNAL SIGTERM`) et attend 30 secondes avant `SIGKILL`. Le backend ferme ses ressources dans l'ordre et se force à quitter après `SHUTDOWN_TIMEOUT_MS` (25 s par défaut), donc avant l'échéance de Docker. Le détail de la séquence est dans [Observabilité](../backend/observabilite.md).

## Valider le fichier

La CI vérifie la syntaxe et la résolution des ancres, profil `app` compris :

```bash
docker compose --profile app config -q
```

Sans `-q`, la commande affiche le fichier final fusionné, utile pour contrôler une surcharge.
