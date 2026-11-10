# 0003 - Migrations versionnées, exécutées une seule fois, compatibles N-1

- Statut : accepté
- Date : 2026-11-10

## Contexte

Le schéma est géré par Prisma Migrate. Une migration lancée au démarrage de chaque instance provoque des courses entre instances, et une migration cassante (renommage, suppression) casse la version précédente du code encore en service pendant un déploiement.

## Décision

- Les migrations sont appliquées une seule fois par un job dédié avant le démarrage de l'API (service `migrate` de `docker-compose.yml`, cible `migrator` du Dockerfile), jamais par l'API elle-même.
- La CI applique toutes les migrations sur une base PostgreSQL vierge puis vérifie qu'il n'existe aucune dérive entre `schema.prisma` et les migrations (`prisma migrate diff --exit-code`).
- Chaque migration reste compatible avec la version précédente du code (pattern expand/contract) : ajout de colonne nullable ou avec défaut, double écriture, backfill par lots hors migration, suppression dans une release ultérieure.
- Chaque migration commence par `SET lock_timeout = '5s'`. Les contraintes sont ajoutées en `NOT VALID` puis validées.
- Les invariants critiques sont garantis par la base (contraintes CHECK : solde d'EtherPoints, stocks, cagnotte non négatifs), pas seulement par le code.

## Conséquences

- Un renommage de colonne demande trois déploiements.
- Les index sont créés sans `CONCURRENTLY`, car Prisma envoie chaque fichier de migration en un seul bloc (transaction implicite), où `CONCURRENTLY` est interdit. Sur de grosses tables, il faudra une migration ne contenant que l'instruction `CREATE INDEX CONCURRENTLY`.
