# Versions de la stack

Cette page liste les dépendances déclarées par chaque projet du monorepo et explique comment leurs versions sont choisies, figées et mises à jour. Les tableaux en bas de page sont générés à chaque construction de la documentation depuis les fichiers `package.json` : ils sont toujours à jour avec le code.

## Politique de versions

### Moteur Node.js

Tous les projets qui ont un `package.json` avec des dépendances déclarent le même moteur :

```json
{
  "engines": {
    "node": ">=22.12.0"
  }
}
```

La version majeure de référence est fixée à la racine par [`.nvmrc`](src:.nvmrc), qui contient `22`. Tous les jobs Node.js de la CI lisent ce fichier (`node-version-file: .nvmrc` dans [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml)). Les images Docker partent de `node:22-bookworm-slim`, déclarée par `ARG NODE_IMAGE` dans les Dockerfile du backend, du frontend web et de la chaîne locale.

| Où | Version de Node.js |
|---|---|
| Postes de développement | `nvm use` lit `.nvmrc` : Node.js 22 |
| CI GitHub Actions | `actions/setup-node` avec `.nvmrc` |
| Images Docker | `node:22-bookworm-slim` |
| `package.json` de chaque projet | `>=22.12.0` |

Aucun fichier `.npmrc` n'active `engine-strict` : avec une version de Node.js plus ancienne, `npm` affiche un avertissement mais installe quand même.

> [!NOTE]
> Le site de l'Office de Tourisme n'a aucune dépendance. Son `package.json` ne contient qu'un script `dev` qui lance `npx --yes serve@14.2.7`, avec une version figée dans la commande elle-même.

### Plages déclarées et épinglage

Les projets n'appliquent pas tous la même règle dans `package.json` :

| Projet | Règle observée | Exemples |
|---|---|---|
| `smart-contract/` | Plages `^` (mineures et correctifs acceptés), TypeScript en `~` | `"hardhat": "^3.21.2"`, `"typescript": "~6.0.3"` |
| `backend/` | Plages `^` pour toutes les dépendances | `"express": "^5.3.0"`, `"@prisma/client": "^7.10.1"` |
| `frontend-web/` | Versions exactes, TypeScript en `~` | `"next": "16.4.5"`, `"react": "19.3.1"` |
| `mobile-app/` | `^` pour les bibliothèques JavaScript, `~` pour les modules liés au SDK Expo, exact pour React, React Native et `react-native-svg` | `"expo-secure-store": "~58.0.2"`, `"react-native": "0.88.1"` |
| `documentation-officielle/` | Versions exactes | `"marked": "18.2.0"`, `"mermaid": "12.3.0"` |

Quelle que soit la plage déclarée, la version réellement installée est figée par le fichier `package-lock.json` versionné dans chaque projet. La CI et les Dockerfile installent avec `npm ci`, qui refuse de modifier le lockfile et échoue s'il ne correspond plus au `package.json`. Une plage `^` ne change donc rien en CI ou en production tant que le lockfile n'est pas régénéré : elle indique seulement jusqu'où `npm install` ou Dependabot peuvent monter.

> [!IMPORTANT]
> Après toute modification d'un `package.json`, lancer `npm install` dans le dossier du projet et versionner le `package-lock.json` mis à jour dans la même pull request. Sinon `npm ci` échoue en CI.

### Autres versions figées

| Élément | Où | Mode d'épinglage |
|---|---|---|
| Compilateur Solidity | [`smart-contract/hardhat.config.ts`](src:smart-contract/hardhat.config.ts) | Version exacte `0.8.34`, EVM `prague`. Les sources déclarent `pragma solidity ^0.8.28`, et solhint impose cette borne (`compiler-version` dans [`.solhint.json`](src:smart-contract/.solhint.json)) |
| Images d'infrastructure | [`docker-compose.yml`](src:docker-compose.yml) | Étiquettes de version : `postgres:15-alpine`, `redis:7.4-alpine`, `axllent/mailpit:v1.31.4` |
| Image de l'Office de Tourisme | [`frontend-office-tourisme/Dockerfile`](src:frontend-office-tourisme/Dockerfile) | `nginxinc/nginx-unprivileged:1.30-alpine` |
| Actions GitHub | [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) | Épinglées par empreinte de commit complète, par exemple `actions/checkout@11d5960a...` |
| Outils lancés en conteneur par la CI | [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) | Étiquettes exactes : `zricethezav/gitleaks:v8.30.1`, `aquasec/trivy:0.76.2` |
| `forge-std` | [`smart-contract/package.json`](src:smart-contract/package.json) | Archive d'une étiquette précise (`v1.17.0`) |

## Mises à jour automatiques avec Dependabot

[`.github/dependabot.yml`](src:.github/dependabot.yml) ouvre des pull requests de mise à jour. Chacune passe par la CI comme n'importe quel changement.

| Écosystème | Dossiers | Fréquence | Particularités |
|---|---|---|---|
| npm | `/backend`, `/smart-contract`, `/frontend-web` | Hebdomadaire, le lundi | 5 pull requests ouvertes au plus, mineures et correctifs regroupés en une seule pull request par projet |
| npm | `/mobile-app` | Hebdomadaire, le lundi | Même regroupement, et mises à jour majeures de `expo*` et `react-native*` ignorées |
| npm | `/documentation-officielle` | Mensuelle | Toutes les dépendances dans un seul groupe, 3 pull requests au plus |
| docker | `/backend`, `/frontend-web`, `/frontend-office-tourisme`, `/smart-contract` | Hebdomadaire | Images de base des Dockerfile |
| docker-compose | `/` | Hebdomadaire | Images de `docker-compose.yml` |
| github-actions | `/` | Hebdomadaire | Toutes les actions dans un seul groupe |

Toutes les entrées npm ont un délai de carence (`cooldown`) de 5 jours : Dependabot ne propose pas une version publiée depuis moins de 5 jours, ce qui laisse le temps à une version compromise ou défectueuse d'être retirée.

### Pourquoi les majeures d'Expo sont exclues

Une version d'Expo SDK impose les versions de React Native, de React et de chaque module `expo-*`. Monter l'un sans les autres casse la compilation native. Un changement de SDK se fait à la main, en suivant le guide de migration d'Expo, puis en vérifiant la configuration avec `npx expo config --type public` (lancé par la CI). Voir [Builds et publication](../mobile/builds-publication.md).

### Contrôles de sécurité des dépendances

La CI lance `npm audit --omit=dev` sur les dépendances de production :

| Projet | Seuil bloquant |
|---|---|
| `backend/`, `frontend-web/`, `mobile-app/` | `--audit-level=high` |
| `smart-contract/` | `--audit-level=critical`, justifié dans l'[ADR 0004](adr/0004-smart-contract-portefeuille-integre.md) |

Les images de production (backend, web, tourisme) sont en plus analysées par Trivy, bloquant sur les vulnérabilités `CRITICAL` et `HIGH` corrigeables. La procédure complète est dans [Dépendances](../contribuer/dependances.md) et [Chaîne logicielle](../securite/chaine-logicielle.md).

## Versions clés

Les briques présentées dans [Choix techniques](choix-techniques.md) correspondent aux déclarations suivantes :

| Brique | Paquet | Projet |
|---|---|---|
| Express 5 | `express` | backend |
| Prisma 7 | `prisma`, `@prisma/client`, `@prisma/adapter-pg` | backend |
| BullMQ | `bullmq` | backend |
| Redis | `ioredis` | backend |
| Socket.IO | `socket.io`, `socket.io-client` | backend, web, mobile |
| ethers v6 | `ethers` | backend, smart-contract |
| Hardhat 3 | `hardhat`, `@nomicfoundation/hardhat-toolbox-mocha-ethers` | smart-contract |
| OpenZeppelin 5 | `@openzeppelin/contracts` | smart-contract |
| Chainlink | `@chainlink/contracts` | smart-contract |
| Next.js 16, React 19 | `next`, `react`, `react-dom` | web |
| Tailwind 4 | `tailwindcss`, `@tailwindcss/postcss` | web |
| Redux Toolkit et RTK Query | `@reduxjs/toolkit`, `react-redux` | web, mobile |
| Expo et React Native | `expo`, `react-native` | mobile |
| Zod | `zod` | backend |
| TypeScript | `typescript` | tous les projets TypeScript |

> [!NOTE]
> Le backend déclare aussi le paquet `redis` en dépendance de production alors que le code n'importe que `ioredis`. Les dépendances de développement `nodemon` et `ts-node` ne servent qu'à [`backend/nodemon.json`](src:backend/nodemon.json), qui exécute lui-même `tsx` ; les scripts `npm run dev` et `npm run dev:worker` utilisent directement `tsx watch`.

## Dépendances déclarées par projet

Colonne « Version demandée » : la plage écrite dans `package.json`. La version installée exacte est dans le `package-lock.json` du projet.

{{generated:versions-stack}}
