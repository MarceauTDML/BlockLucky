# 0003 Migrations versionnées, exécutées une seule fois, compatibles N-1

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

## Vérification dans le code

Cette section confronte la décision au dépôt actuel. Elle ne modifie pas la décision.

### Ce qui est conforme

| Élément de la décision | Constat | Où |
|---|---|---|
| Job dédié | Cible `migrator` : `CMD ["npx", "prisma", "migrate", "deploy"]`. Service `migrate` (profil `app`, `restart: "no"`) ; `backend` et `worker` attendent `service_completed_successfully` | [`backend/Dockerfile`](src:backend/Dockerfile), [`docker-compose.yml`](src:docker-compose.yml) |
| L'API ne migre pas | Ni [`backend/src/server.ts`](src:backend/src/server.ts) ni la cible `runtime` n'appellent Prisma Migrate | [`backend/Dockerfile`](src:backend/Dockerfile) |
| Contrôle en CI | Job backend : `npx prisma migrate deploy` sur un service `postgres:15-alpine` vierge, puis `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) |
| `lock_timeout` | Présent en tête des trois migrations postérieures à la migration initiale. L'application fixe aussi `lock_timeout: 5000` sur ses propres connexions | [`backend/prisma/migrations/`](src:backend/prisma/migrations/), [`backend/src/config/prisma.config.ts`](src:backend/src/config/prisma.config.ts) |
| `NOT VALID` puis `VALIDATE` | Cinq contraintes CHECK dans `20261109213843_infra_indexes_timestamptz_checks`, la clé étrangère `Partner_ownerId_fkey` dans `20261110004931_security_backup_codes_partner_owner` | [`backend/prisma/migrations/`](src:backend/prisma/migrations/) |
| Invariants en base | `User_pointsBalance_non_negative`, `RewardCatalog_remainingStock_non_negative`, `RewardCatalog_totalStock_non_negative`, `RewardCatalog_costInPoints_positive`, `LotteryRound_prizePool_non_negative` | [`backend/prisma/migrations/20261109213843_infra_indexes_timestamptz_checks/migration.sql`](src:backend/prisma/migrations/20261109213843_infra_indexes_timestamptz_checks/migration.sql) |
| Pas de `CONCURRENTLY` | Aucune migration n'en contient | [`backend/prisma/migrations/`](src:backend/prisma/migrations/) |
| Traduction des violations | Les codes `23514` (CHECK) et `P2004` donnent une réponse 409 « L'opération viole une règle d'intégrité des données » | [`backend/src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts) |

### Écarts et précisions

**La migration initiale ne commence pas par `SET lock_timeout`.** `20261102182348_init` crée les tables sur une base vide : aucune requête concurrente n'est bloquée, l'écart est sans conséquence. Il faut le garder en tête si ce fichier sert de modèle.

**La dernière migration combine ajout et relâchement.** `20261111150000_onchain_wallets_tickets_indexer` ajoute des colonnes nullables (`walletEncryptedKey`, `ticketIndex`, `payerWallet`, etc.), crée la table `ChainCursor`, remplace l'index unique `Ticket_transactionHash_key` par un index simple et ajoute l'unicité `(lotteryId, ticketIndex)`. Supprimer une unicité relâche une contrainte : le code précédent continue de fonctionner. La nouvelle unicité ne gêne pas non plus l'ancien code, qui écrivait `ticketIndex` à `NULL` et PostgreSQL considère les `NULL` comme distincts. La migration reste donc compatible N-1.

**Le changement de type des dates verrouille la table.** La migration `20261109213843_infra_indexes_timestamptz_checks` convertit les colonnes de date en `TIMESTAMPTZ(3)`. Ce changement de type réécrit la table sous verrou exclusif. Le `lock_timeout` de 5 s empêche d'attendre indéfiniment, mais sur une table volumineuse la réécriture elle-même bloque les écritures. Pour une future conversion de ce type sur des données de production, il faudra passer par une nouvelle colonne et une double écriture.

**Le seed n'est pas une migration.** [`backend/prisma/seed.ts`](src:backend/prisma/seed.ts) se lance à part (`npm run prisma:seed`) et n'est jamais exécuté par le service `migrate`. Voir [Seed](../../base-de-donnees/seed.md).

## Pour aller plus loin

- [Migrations](../../base-de-donnees/migrations.md) : liste et contenu de chaque migration.
- [Ajouter une migration](../../guides/ajouter-migration.md) : procédure pas à pas.
- [Index et contraintes](../../base-de-donnees/index-contraintes.md) : inventaire complet.
