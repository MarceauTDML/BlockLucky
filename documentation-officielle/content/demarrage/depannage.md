# Dépannage

Cette page recense les problèmes rencontrés en lançant BlockLucky en local, avec leur cause et leur solution. Ils sont classés par moment d'apparition. Pour les incidents d'un environnement déployé, voir plutôt les [runbooks](../infrastructure/runbooks.md) et les [runbooks blockchain](../infrastructure/runbooks-blockchain.md).

## Réinitialiser l'environnement local

Beaucoup de problèmes se règlent en repartant d'un état cohérent : une chaîne neuve et une base vide. Depuis la racine du dépôt :

```bash
docker compose down -v
docker compose up -d --wait
```

Puis depuis `backend/` :

```bash
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

`docker compose down -v` efface PostgreSQL et Redis. Redis contient aussi des états à effacer avec la base : défis de connexion, plafonds de jeu, quêtes accomplies, codes promo importés, clés d'idempotence.

## Au démarrage de l'infrastructure

### Un port est déjà utilisé

Symptôme : `docker compose up` échoue avec « port is already allocated » ou « address already in use », ou `npm run dev` avec `EADDRINUSE`.

Cause : un autre programme écoute déjà sur l'un des ports du projet (5434, 6380, 1025, 8025, 8545, 2053, 3000, 4000, 8081). C'est souvent un ancien conteneur d'un autre projet, un `hardhat node` lancé à la main dans `smart-contract/`, ou une instance précédente du backend restée ouverte.

Solution : identifier le processus et l'arrêter.

```bash
netstat -ano | grep ":2053"
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Sous Windows, le dernier nombre de la ligne `netstat` est l'identifiant du processus, à arrêter dans le Gestionnaire des tâches ou avec `taskkill /PID <id> /F` dans PowerShell. Sous macOS et Linux, `lsof -i :2053` donne le processus. Pour changer de port plutôt que d'arrêter le programme, modifier la partie gauche de la ligne `ports` du service dans `docker-compose.yml`, puis l'URL correspondante dans `backend/.env`.

### Le service blockchain reste « starting » ou devient « unhealthy »

Cause : au premier lancement, l'image est construite (installation des dépendances, compilation) puis les contrats sont déployés. La sonde ne passe au vert qu'après le déploiement, avec un délai de grâce de 60 secondes.

Solution : suivre les journaux.

```bash
docker compose logs -f blockchain
```

Le déploiement est terminé quand apparaît la ligne de l'oracle local, « Oracle VRF local actif sur 0x5FbDB2315678afecb367f032d93F642f64180aa3 ». Une erreur « no such file or directory » sur `./start-local-chain.sh` alors que le fichier existe indique en général un script enregistré avec des fins de ligne CRLF : vérifier que [`.gitattributes`](src:.gitattributes) est bien appliqué, puis reconstruire avec `docker compose build --no-cache blockchain`.

### Git Bash affiche BUG (fork bomb)

Symptôme : sous Windows, toute commande lancée dans Git Bash (même `ls`) échoue avec un message contenant « BUG (fork bomb) ». Les scripts `sh` du projet, comme `npm run slither`, échouent de la même façon.

Cause : l'installation de Git for Windows est endommagée. Le message vient de la couche d'émulation POSIX de Git Bash, pas du projet.

Solution : désinstaller puis réinstaller Git for Windows depuis l'installateur officiel, redémarrer le terminal, puis vérifier avec `git --version` et `ls`. Les projets du dépôt ne sont pas en cause.

## Au démarrage du backend

### Configuration invalide, démarrage interrompu

Cause : une variable ne respecte pas le schéma de [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts). Le message liste chaque variable fautive, par exemple « ENCRYPTION_KEY : ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux ».

Solution : corriger la valeur dans `backend/.env`. Une variable définie dans le shell est prioritaire sur le fichier `.env` : vérifier aussi l'environnement (`env | grep RPC_URL`). La liste et les formats sont dans [Variables d'environnement](../backend/variables-environnement.md). En `NODE_ENV=production`, les secrets de développement sont refusés ([Stack complète en conteneurs](stack-conteneurs.md#les-secrets-obligatoires)).

### Le client Prisma n'est pas généré

Symptôme : erreur indiquant que `@prisma/client` n'a pas été initialisé, ou types Prisma absents au typecheck.

Solution : depuis `backend/`, lancer `npx prisma generate`. Aucun script `postinstall` ne le fait après `npm ci`. À refaire après chaque modification de [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma).

### Les migrations échouent ou la base est injoignable

Vérifier que PostgreSQL est sain (`docker compose ps`) et que `DATABASE_URL` pointe sur le port 5434. L'état des migrations s'affiche avec `npm run prisma:status`.

## Pendant l'utilisation

### Le curseur d'indexation dépasse la tête de chaîne

Symptôme : le backend journalise « Le curseur d'indexation (bloc N) dépasse la tête de chaîne (bloc M). La chaîne a été réinitialisée : réinitialisez aussi la base de données. » Les nouveaux tickets n'apparaissent plus dans l'historique.

Cause : le conteneur `blockchain` a redémarré (redémarrage de Docker, du poste, `docker compose down`). Le nœud Hardhat a perdu son état et recommence au bloc 0, mais la table `ChainCursor` garde le dernier bloc indexé de l'ancienne chaîne. L'indexeur ([`backend/src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts)) attend des blocs qui n'arriveront qu'après un long moment, et la base décrit des tickets et des dotations qui n'existent plus.

Solution : réinitialiser la base, puis redémarrer le backend.

```bash
npm run prisma:reset
npm run prisma:seed
```

`npm run prisma:reset` lance `prisma migrate reset` : il supprime toutes les données et réapplique les migrations, après confirmation. Le plus sûr reste la réinitialisation complète décrite en haut de page, qui vide aussi Redis.

> [!TIP]
> Après un redémarrage de la blockchain, redémarrer aussi le backend : il garde en mémoire le compteur de transactions (nonce) du compte opérateur et les blocs déjà lus.

### Le fichier .env garde d'anciennes adresses de contrat

Symptôme : `GET /api/v1/lottery/status` répond en erreur, les journaux contiennent « could not decode result data » ou `BAD_DATA`, ou les achats échouent alors que la blockchain est saine.

Cause : `backend/.env` a été copié depuis une ancienne version de `.env.example`, ou modifié pour un autre réseau. `LOTTERY_CONTRACT_ADDRESS` ou `POAP_CONTRACT_ADDRESS` désigne une adresse sans contrat sur le nœud local. La commande `cp` n'écrase rien d'elle-même : un `.env` ancien survit aux mises à jour du dépôt.

Solution : comparer avec les adresses déployées et avec `.env.example`.

```bash
cat ../smart-contract/deployments/localhost.json
diff .env .env.example
```

En local, les valeurs attendues sont `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` (BlockLucky) et `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` (POAP), avec `CHAIN_ID=31337` et `RPC_URL=http://127.0.0.1:8545`. Vérifier aussi qu'une adresse a bien du code sur le nœud :

```bash
curl -s -X POST http://127.0.0.1:8545 -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9","latest"]}'
```

Un résultat `"0x"` signifie qu'il n'y a pas de contrat à cette adresse. La sonde `/health/deep` ne fait pas cette vérification : elle affiche les adresses configurées sans interroger la chaîne.

### Le solde est nul juste après l'inscription

Symptôme : l'accueil affiche un solde de 0 ETH, ou l'achat échoue avec « Solde d'ethers fictifs insuffisant sur votre portefeuille BlockLucky. » (statut 402).

Cause : la dotation de bienvenue est envoyée en arrière-plan après l'inscription, sans bloquer la réponse. Le portefeuille existe avant que la transaction soit minée. Pour un compte du seed, le portefeuille n'est créé qu'au premier affichage du portefeuille ou au premier achat.

Solution :

1. Attendre quelques secondes et recharger l'accueil : `GET /api/v1/lottery/wallet` relance la dotation si elle n'a pas encore été enregistrée (`welcomeGrantTxHash` vide).
2. Si le solde reste nul, chercher dans les journaux du backend « Dotation de bienvenue impossible » ou « Dotation de bienvenue différée ». Les causes habituelles sont un compte opérateur sans ethers (clé opérateur différente de celle approvisionnée par le déploiement), un nœud injoignable ou `WELCOME_GRANT_WEI=0`.
3. Après un redémarrage de la chaîne, les comptes déjà dotés gardent un `welcomeGrantTxHash` en base mais n'ont plus d'ethers : réinitialiser la base.

### Le compte opérateur n'a pas le rôle requis

Symptôme : « Le compte opérateur du backend n'a pas le rôle requis sur le Smart Contract. » (statut 403) au tirage, à la pause ou au reversement de la commission.

Cause : `RELAYER_PRIVATE_KEY` du backend n'est pas un compte habilité par le déploiement. En local, c'est le cas si la clé a été changée dans `backend/.env` sans être passée au conteneur `blockchain`, ou pour `setTreasury` si la chaîne a été déployée avec `LOCAL_STRICT_ROLES=true` : l'opérateur n'a alors plus `DEFAULT_ADMIN_ROLE`, détenu par le compte n° 2. Sur Sepolia, `setTreasury` est refusé dès que l'adresse saisie diffère de `MAIRIE_TREASURY_ADDRESS`.

Solution : revenir à la clé de `.env.example`, ou exporter la même `RELAYER_PRIVATE_KEY` dans le shell avant `docker compose up` pour que le déploiement l'habilite ([Infrastructure locale](infrastructure-locale.md#comptes)).

### Le code de connexion n'arrive pas

| Cause | Vérification | Solution |
|---|---|---|
| Mailpit arrêté | `docker compose ps mailpit` | `docker compose up -d --wait mailpit` |
| Workers désactivés | `RUN_WORKERS=false` sans `npm run dev:worker` | Lancer le worker ou remettre `RUN_WORKERS=true` |
| Code expiré | Le code vaut 10 minutes | Redemander un code |
| Trop de tentatives | « Trop de tentatives de connexion/2FA, veuillez patienter quelques minutes. » (30 requêtes par 10 minutes et par adresse IP) | Attendre la fin de la fenêtre |
| Compte verrouillé | « Trop de codes erronés. La vérification est bloquée pendant une heure pour ce compte. » (10 échecs) | Attendre une heure, ou supprimer la clé `blocklucky:development:auth:otp-failures:<id>` dans Redis |

En développement, le code figure aussi dans le champ `devOtpPreview` de la réponse ([Comptes de démonstration et connexion](comptes-et-connexion.md#le-code-dans-la-reponse-de-l-api)).

### Le dashboard Mairie répond 403

Message : « La double authentification est obligatoire pour les comptes d'administration. Activez-la depuis votre profil. » C'est le comportement attendu, et les pages de la Mairie l'affichent avec un bouton d'activation : activer la 2FA depuis `/profil/securite/2fa` ([Compte Mairie](comptes-et-connexion.md#compte-mairie-activer-la-double-authentification)).

Message : « Droits révoqués ou modifiés : reconnectez-vous ». Le rôle a changé en base depuis l'ouverture de la session, ou le compte a été supprimé. Se reconnecter.

### Le tirage ne se déclenche pas

Le keeper ([`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts)) vérifie toutes les 10 secondes si le contrat autorise le tirage. Il faut à la fois :

- au moins 2 tickets dans le tour (`minTicketsToDraw`) ;
- un tour complet, ou la fin de sa durée (30 minutes en local) ;
- un contrat qui n'est pas en pause ;
- un processus qui exécute le keeper (l'API avec `RUN_WORKERS=true`, ou le worker).

Le tirage manuel depuis le dashboard répond « Le tirage ne peut pas encore être lancé (participants ou durée insuffisants). » dans les mêmes cas. Si `DrawRequested` est émis mais que le gagnant n'arrive pas, consulter les journaux du conteneur `blockchain` : l'oracle local doit afficher « Aléa fourni pour la requête ».

### Trop de requêtes

« Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard. » : la limite globale est de 300 requêtes par 15 minutes et par adresse IP, partagée dans Redis. Elle peut être atteinte en développement par un rechargement intensif ou un test de charge. Attendre la fin de la fenêtre, ou vider Redis en local.

### Le seed a dupliqué les commerces

Le seed crée les établissements sans vérifier leur existence. Après deux exécutions, la boutique affiche deux boulangeries et deux cinémas. Réinitialiser la base avant de relancer le seed.

## Côté clients

### L'application mobile ne joint pas le backend

Sur un téléphone physique, `localhost` désigne le téléphone. Mettre l'adresse IP locale du poste dans `EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_WS_URL` de `mobile-app/.env`, vérifier que le téléphone et le poste sont sur le même réseau Wi-Fi et que le pare-feu autorise le port 2053, puis relancer avec `npx expo start -c`. Voir [Tester sur un téléphone](../mobile/telephone-physique.md).

### Le navigateur bloque les appels à l'API

Une erreur CORS signale une origine non autorisée. Le backend accepte `FRONTEND_URL` et `CORS_ORIGINS` (par défaut `http://localhost:3000` et `http://localhost:8081`). Si le web tourne sur un autre port ou un autre nom, l'ajouter à `CORS_ORIGINS`. Une erreur « Content Security Policy » vient de la CSP du web, construite à partir de `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL` : redémarrer `npm run dev` après les avoir modifiées.

### Les tests mobiles ne se lancent pas

`npm test` n'existe pas dans `mobile-app/` : aucun exécuteur de tests n'est installé. Ce n'est pas un problème de poste ([Réel, simulé ou à venir](../presentation/reel-ou-simule.md)).

## Obtenir plus d'informations

| Source | Usage |
|---|---|
| Journaux du backend | `LOG_LEVEL=debug` (valeur de `.env.example`) ; chaque requête porte un identifiant renvoyé dans l'en-tête `X-Request-Id` |
| `http://localhost:2053/health/deep` | État de PostgreSQL et Redis avec leur latence, configuration blockchain |
| `docker compose logs -f <service>` | Journaux d'un service d'infrastructure |
| `npx prisma studio` | Contenu des tables, depuis `backend/` |
| `docker compose exec redis redis-cli --scan --pattern "blocklucky:*"` | Clés Redis du backend |
