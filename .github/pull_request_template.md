## Contexte

Pourquoi ce changement, lien vers le ticket ou la tâche.

## Changements

- 

## Projets concernés

- [ ] smart-contract
- [ ] backend
- [ ] frontend-web
- [ ] mobile-app
- [ ] frontend-office-tourisme
- [ ] infrastructure (Docker, CI)
- [ ] documentation-officielle

## Vérifications

- [ ] Typecheck, lint et tests passent en local
- [ ] Migration Prisma compatible avec la version précédente du code (expand/contract)
- [ ] `.env.example` et `documentation-officielle/content/_data/variables.json` mis à jour si une variable a été ajoutée
- [ ] Contrat modifié : tests, couverture à 100 %, Slither et `npm run export:abi`
- [ ] Documentation mise à jour et régénérée (`npm run build` dans `documentation-officielle/`)
- [ ] Captures d'écran jointes pour un changement visuel (web, mobile)

## Plan de retour arrière

Comment annuler ce changement si un problème apparaît après le déploiement.
