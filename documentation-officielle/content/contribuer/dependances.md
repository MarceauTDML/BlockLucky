# Dépendances

Le dépôt contient six projets Node.js avec chacun son `package.json` et son `package-lock.json`, plus des images Docker et des actions GitHub. Les mises à jour sont proposées automatiquement par Dependabot, les vulnérabilités sont bloquées par `npm audit` et Trivy en CI, et quelques dépendances restent à suivre à la main.

## Inventaire

| Projet | Fichier | Style de version | Remarques |
| --- | --- | --- | --- |
| `backend/` | [`package.json`](src:backend/package.json) | plages `^` | 26 dépendances de production, dont Express 5, Prisma 7, ethers 6, BullMQ, Socket.IO, Zod 4 |
| `smart-contract/` | [`package.json`](src:smart-contract/package.json) | plages `^` | Deux dépendances de production seulement : `@chainlink/contracts` et `@openzeppelin/contracts`, dont les sources Solidity sont compilées dans les contrats. `forge-std` est tiré d'une archive GitHub étiquetée `v1.17.0` |
| `frontend-web/` | [`package.json`](src:frontend-web/package.json) | versions exactes | Next.js, React, Redux Toolkit, Socket.IO client |
| `mobile-app/` | [`package.json`](src:mobile-app/package.json) | `^` et `~` | Les modules Expo (`~58.x`) doivent rester alignés sur la version du SDK Expo |
| `documentation-officielle/` | [`package.json`](src:documentation-officielle/package.json) | versions exactes | Quatre dépendances de développement : `marked`, `highlight.js`, `mermaid`, `yaml` |
| `frontend-office-tourisme/` | [`package.json`](src:frontend-office-tourisme/package.json) | aucune dépendance | Le script `dev` exécute `serve@14.2.7` par `npx` ; le générateur de QR codes est copié dans `assets/js/vendor/` |

La version de Node.js est fixée à la majeure 22 par [`.nvmrc`](src:.nvmrc), et chaque `package.json` exige `>=22.12.0` (`engines`). Les images Docker du backend, du frontend web et de la blockchain locale partent de `node:22-bookworm-slim` (argument `NODE_IMAGE`).

La CI installe toujours avec `npm ci` : le `package-lock.json` fait foi, et une divergence avec le `package.json` fait échouer l'installation. Un fichier de verrouillage modifié doit donc être commité avec le `package.json` correspondant.

## Dependabot

La configuration est dans [`.github/dependabot.yml`](src:.github/dependabot.yml).

| Écosystème | Dossiers | Fréquence | Pull requests ouvertes au plus | Regroupement | Particularités |
| --- | --- | --- | --- | --- | --- |
| npm | `/backend` | chaque lundi | 5 | mineures et correctifs dans `backend-minor-patch` | délai de 5 jours |
| npm | `/smart-contract` | chaque lundi | 5 | `contracts-minor-patch` | délai de 5 jours |
| npm | `/documentation-officielle` | chaque mois | 3 | toutes les mises à jour dans `documentation` | délai de 5 jours |
| npm | `/frontend-web` | chaque lundi | 5 | `web-minor-patch` | délai de 5 jours |
| npm | `/mobile-app` | chaque lundi | 5 | `mobile-minor-patch` | délai de 5 jours ; versions majeures de `expo*` et `react-native*` ignorées |
| docker | `/backend`, `/frontend-web`, `/frontend-office-tourisme`, `/smart-contract` | chaque semaine | 5 (défaut) | aucun | images de base des Dockerfile |
| docker-compose | `/` | chaque semaine | 5 (défaut) | aucun | images de `docker-compose.yml` (PostgreSQL, Redis, Mailpit) |
| github-actions | `/` | chaque semaine | 5 (défaut) | toutes dans `actions` | actions des workflows, épinglées par empreinte |

### Délai de publication

`cooldown.default-days: 5` fait attendre cinq jours après la publication d'une version avant de la proposer. Une version compromise ou défectueuse est le plus souvent retirée de l'annuaire npm dans ce délai : c'est une protection contre les attaques par la chaîne d'approvisionnement, au prix de cinq jours de retard sur les correctifs. Un correctif de sécurité urgent se fait à la main, sans attendre Dependabot.

### Ce que Dependabot ne surveille pas

| Élément | Où | Comment le suivre |
| --- | --- | --- |
| Images des services de la CI (`postgres:15-alpine`, `redis:7.4-alpine`) | `services:` de [`ci.yml`](src:.github/workflows/ci.yml) | Les aligner à la main sur `docker-compose.yml` |
| Images lancées par `docker run` dans la CI (`zricethezav/gitleaks:v8.30.1`, `aquasec/trivy:0.76.2`) | [`ci.yml`](src:.github/workflows/ci.yml) | Mise à jour manuelle |
| Image Slither `ghcr.io/crytic/slither:0.11.6` | [`smart-contract/scripts/slither.sh`](src:smart-contract/scripts/slither.sh) | Mise à jour manuelle, surchargeable par `SLITHER_IMAGE` |
| `serve@14.2.7` | script `dev` de l'Office de Tourisme | Mise à jour manuelle |
| qrcode-generator 2.0.4 | [`frontend-office-tourisme/assets/js/vendor/`](src:frontend-office-tourisme/assets/js/vendor/) | Mise à jour manuelle (voir [Architecture JavaScript](../office-tourisme/architecture.md#code-tiers)) |
| Image k6 `grafana/k6` | commandes de [`load-tests/`](src:load-tests/) | Non épinglée : la dernière version est tirée |

## Vulnérabilités

### En CI

| Projet | Commande | Bloque à partir de |
| --- | --- | --- |
| backend | `npm audit --omit=dev --audit-level=high` | haute |
| frontend web | `npm audit --omit=dev --audit-level=high` | haute |
| mobile | `npm audit --omit=dev --audit-level=high` | haute |
| smart-contract | `npm audit --omit=dev --audit-level=critical` | critique |
| images backend, web, tourisme | Trivy, `--severity CRITICAL,HIGH --ignore-unfixed` | haute, si un correctif existe |

`--omit=dev` limite l'audit aux dépendances embarquées en production. Une vulnérabilité dans un outil de développement (ESLint, Jest, TypeScript) n'est donc pas bloquante ; elle reste visible avec un `npm audit` complet et dans les alertes Dependabot de GitHub.

### Exception pour `smart-contract`

Le seuil est critique, et non haut, pour `smart-contract/`. La justification, consignée dans l'ADR 0004 (voir [Smart contract et portefeuille intégré](../architecture/adr/0004-smart-contract-portefeuille-integre.md)) :

- les alertes hautes viennent de dépendances transitives de `@chainlink/contracts` ;
- il s'agit des sources Solidity d'OpenZeppelin 4.x, que les contrats n'importent pas (ils importent OpenZeppelin 5.x), et d'outils JavaScript (ethers v5, `ws`, `tmp`) ;
- aucune n'est incluse dans le bytecode déployé, et aucune n'est exécutée par le backend, qui utilise ethers v6 et ses propres ABI JSON.

Cette exception doit être réexaminée à chaque mise à jour de `@chainlink/contracts` : si une alerte haute touche un fichier effectivement importé par [`BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) (`VRFConsumerBaseV2Plus`, `VRFV2PlusClient`, `AutomationCompatibleInterface`), elle doit être traitée comme bloquante.

### Exceptions documentées

Une vulnérabilité non corrigeable (aucune version corrigée publiée) ou sans impact réel ne se contourne pas en baissant un seuil. Elle se documente :

1. vérifier que le code vulnérable est atteignable depuis le code du projet ;
2. sinon, écrire la justification dans un ADR ou dans la pull request, avec le numéro d'alerte (GHSA ou CVE) ;
3. pour Slither, consigner le constat dans [`slither.db.json`](src:smart-contract/slither.db.json) avec la justification dans [Sécurité du contrat](../smart-contracts/securite.md) ;
4. prévoir une date de réexamen.

## Politique de mise à jour

| Type | Traitement |
| --- | --- |
| Correctifs et mineures groupés par Dependabot | Fusionner dès que la CI est verte, dans la semaine |
| Correctif de sécurité | Traité en priorité, sans attendre le délai de 5 jours si l'alerte concerne une dépendance de production |
| Version majeure | Pull request dédiée, une majeure à la fois, lecture du journal des changements, adaptation du code dans la même pull request |
| SDK Expo | Montée de version manuelle et coordonnée de tous les modules `expo-*`, `react-native*` et `@react-navigation/*` (les majeures sont ignorées par Dependabot pour cette raison) |
| Compilateur Solidity, OpenZeppelin, Chainlink | Changent le bytecode : relancer tests, couverture, Slither et `npm run export:abi`, puis redéployer. Un contrat déjà déployé garde l'ancienne version |
| Image PostgreSQL | Une version majeure change le format des données : sauvegarde, puis restauration dans le nouveau serveur, jamais un simple changement d'étiquette sur un volume existant |

### Pull requests Dependabot en attente

À la date de rédaction, les branches distantes `dependabot/...` montrent notamment des majeures, proposées hors des groupes : TypeScript 7 pour le web, le mobile et les contrats, `@babel/core` 8 et `eslint-config-universe` 16 pour le mobile, PostgreSQL 16 et Redis 8.10 pour Compose, nginx-unprivileged 1.31 pour l'Office de Tourisme. Elles sont à traiter une par une selon le tableau ci-dessus.

> [!WARNING]
> La pull request qui passe `docker-compose.yml` à PostgreSQL 16 ne doit pas être fusionnée telle quelle sur un poste qui a déjà des données : le conteneur PostgreSQL 16 refuse de démarrer sur le volume `pgdata` créé par la version 15. Sauvegarder avec `pg_dump`, supprimer le volume, démarrer la nouvelle version, restaurer (voir [Sauvegardes et reprise](../infrastructure/sauvegardes.md)). Mettre aussi à jour l'image des services de la CI.

### Mettre à jour à la main

Dans le dossier du projet :

```bash
npm outdated
npm install <paquet>@<version>
npm run typecheck && npm run lint && npm test
```

Vérifier ensuite que seuls `package.json` et `package-lock.json` ont changé, et que l'audit passe :

```bash
npm audit --omit=dev --audit-level=high
```

## Ajouter une dépendance

Avant d'ajouter un paquet :

| Question | Pourquoi |
| --- | --- |
| La fonction existe-t-elle déjà dans le projet ou dans une dépendance présente ? | Chaque paquet ajoute une surface d'attaque et une charge de maintenance |
| Le paquet est-il maintenu (publications récentes, mainteneurs identifiés) ? | Un paquet abandonné ne recevra pas de correctif |
| Sa licence est-elle compatible ? | Voir [Licences](../juridique/licences.md) |
| Est-il nécessaire en production ou seulement en développement ? | `npm install --save-dev` pour un outil, afin qu'il échappe à l'image de production et à l'audit bloquant |
| Ajoute-t-il une infrastructure (base, file, service externe) ? | Si oui, un ADR est nécessaire (voir [Workflow Git](workflow-git.md#decisions-d-architecture)) |

Pour le site de l'Office de Tourisme et le navigateur en général, aucun paquet servi depuis un CDN : la politique de sécurité de contenu le bloquerait. Le code tiers est copié dans le dépôt avec sa licence.
