# Infrastructure locale

Le backend a besoin de quatre services pour fonctionner : PostgreSQL, Redis, un serveur SMTP et un nœud Ethereum. En local, ils sont tous fournis par [`docker-compose.yml`](src:docker-compose.yml), sans profil, avec une seule commande. Cette page décrit ce qu'ils contiennent et comment les piloter. La stack complète en conteneurs (API, worker, web) est traitée à part dans [Stack complète en conteneurs](stack-conteneurs.md).

## Démarrer

Depuis la racine du dépôt :

```bash
docker compose up -d --wait
```

`--wait` rend la main quand les quatre services sont démarrés et que leurs sondes de santé répondent. Le premier lancement construit l'image de la blockchain locale à partir de [`smart-contract/Dockerfile`](src:smart-contract/Dockerfile) : compter plusieurs minutes. Pour ne démarrer que la blockchain :

```bash
docker compose up -d --wait blockchain
```

## Les quatre services

| Service | Image | Adresse sur le poste | Données |
|---|---|---|---|
| `postgres` | `postgres:15-alpine` | `localhost:5434` | Volume `pgdata`, conservé |
| `redis` | `redis:7.4-alpine` | `localhost:6380` | Volume `redisdata`, conservé |
| `mailpit` | `axllent/mailpit:v1.31.4` | SMTP `localhost:1025`, interface `http://localhost:8025` | Aucun volume : perdues à la suppression du conteneur |
| `blockchain` | Construite depuis `smart-contract/` | JSON-RPC `http://127.0.0.1:8545`, chain ID 31337 | **Aucune persistance** |

Tous les ports sont liés à `127.0.0.1` : ils ne sont pas joignables depuis le réseau local. Les conteneurs partagent le réseau `172.40.0.0/16`.

### PostgreSQL

| Paramètre | Valeur |
|---|---|
| Base | `blocklucky_db` |
| Utilisateur | `etherbay_admin` |
| Mot de passe | `etherbay_password` (développement uniquement) |
| URL pour le backend | `postgresql://etherbay_admin:etherbay_password@localhost:5434/blocklucky_db?schema=public` |

Le conteneur active l'extension `pg_stat_statements` (script [`docker/postgres/init/01-extensions.sql`](src:docker/postgres/init/01-extensions.sql), exécuté à la création du volume), journalise les requêtes de plus de 500 ms et les attentes de verrou, coupe les transactions inactives après 60 secondes et limite les connexions à 100. Ces réglages servent l'analyse de performance décrite dans [Performance et sauvegardes](../base-de-donnees/performance-sauvegardes.md).

Le conteneur ne crée que la base vide. Les tables sont créées par les migrations Prisma, lancées depuis `backend/` ([Lancer les applications](lancer-les-applications.md)).

### Redis

Redis tourne avec la persistance AOF (écriture chaque seconde), une mémoire maximale de 256 Mo et la politique `noeviction` : quand la mémoire est pleine, Redis refuse les écritures au lieu d'effacer des clés. C'est indispensable pour BullMQ. Le backend préfixe toutes ses clés par `blocklucky:<NODE_ENV>:`.

Si Redis est injoignable, le backend continue à fonctionner avec un stockage de repli en mémoire, limité au processus en cours ; ce mode dégradé est décrit dans l'[ADR 0002](../architecture/adr/0002-redis-files-et-repli-memoire.md) et dans [Données Redis](../base-de-donnees/redis.md).

### Mailpit

Mailpit capture tous les emails envoyés par le backend, sans jamais les délivrer. L'interface `http://localhost:8025` affiche les codes de connexion, les codes 2FA, les emails de bienvenue, de récompense et de suppression RGPD, ainsi que les alertes de sécurité. Le backend s'y connecte sans authentification (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_USER` et `SMTP_PASS` vides).

### La blockchain locale

Le service `blockchain` exécute [`smart-contract/docker/start-local-chain.sh`](src:smart-contract/docker/start-local-chain.sh), qui enchaîne quatre étapes :

```mermaid
sequenceDiagram
    participant S as start-local-chain.sh
    participant N as Nœud Hardhat
    participant D as deploy-local.ts
    participant O as Oracle VRF local
    S->>N: hardhat node sur 0.0.0.0:8545
    S->>N: Attente de eth_chainId
    S->>D: Déploiement des contrats
    D->>N: Coordinateur VRF simulé, BlockLucky, BlockLuckyPOAP
    D->>N: Rôles, trésorerie, propriété VRF et ethers pour l'opérateur
    S->>S: Création de /tmp/blockchain-ready
    S->>O: Lancement de local-vrf-responder.ts
    O->>N: Répond aux demandes de tirage toutes les 2 secondes
```

La sonde de santé de l'image vérifie la présence du fichier `/tmp/blockchain-ready` : le service n'est déclaré sain qu'une fois les contrats déployés.

#### Adresses déterministes

Un nœud Hardhat neuf utilise toujours les mêmes comptes, et le script déploie toujours dans le même ordre. Les adresses sont donc fixes. Ce sont les valeurs par défaut du backend ([`backend/.env.example`](src:backend/.env.example)) et du fichier `smart-contract/deployments/localhost.json`, que le script de déploiement local écrit à chaque démarrage et qui n'est pas versionné.

| Élément | Adresse |
|---|---|
| Coordinateur VRF simulé (`VRFCoordinatorV2_5Mock`) | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `BlockLucky` (`LOTTERY_CONTRACT_ADDRESS`) | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| `BlockLuckyPOAP` (`POAP_CONTRACT_ADDRESS`) | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |

#### Comptes

| Compte Hardhat | Adresse | Rôle |
|---|---|---|
| n° 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Déployeur ; par défaut aussi opérateur du backend (opérateur, pause, frappe et `DEFAULT_ADMIN_ROLE` additionnel) |
| n° 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Trésorerie qui reçoit la commission (`LOCAL_TREASURY_ACCOUNT_INDEX`) |
| n° 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Administrateur de la Mairie (`DEFAULT_ADMIN_ROLE` sur les deux contrats) et propriétaire VRF (`LOCAL_ADMIN_ACCOUNT_INDEX`) |
| n° 9 | Selon `VRF_ORACLE_ACCOUNT_INDEX` | Signataire des réponses de l'oracle VRF local |

Depuis la séparation des rôles ([`smart-contract/scripts/lib/roles.ts`](src:smart-contract/scripts/lib/roles.ts)), le script de déploiement local répartit les rôles comme sur Sepolia : le compte n° 2 est l'administrateur et accepte lui-même la propriété VRF (`acceptOwnership`), le compte n° 1 est la trésorerie, l'opérateur reçoit `OPERATOR_ROLE`, `PAUSER_ROLE` et `MINTER_ROLE`. Une seule exception : en local, l'opérateur garde aussi `DEFAULT_ADMIN_ROLE`, pour que le reversement de commission depuis l'espace Mairie puisse appeler `setTreasury`. `LOCAL_STRICT_ROLES=true` supprime cette exception.

La valeur par défaut de `RELAYER_PRIVATE_KEY` dans `backend/.env.example` est la clé publique et bien connue du compte n° 0. En développement, l'opérateur est donc le déployeur, qui garde ses rôles. Si `RELAYER_PRIVATE_KEY` est définie dans l'environnement du shell au lancement de Compose, elle est transmise au conteneur sous le nom `OPERATOR_PRIVATE_KEY` : le script accorde alors les rôles à ce compte, lui verse 1 000 ETH fictifs, puis retire tous ses rôles au compte n° 0.

> [!CAUTION]
> Les clés des comptes Hardhat sont publiques. Elles ne doivent jamais servir sur un réseau réel, même de test. Le backend refuse de démarrer en production avec la clé du compte n° 0.

#### Paramètres des tours

| Paramètre | Valeur locale |
|---|---|
| Prix du ticket | 0,01 ETH fictif |
| Tickets maximum par tour | 10 000 |
| Tickets minimum pour tirer | 2 |
| Tickets maximum par participant | 1 |
| Durée d'un tour | 30 minutes |
| Commission de la Mairie | 10 % (1 000 points de base) |
| Délai avant relance du tirage | 10 minutes |

Ces valeurs viennent de [`smart-contract/scripts/deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) et des variables `TICKET_PRICE_WEI`, `MAX_TICKETS`, `MIN_TICKETS_TO_DRAW`, `MAX_TICKETS_PER_PLAYER`, `ROUND_DURATION_SECONDS` et `MUNICIPALITY_FEE_BPS`. Le service Compose ne transmet pas ces variables au conteneur : pour les changer, lancer le nœud hors Docker (voir plus bas) ou ajouter les variables dans la section `environment` du service. Avec une durée de 30 minutes et deux tickets minimum, un tour local entre en salle d'attente 30 minutes après son ouverture si deux participants au moins ont pris leur ticket, puis le keeper le tire `DRAW_REVEAL_DELAY_SECONDS` plus tard (10 minutes par défaut). Le fichier versionné `smart-contract/deployments/localhost.json` indique encore 100 tickets par participant : il est réécrit à chaque déploiement, et le nœud Docker redéploie les contrats à chaque démarrage.

#### Pas de persistance

Le nœud Hardhat garde la chaîne en mémoire. Tout arrêt ou redémarrage du conteneur repart d'une chaîne vierge : les contrats sont redéployés aux mêmes adresses, mais tous les tickets, tours et soldes ont disparu. La base PostgreSQL, elle, a gardé les données de l'ancienne chaîne.

> [!IMPORTANT]
> Après chaque redémarrage du conteneur `blockchain`, réinitialiser aussi la base du backend. Sinon l'indexeur journalise « Le curseur d'indexation (bloc N) dépasse la tête de chaîne », et les portefeuilles déjà créés n'ont plus de dotation. La procédure est dans [Dépannage](depannage.md#le-curseur-d-indexation-depasse-la-tete-de-chaine).

#### Sans Docker

Le même résultat s'obtient depuis `smart-contract/`, après `npm ci`, dans deux terminaux :

```bash
npm run node
```

```bash
npm run deploy:local && npx hardhat run scripts/local-vrf-responder.ts --network localhost
```

## Piloter les services

| Action | Commande |
|---|---|
| État et santé | `docker compose ps` |
| Journaux d'un service | `docker compose logs -f blockchain` |
| Arrêter en gardant les données | `docker compose stop` |
| Arrêter et supprimer les conteneurs | `docker compose down` |
| Tout supprimer, volumes compris | `docker compose down -v` |
| Reconstruire la blockchain après une modification du contrat | `docker compose up -d --build --wait blockchain` |
| Ouvrir psql | `docker compose exec postgres psql -U etherbay_admin -d blocklucky_db` |
| Ouvrir redis-cli | `docker compose exec redis redis-cli` |

Les journaux de la blockchain sont le premier endroit à consulter : ils affichent le déploiement, les habilitations de l'opérateur et chaque réponse de l'oracle (« Aléa fourni pour la requête... »).

> [!WARNING]
> `docker compose down -v` efface la base PostgreSQL et Redis. C'est le moyen le plus simple de repartir de zéro en local, mais il faut ensuite relancer les migrations et le seed.

## Vérifier que tout répond

```bash
docker compose ps
curl -s -X POST http://127.0.0.1:8545 -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
```

La seconde commande doit renvoyer `"result":"0x7a69"`, soit 31337 en hexadécimal. L'interface Mailpit doit s'ouvrir sur `http://localhost:8025`.

La suite se passe dans [Lancer les applications](lancer-les-applications.md). Le détail de chaque service, généré depuis le fichier Compose, est dans [Docker Compose](../infrastructure/docker-compose.md).
