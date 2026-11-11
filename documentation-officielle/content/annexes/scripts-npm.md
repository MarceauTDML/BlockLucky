# Scripts npm

Chaque projet du dépôt a son propre `package.json` et son propre `node_modules` : il n'y a pas d'espace de travail npm à la racine. Les commandes se lancent donc depuis le dossier du projet, après `npm ci`. Le tableau de cette page est généré à chaque construction de la documentation depuis les fichiers `package.json` : il est toujours à jour.

## Commandes du quotidien

| Besoin | Projet | Commande |
| --- | --- | --- |
| Lancer l'API en développement, avec rechargement | `backend/` | `npm run dev` |
| Lancer le worker seul en développement | `backend/` | `npm run dev:worker` |
| Appliquer les migrations sur la base locale | `backend/` | `npm run prisma:deploy` |
| Créer une migration après modification du schéma | `backend/` | `npm run prisma:migrate` |
| Charger les données de démonstration | `backend/` | `npm run prisma:seed` |
| Lancer le frontend web | `frontend-web/` | `npm run dev` |
| Lancer l'application mobile | `mobile-app/` | `npm start` |
| Servir le site de l'Office de Tourisme | `frontend-office-tourisme/` | `npm run dev` |
| Compiler et tester les contrats | `smart-contract/` | `npm run build`, puis `npm test` |
| Republier les ABI vers le backend après un changement de contrat | `smart-contract/` | `npm run export:abi` |
| Construire et prévisualiser cette documentation | `documentation-officielle/` | `npm run build`, puis `npm run serve` |

Avant d'ouvrir une pull request, lancer dans chaque projet modifié les mêmes contrôles que la CI : `npm run typecheck`, `npm run lint` et les tests (voir [Intégration continue](../infrastructure/ci.md) et [Tests et qualité](../contribuer/tests-qualite.md)).

## Pièges connus

- **`npm run build` du backend ne construit rien.** Il lance `tsc --noEmit`, comme `typecheck`. Le build de production, qui écrit `dist/` et copie les modèles d'emails, est `npm run compile`.
- **`npm run prisma:reset` efface la base locale.** Il supprime la base et toutes ses données, puis réapplique les migrations. Relancer ensuite `npm run prisma:seed` si besoin. À ne jamais pointer vers une base partagée.
- **`npm run prisma:migrate` est réservé au poste de développement.** Il crée une migration et peut proposer de réinitialiser la base en cas de dérive. Hors développement, seul `prisma:deploy` s'utilise.
- **`npm test` du backend n'utilise pas de vraie chaîne.** Les tests sur la blockchain se lancent avec `npm run test:chain`, nœud Hardhat démarré (`docker compose up -d --wait blockchain`).
- **L'application mobile n'a pas de script de test.** Le dossier `mobile-app/__tests__/` existe, mais ni Jest ni script `test` ne sont déclarés dans son `package.json` : ces tests ne s'exécutent pas, ni en local, ni en CI.
- **`npm run deploy:local` des contrats suppose un nœud déjà lancé** sur `127.0.0.1:8545` (`npm run node` dans un autre terminal, ou le conteneur `blockchain`, qui déploie déjà les contrats à son démarrage).
- **`npm run dev` de l'Office de Tourisme télécharge `serve`** à la première exécution (`npx --yes serve@14.2.7`), en version épinglée.
- **`npm run slither` demande Docker.** [`slither.sh`](src:smart-contract/scripts/slither.sh) lance l'image `ghcr.io/crytic/slither:0.11.6` (modifiable par `SLITHER_IMAGE`), installe le compilateur 0.8.34 dans le conteneur et analyse les deux contrats avec `--fail-medium`.

## Référence générée

{{generated:scripts-npm}}
