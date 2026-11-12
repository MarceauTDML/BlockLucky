# Migrations

Le schéma de la base évolue uniquement par des migrations Prisma Migrate versionnées dans [`backend/prisma/migrations/`](src:backend/prisma/migrations/migration_lock.toml). Chaque migration est un dossier `<horodatage>_<nom>` contenant un fichier `migration.sql`. Le fichier `migration_lock.toml` fixe le fournisseur à `postgresql`. Prisma enregistre les migrations appliquées dans la table `_prisma_migrations` de la base.

Les règles de cette page reprennent la décision d'architecture du 10 novembre 2026 sur les migrations : migrations exécutées une seule fois par un job dédié, compatibles avec la version précédente du code, et invariants garantis par la base.

## Historique

Le tableau suivant est généré depuis le contenu du dossier des migrations.

{{generated:migrations}}

Le détail de ce que chaque migration crée (index, contraintes) est sur la page [Index et contraintes](index-contraintes.md).

## Procédure

### Créer une migration en développement

Depuis `backend/`, avec la base locale démarrée (`docker compose up -d --wait` à la racine) :

1. modifier [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) ;
2. générer et appliquer la migration :

```bash
npm run prisma:migrate -- --name ajout_colonne_exemple
```

Le script lance `prisma migrate dev`, qui compare le schéma à la base, écrit `prisma/migrations/<horodatage>_ajout_colonne_exemple/migration.sql`, l'applique et régénère le client Prisma.

3. relire le SQL produit et l'adapter aux règles ci-dessous : ajouter `SET lock_timeout = '5s';` en tête, transformer un ajout de contrainte en `NOT VALID` suivi de `VALIDATE CONSTRAINT`, ajouter les contraintes CHECK que Prisma ne sait pas générer ;
4. mettre à jour les descriptions de la documentation : nouvelle entrée dans `documentation-officielle/content/_data/migrations.json` et nouveaux champs dans `modele-donnees.json` (voir [Dictionnaire de données](dictionnaire.md#mise-a-jour-de-cette-page)) ;
5. lancer `npm run typecheck` et `npm test`.

Pour une contrainte CHECK seule, sans changement du schéma Prisma, on crée une migration vide avec `npm run prisma:migrate -- --create-only --name …` et on écrit le SQL à la main.

### Appliquer les migrations

| Contexte | Commande | Effet |
|---|---|---|
| Développement, base existante | `npx prisma migrate deploy` ou `npm run prisma:deploy` | Applique les migrations manquantes, sans rien générer |
| État des migrations | `npm run prisma:status` | Liste les migrations appliquées et en attente |
| Réinitialisation complète | `npm run prisma:reset` | Supprime toutes les données, réapplique toutes les migrations ; destructif. Le seed n'est pas lancé : il faut ensuite `npm run prisma:seed` (voir [Seed](seed.md#lancer-le-seed)) |
| Docker Compose | service `migrate` | Lancé avant `backend` et `worker` |
| CI | `npx prisma migrate deploy` | Sur une base PostgreSQL vierge |

L'API n'applique jamais les migrations elle-même. Dans [`docker-compose.yml`](src:docker-compose.yml), le service `migrate` (profil `app`) construit la cible `migrator` de [`backend/Dockerfile`](src:backend/Dockerfile), dont la commande est `npx prisma migrate deploy`. Les services `backend` et `worker` attendent qu'il se termine avec succès (`condition: service_completed_successfully`). Avec plusieurs instances d'API, appliquer les migrations au démarrage de chacune provoquerait des exécutions concurrentes ; le job unique l'évite.

`prisma migrate reset` et `prisma migrate dev` ne doivent jamais être lancés sur une base de production : le premier efface les données, le second peut proposer de le faire en cas de dérive.

## Règle expand et contract

Pendant un déploiement, l'ancienne version du code tourne encore quelques instants avec le nouveau schéma. Chaque migration doit donc rester compatible avec la version N-1 du code. Un changement cassant est découpé en étapes déployées séparément :

| Étape | Exemple pour renommer `prizePool` en `prizePoolEth` |
|---|---|
| Expansion | Migration qui ajoute `prizePoolEth`, nullable ou avec un défaut |
| Double écriture | Version du code qui écrit les deux colonnes et lit l'ancienne |
| Rattrapage | Copie des valeurs existantes par lots, hors migration |
| Bascule | Version du code qui lit la nouvelle colonne |
| Contraction | Migration ultérieure qui supprime `prizePool` |

Un renommage demande ainsi trois déploiements au minimum. Opérations sûres en une seule migration : ajout de table, ajout de colonne nullable ou avec défaut, ajout d'index, ajout de contrainte que les données existantes respectent.

Application aux migrations existantes :

- `20261112150000_user_names` n'ajoute que les colonnes nullables `User.firstName` et `User.lastName` : l'ancien code les ignore, et PostgreSQL ajoute une colonne sans défaut sans réécrire la table ;
- `20261110004931` et `20261111150000` n'ajoutent que des colonnes nullables (ou à défaut constant), une table et des index : compatibles avec la version précédente ;
- `20261111150000` supprime aussi l'index unique `Ticket_transactionHash_key`. C'est une contraction, faite dans la même migration que l'expansion. Elle est sans risque ici : l'ancien code vérifie l'existence d'un ticket par `findFirst` sur le hachage avant d'écrire, et l'index simple créé juste avant garde cette recherche rapide ;
- `20261109213843` change le type des colonnes de date de `TIMESTAMP(3)` vers `TIMESTAMPTZ(3)`. Le code lit les deux types de la même façon ; le changement réécrit en revanche les tables concernées (voir plus bas).

## Verrous

### lock_timeout

Toutes les migrations postérieures à `init` commencent par :

```sql
SET lock_timeout = '5s';
```

Une instruction `ALTER TABLE` demande un verrou exclusif sur la table. Si une longue transaction de l'application tient déjà un verrou sur cette table, l'`ALTER TABLE` attend, et toutes les requêtes suivantes sur la table attendent derrière lui : l'application se fige. Avec `lock_timeout`, la migration abandonne au bout de 5 s au lieu de bloquer, et peut être relancée à un moment plus calme. L'application elle-même se connecte avec `lock_timeout` à 5 s (voir [Performance et sauvegardes](performance-sauvegardes.md#delais-par-connexion)).

### Contraintes ajoutées sans bloquer

Les clés étrangères et contraintes CHECK ajoutées après `init` suivent le motif :

```sql
ALTER TABLE "User" ADD CONSTRAINT "User_pointsBalance_non_negative" CHECK ("pointsBalance" >= 0) NOT VALID;
ALTER TABLE "User" VALIDATE CONSTRAINT "User_pointsBalance_non_negative";
```

`NOT VALID` ajoute la contrainte pour les nouvelles écritures sans vérifier les lignes existantes, ce qui est immédiat. `VALIDATE CONSTRAINT` vérifie ensuite les lignes existantes avec un verrou plus faible, qui laisse passer les lectures et les écritures.

> [!NOTE]
> Prisma envoie chaque fichier `migration.sql` en un seul bloc, exécuté par PostgreSQL dans une transaction implicite. Le verrou exclusif pris par `ADD CONSTRAINT … NOT VALID` est alors conservé jusqu'à la fin de la transaction, donc pendant `VALIDATE CONSTRAINT`. Dans les migrations actuelles, le motif n'apporte donc pas le gain attendu. Pour qu'il soit effectif sur une grosse table, la validation doit être placée dans une migration séparée. Aux volumes du projet, la différence n'est pas mesurable.

### Index sans CONCURRENTLY

`CREATE INDEX CONCURRENTLY` construit un index sans bloquer les écritures, mais il est interdit dans une transaction. Pour la même raison de transaction implicite, les index des migrations sont créés sans `CONCURRENTLY` et bloquent les écritures sur la table pendant leur construction. Sur une grosse table, il faudra une migration ne contenant que l'instruction `CREATE INDEX CONCURRENTLY`.

### Réécriture de table

La conversion `ALTER COLUMN … SET DATA TYPE TIMESTAMPTZ(3) USING … AT TIME ZONE 'UTC'` de la migration `20261109213843` réécrit chaque table concernée sous verrou exclusif. Aux volumes du projet, c'est instantané. Une conversion de ce type sur une table volumineuse passerait par une nouvelle colonne et un rattrapage par lots.

## Contrôle de dérive en CI

Le job `backend` de [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) contient deux étapes sur une base PostgreSQL 15 vierge :

```bash
npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

| Étape | Ce qu'elle détecte |
|---|---|
| « Migrations appliquées sur une base vierge » | Une migration qui ne s'applique pas : erreur SQL, ordre incorrect, dépendance à des données |
| « Absence de dérive entre le schéma Prisma et les migrations » | Un schéma modifié sans migration, ou une migration modifiée à la main de façon incompatible avec le schéma |

`migrate diff` compare la base obtenue (lue par la source de données de [`backend/prisma.config.ts`](src:backend/prisma.config.ts), donc `DATABASE_URL`) au fichier `schema.prisma`. Avec `--exit-code`, la commande renvoie un code non nul s'il existe une différence, ce qui fait échouer le job. Les contraintes CHECK écrites à la main ne déclenchent pas de dérive, car Prisma ne les représente pas dans le schéma.

Le job `chain` applique aussi toutes les migrations sur une base vierge avant le test d'intégration blockchain (voir [Tests sur une vraie chaîne](../integration-blockchain/tests.md#job-ci-chain)).

## Revenir en arrière

Prisma Migrate ne génère pas de migration inverse. Revenir à une version précédente du code n'est sûr que si la dernière migration est compatible avec cette version, ce que garantit la règle expand et contract. Si ce n'est pas le cas, il faut écrire une migration corrective, ou restaurer une sauvegarde ; voir [Performance et sauvegardes](performance-sauvegardes.md#sauvegardes) et les [runbooks](../infrastructure/runbooks.md).

Une migration déjà appliquée quelque part ne doit jamais être modifiée : Prisma vérifie la somme de contrôle de chaque fichier et signale toute modification.
