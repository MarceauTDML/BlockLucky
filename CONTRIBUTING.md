# Guide de contribution

## Branches et pull requests

- `main` est toujours déployable. On ne pousse jamais directement dessus : chaque changement passe par une pull request dont la CI est verte.
- Branches courtes (2 jours au plus), nommées par sujet : `feature/achat-ticket-cadeau`, `fix/solde-negatif`, `chore/maj-dependances`.
- Pull requests petites (400 lignes modifiées au plus hors fichiers générés et lockfiles). Un gros chantier se découpe en plusieurs pull requests successives.
- Le modèle `.github/pull_request_template.md` est rempli : contexte, changements, vérifications, plan de retour arrière.
- Première revue sous 4 heures ouvrées. Les propriétaires de chaque dossier sont définis dans `.github/CODEOWNERS`.

## Messages de commit

Un titre court à l'impératif ou au nom d'action, en français, suivi d'une description qui explique le pourquoi. Exemples tirés de l'historique : « Ajout du tunnel de commande simulé », « Génération des QR codes sur les billets électroniques ».

## Avant d'ouvrir une pull request

```bash
cd backend && npm run typecheck && npm run lint && npm run env:check && npm test
```

```bash
cd frontend-web && npm run lint && npm run typecheck && npm test
```

```bash
cd mobile-app && npm run typecheck && npm run lint
```

## Règles de code

- Pas de commentaires de code ni d'émojis dans le code livré : les noms de variables, de fonctions et les tests portent l'intention.
- TypeScript strict. Toute promesse est attendue ou explicitement ignorée avec `void` (règle `no-floating-promises` côté backend).
- Toute nouvelle variable d'environnement est ajoutée au schéma `backend/src/config/env.config.ts` et à `.env.example` (vérifié par `npm run env:check`).
- Toute migration Prisma respecte l'ADR 0003 (expand/contract, `lock_timeout`, contraintes `NOT VALID` puis `VALIDATE`).
- Pas de `process.env` lu en dehors des fichiers de configuration.
- Les appels sortants (HTTP, SMTP, RPC, S3, PostgreSQL, Redis) ont tous un timeout.

## Décisions d'architecture

Une décision structurante (nouvelle dépendance d'infrastructure, découpage, changement de contrat d'API) est consignée dans `docs/adr/` avant ou avec la pull request qui l'implémente.

## Dette technique

Les dettes connues sont suivies sous forme de tickets avec le libellé `tech-debt`, une estimation de l'impact et du coût. Une part de chaque sprint (15 à 20 %) leur est réservée.
