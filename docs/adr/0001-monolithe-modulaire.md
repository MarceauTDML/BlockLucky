# 0001 - Monolithe modulaire plutôt que microservices

- Statut : accepté
- Date : 2026-11-10

## Contexte

L'équipe est une seule équipe projet. Le trafic attendu (une ville de 120 000 habitants, pic au moment du tirage) tient sur une instance d'API correctement dimensionnée. Les domaines (loterie, fidélité, partenaires, administration) partagent les mêmes utilisateurs et les mêmes transactions de points.

## Décision

Le backend reste un monolithe modulaire déployé comme une seule image, avec un découpage par domaine dans `backend/src/api/<domaine>` et une couche `repo` par domaine. Les traitements asynchrones (emails, ledger) tournent dans un process worker séparé construit à partir de la même image (`src/worker.ts`), pour pouvoir les dimensionner indépendamment de l'API.

## Conséquences

- Un seul déploiement, une seule base, des transactions ACID entre domaines.
- Un module ne sera extrait en service que s'il a des besoins de scaling ou d'équipe distincts, et cette extraction fera l'objet d'un nouvel ADR (pattern Strangler Fig).
- Les modules ne doivent pas importer les fichiers internes d'un autre module. Cette règle n'est pas encore outillée (dependency-cruiser) et repose sur la revue de code.
