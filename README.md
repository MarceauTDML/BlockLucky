# BlockLucky - Ville d'EtherBay

Loterie citoyenne pédagogique de fin d'année de la Ville d'EtherBay (projet Epitech Digital School). Les citoyens achètent des tickets en ethers fictifs, chaque ticket est vérifiable sur la blockchain et les EtherPoints gagnés s'échangent contre des offres des commerces partenaires.

## Projets du dépôt

| Dossier | Rôle | Stack | Port local |
|---|---|---|---|
| `backend/` | API REST, WebSocket, workers asynchrones | Express 5, TypeScript, Prisma 7, PostgreSQL 15, Redis 7, BullMQ, Socket.IO | 2053 |
| `frontend-web/` | Espace citoyen, espace partenaires, dashboard Mairie | Next.js 16, React 19, Tailwind 4, RTK Query | 3000 |
| `mobile-app/` | Application citoyenne iOS et Android | Expo SDK 58, React Native 0.88, RTK Query | 8081 (Metro) |
| `frontend-office-tourisme/` | Site vitrine de l'Office de Tourisme | HTML, CSS, JavaScript (modules ES) | 4000 |
| `docker-compose.yml` | PostgreSQL, Redis, Mailpit et stack complète (profil `app`) | Docker Compose | 5434, 6380, 8025 |
| `load-tests/` | Scénarios de charge k6 | k6 | - |
| `docs/` | Architecture, décisions (ADR), runbooks, objectifs de service | Markdown, Mermaid | - |

## Démarrage rapide

Prérequis : Node.js 22 (`.nvmrc`), npm 10, Docker Desktop.

```bash
docker compose up -d --wait
```

```bash
cd backend && cp .env.example .env && npm ci && npx prisma generate && npm run prisma:deploy && npm run prisma:seed && npm run dev
```

```bash
cd frontend-web && cp .env.example .env && npm ci && npm run dev
```

```bash
cd mobile-app && cp .env.example .env && npm ci && npm start
```

```bash
cd frontend-office-tourisme && npm run dev
```

| Service | URL |
|---|---|
| API et documentation Swagger | http://localhost:2053/api/docs |
| Frontend web | http://localhost:3000 |
| Office de Tourisme | http://localhost:4000 |
| Boîte mail de développement (Mailpit) | http://localhost:8025 |

Sur un téléphone physique, remplacer `localhost` par l'adresse IP locale du poste dans `mobile-app/.env`.

## Stack complète en conteneurs

Le profil `app` construit et lance l'API, le worker séparé, le frontend web et le site de l'Office de Tourisme, après avoir appliqué les migrations dans un conteneur dédié. Les secrets doivent être fournis par l'environnement (le backend refuse de démarrer en production avec les valeurs de développement) :

```bash
JWT_SECRET=... ENCRYPTION_KEY=... RELAYER_PRIVATE_KEY=... WEBHOOK_SECRET=... METRICS_TOKEN=... docker compose --profile app up -d --build --wait
```

`ENCRYPTION_KEY` et `RELAYER_PRIVATE_KEY` attendent 64 caractères hexadécimaux (`RELAYER_PRIVATE_KEY` préfixée par `0x`), par exemple générés avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Qualité

Chaque pull request exécute la CI GitHub Actions (`.github/workflows/ci.yml`), limitée aux projets modifiés :

- backend : synchronisation de `.env.example`, typecheck, lint, migrations appliquées sur une base PostgreSQL vierge, contrôle de dérive du schéma, tests, compilation ;
- frontend web : lint, typecheck, tests Vitest, build Next.js ;
- mobile : typecheck, lint, validation de la configuration Expo ;
- Office de Tourisme : syntaxe des modules et ressources référencées ;
- images Docker et `docker-compose.yml`, avec analyse des vulnérabilités des images (Trivy) ;
- recherche de secrets dans tout l'historique Git (gitleaks) et `npm audit` bloquant sur les vulnérabilités hautes et critiques.

L'analyse statique de sécurité CodeQL tourne sur chaque pull request et chaque semaine (`.github/workflows/codeql.yml`). Les dépendances sont mises à jour chaque semaine par Dependabot (`.github/dependabot.yml`), par lots mineurs et correctifs, après 5 jours de publication.

## Connexion en développement

La connexion se fait sans mot de passe : un code à 6 chiffres est envoyé par email et doit être saisi pour obtenir une session. En local, les emails arrivent dans Mailpit (http://localhost:8025) ; en `NODE_ENV=development`, le code est aussi renvoyé dans la réponse (`devOtpPreview`). Les comptes administrateurs doivent activer la double authentification (profil, rubrique Sécurité) avant d'accéder au dashboard Mairie.

## Documentation

- [Architecture (C4)](docs/architecture.md)
- [Décisions d'architecture (ADR)](docs/adr/)
- [Runbooks d'exploitation](docs/runbooks.md)
- [Objectifs de service, sauvegardes et reprise](docs/operations.md)
- [Sécurité : mesures en place et matrice des droits](docs/securite.md)
- [Politique de sécurité et signalement de vulnérabilités](SECURITY.md)
- [Registre des traitements RGPD](docs/rgpd/registre-traitements.md)
- [Plan de réponse aux incidents de sécurité](docs/incident-securite.md)
- [Guide de contribution](CONTRIBUTING.md)
- README propre à chaque projet : [backend](backend/README.md), [frontend web](frontend-web/README.md), [mobile](mobile-app/README.md), [Office de Tourisme](frontend-office-tourisme/README.md)
