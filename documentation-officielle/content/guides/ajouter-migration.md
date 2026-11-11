# Ajouter une migration

Le schéma de la base est décrit par [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) et versionné en migrations SQL dans [`backend/prisma/migrations/`](src:backend/prisma/migrations/). Ce guide crée une migration conforme à l'ADR 0003 (voir [Migrations expand et contract](../architecture/adr/0003-migrations-expand-contract.md)) : appliquée une seule fois par un job dédié, compatible avec la version précédente du code, protégée par un `lock_timeout`, avec des contraintes ajoutées en `NOT VALID` puis validées.

L'exemple crée une table `Refund` qui enregistrera les remboursements réclamés sur le contrat après l'annulation d'un tour. Elle sert ensuite au guide [Indexer un nouvel événement](indexer-evenement.md).

## Fichiers à toucher

| Fichier | Modification |
| --- | --- |
| [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) | Nouveau modèle, relation inverse |
| `backend/prisma/migrations/<horodatage>_<nom>/migration.sql` | Généré par Prisma, puis relu et complété à la main |
| [`backend/__tests__/__mocks__/prisma.mock.ts`](src:backend/__tests__/__mocks__/prisma.mock.ts) | Doublure du nouveau modèle, si une route testée l'utilise |
| [`documentation-officielle/content/_data/migrations.json`](src:documentation-officielle/content/_data/migrations.json) | Description de la migration |
| [`documentation-officielle/content/_data/modele-donnees.json`](src:documentation-officielle/content/_data/modele-donnees.json) | Description du modèle et de chaque champ |

## Règles à respecter

| Règle | Pourquoi |
| --- | --- |
| Première ligne : `SET lock_timeout = '5s';` | Une instruction qui attend un verrou plus de 5 secondes échoue au lieu de bloquer toutes les requêtes de l'application |
| Contraintes `CHECK` et clés étrangères ajoutées en `NOT VALID`, puis `VALIDATE CONSTRAINT` | L'ajout `NOT VALID` ne parcourt pas la table ; la validation prend un verrou plus léger, qui laisse passer les lectures et les écritures |
| Une colonne ajoutée sur une table existante est nullable ou a une valeur par défaut | L'ancienne version du code, encore en service pendant le déploiement, n'écrit pas cette colonne |
| Pas de renommage ni de suppression dans la même version que le code qui en dépend | Le code N-1 doit continuer de fonctionner (expand/contract) |
| Pas de `CREATE INDEX CONCURRENTLY` dans une migration qui contient autre chose | Prisma envoie le fichier dans une transaction implicite, où `CONCURRENTLY` est interdit |
| Les invariants critiques sont des contraintes en base | Un solde ou un stock négatif doit être impossible même si le code a un bogue |
| Une migration publiée n'est jamais modifiée | Prisma compare l'empreinte des fichiers déjà appliqués et refuserait de continuer |

## 1. Modifier le schéma

Dans [`schema.prisma`](src:backend/prisma/schema.prisma), ajouter le modèle et la relation inverse dans `LotteryRound` :

```prisma
model Refund {
  id              String       @id @default(uuid(7))
  lotteryId       String
  lottery         LotteryRound @relation(fields: [lotteryId], references: [id])
  walletAddress   String
  amountWei       String
  transactionHash String
  logIndex        Int
  refundedAt      DateTime     @db.Timestamptz(3)

  @@unique([transactionHash, logIndex])
  @@index([lotteryId])
  @@index([walletAddress])
}
```

Dans le modèle `LotteryRound` existant, ajouter la relation inverse sous la ligne `tickets Ticket[]` :

```prisma
  refunds            Refund[]
```

Conventions du schéma existant :

| Convention | Exemple dans le schéma |
| --- | --- |
| Identifiant UUID v7, généré par Prisma | `id String @id @default(uuid(7))` |
| Dates avec fuseau, précision milliseconde | `@db.Timestamptz(3)` |
| Montants en wei stockés en texte | `prizeWei String?`, `ticketPriceWei String?` : un `uint256` ne tient pas dans un `BIGINT` |
| Adresses Ethereum en minuscules | `walletAddress`, `winnerWallet`, `payerWallet` |
| Unicité qui rend l'indexation idempotente | `@@unique([lotteryId, ticketIndex])` sur `Ticket` |
| Index sur chaque clé étrangère | `@@index([lotteryId])`, `@@index([ownerId])` |

La paire `(transactionHash, logIndex)` identifie de façon unique un événement de la chaîne : rejouer l'indexation ne crée pas de doublon.

## 2. Générer la migration sans l'appliquer

La base locale doit tourner (`docker compose up -d --wait`). Depuis `backend/` :

```bash
npx prisma migrate dev --create-only --name refund_claims
```

Prisma crée `prisma/migrations/<horodatage>_refund_claims/migration.sql` sans l'appliquer. Le SQL généré, débarrassé des lignes de commentaire que Prisma insère (`-- CreateTable`, `-- CreateIndex`...) :

```sql
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "lotteryId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "refundedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Refund_lotteryId_idx" ON "Refund"("lotteryId");

CREATE INDEX "Refund_walletAddress_idx" ON "Refund"("walletAddress");

CREATE UNIQUE INDEX "Refund_transactionHash_logIndex_key" ON "Refund"("transactionHash", "logIndex");

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_lotteryId_fkey" FOREIGN KEY ("lotteryId") REFERENCES "LotteryRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## 3. Compléter le SQL à la main

Trois modifications, sur le modèle de [`20261110004931_security_backup_codes_partner_owner`](src:backend/prisma/migrations/20261110004931_security_backup_codes_partner_owner/migration.sql) et [`20261109213843_infra_indexes_timestamptz_checks`](src:backend/prisma/migrations/20261109213843_infra_indexes_timestamptz_checks/migration.sql) :

1. ajouter `SET lock_timeout = '5s';` en première ligne ;
2. passer la clé étrangère en `NOT VALID` et la valider ;
3. ajouter les contraintes `CHECK` que Prisma ne sait pas exprimer.

```sql
SET lock_timeout = '5s';

CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "lotteryId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "refundedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Refund_lotteryId_idx" ON "Refund"("lotteryId");

CREATE INDEX "Refund_walletAddress_idx" ON "Refund"("walletAddress");

CREATE UNIQUE INDEX "Refund_transactionHash_logIndex_key" ON "Refund"("transactionHash", "logIndex");

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_lotteryId_fkey" FOREIGN KEY ("lotteryId") REFERENCES "LotteryRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "Refund" VALIDATE CONSTRAINT "Refund_lotteryId_fkey";

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amountWei_digits" CHECK ("amountWei" ~ '^[0-9]+$') NOT VALID;
ALTER TABLE "Refund" VALIDATE CONSTRAINT "Refund_amountWei_digits";
```

Les contraintes `CHECK` n'apparaissent pas dans `schema.prisma`. Le [Dictionnaire de données](../base-de-donnees/dictionnaire.md) les retrouve en lisant les migrations, à condition de garder la forme `ALTER TABLE "Table" ADD CONSTRAINT "Nom" CHECK (...)`.

## 4. Appliquer et régénérer le client

```bash
npx prisma migrate dev
```

`migrate dev` applique la migration à la base locale et régénère le client Prisma. Vérifier ensuite l'état et l'absence de dérive, comme le fait la CI :

```bash
npm run prisma:status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

La seconde commande renvoie un code non nul si le schéma décrit un état que les migrations ne produisent pas : par exemple un champ ajouté dans `schema.prisma` après la génération du SQL.

> [!CAUTION]
> `npx prisma migrate dev` et `npm run prisma:reset` sont réservés au poste de développement : ils peuvent proposer de réinitialiser la base. En production, seule `npm run prisma:deploy` (`prisma migrate deploy`) est lancée, par le service `migrate` de Compose.

## 5. Tests et documentation

| Étape | Commande ou fichier |
| --- | --- |
| Typecheck et tests | `npm run typecheck && npm test` |
| Doublure Prisma | Ajouter un objet `refund` avec ses méthodes dans [`prisma.mock.ts`](src:backend/__tests__/__mocks__/prisma.mock.ts) si une route testée l'utilise |
| Description de la migration | Entrée `"<horodatage>_refund_claims": "..."` dans [`migrations.json`](src:documentation-officielle/content/_data/migrations.json) |
| Description du modèle | Entrée `modeles.Refund` avec `description` et `champs` dans [`modele-donnees.json`](src:documentation-officielle/content/_data/modele-donnees.json) |
| Régénération | `npm run build` dans `documentation-officielle/`, puis commiter `site/` |

Exemple d'entrée pour la description du modèle :

```json
{
  "modeles": {
    "Refund": {
      "description": "Remboursement réclamé sur le contrat après l'annulation d'un tour, une ligne par événement RefundClaimed.",
      "champs": {
        "id": "Identifiant UUID v7.",
        "lotteryId": "Tour annulé.",
        "lottery": "Relation vers le tour.",
        "walletAddress": "Portefeuille remboursé, en minuscules.",
        "amountWei": "Montant remboursé en wei.",
        "transactionHash": "Transaction qui a émis l'événement.",
        "logIndex": "Position de l'événement dans le bloc.",
        "refundedAt": "Date du bloc."
      }
    }
  }
}
```

## Modifier une table existante

Une modification qui touche des données existantes se découpe en plusieurs pull requests, chacune déployée séparément.

### Ajouter une colonne obligatoire

| Étape | Pull request | Contenu |
| --- | --- | --- |
| Expansion | 1 | Colonne nullable ou avec défaut ; le nouveau code l'écrit, l'ancien l'ignore |
| Remplissage | 2 | Script de remplissage par lots, hors migration, pour ne pas tenir de verrou longtemps |
| Contraction | 3 | `SET NOT NULL` ou contrainte `CHECK ... NOT VALID` puis `VALIDATE`, une fois toutes les lignes remplies |

### Renommer une colonne

Trois déploiements : ajout de la nouvelle colonne et double écriture, bascule des lectures, suppression de l'ancienne colonne. Un `ALTER TABLE ... RENAME COLUMN` direct casserait la version du code encore en service pendant le déploiement.

### Créer un index sur une grosse table

Créer une migration qui ne contient que l'index, sans `SET lock_timeout` ni autre instruction, pour pouvoir utiliser `CONCURRENTLY` :

```sql
CREATE INDEX CONCURRENTLY "Ticket_payerWallet_idx" ON "Ticket"("payerWallet");
```

Sur les volumes actuels (quelques milliers de lignes au plus), un `CREATE INDEX` simple suffit.

## Revenir en arrière

Une migration appliquée ne se défait pas automatiquement : Prisma n'écrit pas de migration descendante. Le retour arrière passe par :

1. le redéploiement de la version précédente du code, qui fonctionne avec le nouveau schéma grâce à l'expand/contract ;
2. si nécessaire, une nouvelle migration qui annule la précédente ;
3. en dernier recours, la restauration de la sauvegarde prise avant la migration (voir [Sauvegardes et reprise](../infrastructure/sauvegardes.md)).

Une migration qui échoue en cours de route en production se diagnostique avec `npm run prisma:status`, puis se marque résolue avec `npx prisma migrate resolve --rolled-back <nom>` ou `--applied <nom>` après correction manuelle.
