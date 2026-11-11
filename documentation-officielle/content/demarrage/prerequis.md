# Prérequis

Cette page liste ce qu'il faut installer avant de lancer BlockLucky en local, et comment vérifier que le poste est prêt. Le démarrage rapide se déroule ensuite en trois pages : [infrastructure locale](infrastructure-locale.md), [lancement des applications](lancer-les-applications.md), [connexion avec les comptes de démonstration](comptes-et-connexion.md).

## Logiciels indispensables

| Logiciel | Version attendue | Source de l'exigence | Usage |
|---|---|---|---|
| Node.js | 22, au moins 22.12.0 | [`.nvmrc`](src:.nvmrc) (valeur `22`) et champ `engines` des `package.json` (`>=22.12.0`) | Backend, frontend web, mobile, contrats, documentation |
| npm | Celui fourni avec Node.js 22 | Fichiers `package-lock.json` au format 3 | Installation reproductible avec `npm ci` |
| Docker avec Docker Compose v2 | Docker Desktop récent sous Windows et macOS | [`docker-compose.yml`](src:docker-compose.yml) utilise les profils et `up --wait` ; les Dockerfile utilisent `RUN --mount=type=cache` (BuildKit) | PostgreSQL, Redis, Mailpit, blockchain locale, stack complète |
| Git | Récent | - | Cloner le dépôt |

La CI utilise exactement la version de [`.nvmrc`](src:.nvmrc) (`node-version-file: .nvmrc` dans [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml)). Avec nvm ou fnm, la commande suivante, lancée à la racine du dépôt, sélectionne la bonne version :

```bash
nvm use
```

## Outils facultatifs

| Outil | Quand en avoir besoin |
|---|---|
| Expo Go sur un téléphone, ou un émulateur Android ou iOS | Lancer l'application mobile ([Tester sur un téléphone](../mobile/telephone-physique.md)) |
| Un client PostgreSQL (psql, DBeaver) | Inspecter la base sur `localhost:5434` |
| `npx prisma studio` | Explorer la base depuis `backend/`, sans installation supplémentaire |
| Visual Studio Code | Le dossier [`.vscode/`](src:.vscode/launch.json) fournit des configurations de débogage de l'API, du worker et des tests Jest |
| k6 | Inutile : les [tests de charge](../infrastructure/tests-charge.md) se lancent dans l'image Docker `grafana/k6` |
| Slither | Inutile : `npm run slither` du dossier `smart-contract/` lance l'image `ghcr.io/crytic/slither:0.11.6` |
| MetaMask | Inutile pour l'usage normal ; utile seulement pour inspecter la blockchain locale ou préparer un déploiement Sepolia |

## Système d'exploitation

Le projet se développe sous Windows, macOS et Linux. Les commandes de cette documentation sont écrites pour un terminal Bash. Sous Windows, utiliser Git Bash, fourni avec Git for Windows, ou WSL. Les commandes `cp` deviennent `Copy-Item` sous PowerShell :

```powershell
Copy-Item .env.example .env
```

Le fichier [`.gitattributes`](src:.gitattributes) force les fins de ligne LF pour les scripts `*.sh`. C'est indispensable pour le script de démarrage de la blockchain locale, exécuté dans un conteneur Linux. Le fichier [`.editorconfig`](src:.editorconfig) impose UTF-8, LF et une indentation de deux espaces.

> [!WARNING]
> Une installation de Git for Windows endommagée peut faire échouer toutes les commandes de Git Bash avec le message « BUG (fork bomb) ». La solution est de réinstaller Git for Windows ([Dépannage](depannage.md#git-bash-affiche-bug-fork-bomb)).

## Ports utilisés

Les services locaux écoutent sur les ports suivants. Ils doivent être libres avant le démarrage.

| Port | Service | Lié à |
|---|---|---|
| 5434 | PostgreSQL (port 5432 du conteneur) | `127.0.0.1` uniquement |
| 6380 | Redis (port 6379 du conteneur) | `127.0.0.1` uniquement |
| 1025 | Mailpit, serveur SMTP | `127.0.0.1` uniquement |
| 8025 | Mailpit, interface web | `127.0.0.1` uniquement |
| 8545 | Nœud Hardhat (JSON-RPC) | `127.0.0.1` uniquement |
| 2053 | API backend | toutes les interfaces |
| 2054 | Sondes du worker séparé (`PORT + 1`) | toutes les interfaces |
| 3000 | Frontend web | toutes les interfaces |
| 4000 | Site de l'Office de Tourisme | toutes les interfaces |
| 8081 | Serveur Metro d'Expo | toutes les interfaces |

Les ports 5434 et 6380 ont été choisis pour ne pas entrer en conflit avec un PostgreSQL ou un Redis déjà installé sur les ports standard. Pour vérifier qu'un port est libre :

```bash
netstat -ano | grep ":8545"
```

Sous macOS et Linux, `lsof -i :8545` donne le même résultat.

## Vérifier le poste

```bash
node --version
npm --version
docker --version
docker compose version
git --version
```

`node --version` doit afficher `v22.12.0` ou plus récent dans la branche 22. `docker compose version` doit répondre : l'ancienne commande `docker-compose` (avec un tiret) n'est pas prise en charge par cette documentation.

## Ressources

Le premier démarrage télécharge les images `postgres:15-alpine`, `redis:7.4-alpine` et `axllent/mailpit:v1.31.4`, puis construit l'image de la blockchain locale à partir de `node:22-bookworm-slim` en installant les dépendances de `smart-contract/` et en compilant les contrats. Il faut une connexion Internet et compter plusieurs minutes. Les démarrages suivants réutilisent les images.

Chaque projet Node a ses propres `node_modules` : il n'y a pas d'espace de travail npm à la racine. Il faut donc lancer `npm ci` dans chaque dossier utilisé.

| Dossier | Nécessaire pour |
|---|---|
| `backend/` | Toujours |
| `frontend-web/` | Interface web |
| `mobile-app/` | Application mobile |
| `smart-contract/` | Modifier ou tester les contrats ; inutile pour la blockchain locale en conteneur |
| `frontend-office-tourisme/` | Aucune dépendance : `npm run dev` télécharge `serve` à la volée |
| `documentation-officielle/` | Construire cette documentation |

## Cloner le dépôt

```bash
git clone https://github.com/MarceauTDML/BlockLucky.git
cd BlockLucky
```

La suite se passe dans [Infrastructure locale](infrastructure-locale.md).
