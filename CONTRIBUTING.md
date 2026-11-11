# Guide de contribution

Le guide complet est dans la documentation officielle, partie [Contribuer](https://docs.etherbay.tech/contribuer/workflow-git.html) : workflow Git, standards de code, tests, dépendances, écriture de la documentation et liste de contrôle avant une mise en production.

## L'essentiel

- Chaque changement passe par une pull request dont la CI est verte, avec le modèle `.github/pull_request_template.md` rempli.
- Pas de commentaires de code ni d'émojis dans le code livré.
- Toute nouvelle variable d'environnement est ajoutée au schéma `backend/src/config/env.config.ts`, à `backend/.env.example` et à `documentation-officielle/content/_data/variables.json`.
- Toute migration Prisma respecte la décision d'architecture 0003 (expand et contract).
- Un changement de comportement met à jour la documentation dans la même pull request, puis `npm run build` dans `documentation-officielle/`.

## Avant d'ouvrir une pull request

```bash
cd smart-contract && npm run typecheck && npm run lint && npm test
```

```bash
cd backend && npm run typecheck && npm run lint && npm run env:check && npm test
```

```bash
cd frontend-web && npm run lint && npm run typecheck && npm test
```

```bash
cd mobile-app && npm run typecheck && npm run lint
```

```bash
cd documentation-officielle && npm run check
```
