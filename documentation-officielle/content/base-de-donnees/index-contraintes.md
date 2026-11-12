# Index et contraintes

Cette page recense chaque index, chaque contrainte d'unicité, chaque clé étrangère et chaque contrainte CHECK de la base, telle que la créent les migrations de [`backend/prisma/migrations/`](src:backend/prisma/migrations/migration_lock.toml), avec la requête ou l'invariant qui la justifie.

Les index sont déclarés dans [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) par `@id`, `@unique`, `@@unique` et `@@index`. Les contraintes CHECK n'ont pas d'équivalent dans le schéma Prisma : elles sont écrites à la main dans la migration [`20261109213843_infra_indexes_timestamptz_checks`](src:backend/prisma/migrations/20261109213843_infra_indexes_timestamptz_checks/migration.sql).

## Clés primaires

Chaque table a une clé primaire `<Table>_pkey` sur la colonne `id`, de type texte. PostgreSQL crée pour chacune un index B-tree unique.

| Table | Génération de `id` |
|---|---|
| `User`, `IdentityDocument`, `Token`, `LotteryRound`, `Ticket`, `PointTransaction`, `Partner`, `RewardCatalog`, `ClaimedReward`, `Analytics` | UUID v7 par Prisma (`@default(uuid(7))`) |
| `ChainCursor` | Fixée par l'indexeur (`BlockLucky`) |

Les UUID v7 commencent par un horodatage : les nouvelles lignes s'ajoutent en fin d'index, ce qui limite la fragmentation par rapport à des UUID v4 aléatoires.

## Contraintes d'unicité

| Index | Table et colonnes | Migration | Justification |
|---|---|---|---|
| `User_walletAddress_key` | `User(walletAddress)` | `init` | Une adresse Ethereum correspond à un seul compte. L'indexeur et la file d'actions retrouvent le compte par l'adresse émise dans un événement (`findUnique({ where: { walletAddress } })`) |
| `User_email_key` | `User(email)` | `init` | Un email, un compte : c'est l'identifiant de connexion. PostgreSQL autorise plusieurs `NULL`, donc plusieurs comptes sans email (comptes créés par l'indexeur, comptes anonymisés) |
| `User_referralCode_key` | `User(referralCode)` | `init` | Le code d'un lien de parrainage désigne un parrain unique (`findByReferralCode`) |
| `IdentityDocument_userId_key` | `IdentityDocument(userId)` | `password_accounts_identity_verification` | Une seule demande par compte : un nouvel envoi remplace la précédente (`upsert` sur `userId`) |
| `Token_token_key` | `Token(token)` | `init` | Recherche d'un jeton par son empreinte lors de la confirmation ; empêche deux jetons identiques |
| `LotteryRound_contractRoundId_key` | `LotteryRound(contractRoundId)` | `init` | Un tour du contrat n'a qu'une projection en base. Base des `upsert` de l'indexeur et de `upsertRoundFromChain` |
| `ClaimedReward_uniqueCode_key` | `ClaimedReward(uniqueCode)` | `init` | Un code promo n'est délivré qu'une fois et désigne un seul échange lors de la validation en magasin |
| `Ticket_lotteryId_ticketIndex_key` | `Ticket(lotteryId, ticketIndex)` | `onchain_wallets_tickets_indexer` | Un numéro de ticket n'existe qu'une fois par tour. C'est la garantie d'idempotence de l'indexeur : un second traitement du même événement `TicketsPurchased` viole cette contrainte et est reconnu comme déjà indexé |

### Unicité retirée : Ticket.transactionHash

La migration `init` avait créé `Ticket_transactionHash_key`, un index **unique** sur `Ticket(transactionHash)` : en mode simulé, une transaction fictive produisait un ticket. Sur la chaîne, un appel `buyTickets(3)` émet un seul événement pour trois tickets, qui partagent le même hachage. La migration `20261111150000_onchain_wallets_tickets_indexer` :

1. crée l'index simple `Ticket_transactionHash_idx` ;
2. supprime l'index unique `Ticket_transactionHash_key` ;
3. crée l'index unique `Ticket_lotteryId_ticketIndex_key`.

L'ordre garantit qu'un index sur le hachage existe à tout moment pendant la migration.

### Valeurs NULL dans les index uniques

PostgreSQL considère deux `NULL` comme distincts dans un index unique. Conséquences voulues :

- plusieurs comptes peuvent avoir `email` à `NULL` ;
- les tickets simulés, dont `ticketIndex` est `NULL`, ne sont pas contraints par `Ticket_lotteryId_ticketIndex_key`.

## Index simples

| Index | Table et colonnes | Migration | Requête servie |
|---|---|---|---|
| `User_referredById_idx` | `User(referredById)` | `infra_indexes…` | Liste et comptage des filleuls d'un parrain (`_count.referrals` du classement, page parrainage) |
| `IdentityDocument_status_submittedAt_idx` | `IdentityDocument(status, submittedAt)` | `password_accounts…` | File de la Mairie : demandes d'un statut, des plus anciennes aux plus récentes (`GET /admin/identity-verifications`) |
| `IdentityDocument_reviewerId_idx` | `IdentityDocument(reviewerId)` | `password_accounts…` | Mise à `NULL` lors de la suppression du compte d'un agent |
| `Token_userId_idx` | `Token(userId)` | `infra_indexes…` | Suppression en cascade des jetons d'un compte, sans parcours complet de la table |
| `LotteryRound_status_idx` | `LotteryRound(status)` | `infra_indexes…` | Recherche du tour courant `OPEN` ou `LOCKED` (`getCurrentOrCreateRound`) |
| `Ticket_userId_purchasedAt_idx` | `Ticket(userId, purchasedAt)` | `infra_indexes…` | Historique des tickets d'un citoyen trié par date (`GET /lottery/my-tickets`), et comptage par compte |
| `Ticket_lotteryId_idx` | `Ticket(lotteryId)` | `infra_indexes…` | Tickets d'un tour : comptage, participants distincts, payeurs à rembourser |
| `Ticket_transactionHash_idx` | `Ticket(transactionHash)` | `onchain_wallets…` | Recherche d'un ticket par transaction, utilisée par l'indexation simulée (`findFirst({ where: { transactionHash } })`) |
| `PointTransaction_userId_createdAt_idx` | `PointTransaction(userId, createdAt)` | `infra_indexes…` | Historique des EtherPoints d'un compte trié par date |
| `Partner_ownerId_idx` | `Partner(ownerId)` | `security_backup_codes…` | Commerces gérés par un commerçant ; mise à `NULL` lors de la suppression d'un compte |
| `RewardCatalog_partnerId_idx` | `RewardCatalog(partnerId)` | `infra_indexes…` | Offres d'un commerce dans le catalogue et le tableau de bord partenaire |
| `ClaimedReward_userId_claimedAt_idx` | `ClaimedReward(userId, claimedAt)` | `infra_indexes…` | Codes promo d'un citoyen triés par date (`GET /marketplace/my-codes`) |
| `ClaimedReward_rewardId_idx` | `ClaimedReward(rewardId)` | `infra_indexes…` | Consommation des codes d'une offre (indicateur partenaire) |
| `Analytics_eventType_timestamp_idx` | `Analytics(eventType, timestamp)` | `infra_indexes…` | Regroupements par type d'événement sur une période, et journal d'audit (`eventType` commençant par `ADMIN_AUDIT:`, trié par date) |
| `Analytics_userId_idx` | `Analytics(userId)` | `infra_indexes…` | Événements d'un compte (export RGPD) ; mise à `NULL` lors de la suppression d'un compte |

### Pourquoi indexer les clés étrangères

PostgreSQL n'indexe pas automatiquement les colonnes de clé étrangère. Sans index, supprimer ou modifier une ligne parente oblige la base à parcourir toute la table enfant pour appliquer `RESTRICT`, `CASCADE` ou `SET NULL`, en tenant un verrou pendant ce parcours. La migration `20261109213843` a ajouté un index sur chaque clé étrangère existante, et la migration suivante a fait de même pour `Partner.ownerId`.

### Index composites

Les index `(userId, purchasedAt)`, `(userId, createdAt)`, `(userId, claimedAt)`, `(eventType, timestamp)` et `(status, submittedAt)` mettent la colonne d'égalité en premier et la colonne de tri en second. Une requête « les 20 derniers éléments de tel compte » lit directement les bonnes entrées dans l'ordre, sans tri. Ces index servent aussi les requêtes qui ne filtrent que sur la première colonne ; c'est pourquoi il n'existe pas d'index séparé sur `Ticket(userId)` ou `PointTransaction(userId)`.

## Clés étrangères

| Contrainte | Colonne | Cible | `ON DELETE` | Migration |
|---|---|---|---|---|
| `User_referredById_fkey` | `User.referredById` | `User.id` | `SET NULL` | `init` |
| `Token_userId_fkey` | `Token.userId` | `User.id` | `CASCADE` | `init` |
| `Ticket_userId_fkey` | `Ticket.userId` | `User.id` | `RESTRICT` | `init` |
| `Ticket_lotteryId_fkey` | `Ticket.lotteryId` | `LotteryRound.id` | `RESTRICT` | `init` |
| `PointTransaction_userId_fkey` | `PointTransaction.userId` | `User.id` | `RESTRICT` | `init` |
| `RewardCatalog_partnerId_fkey` | `RewardCatalog.partnerId` | `Partner.id` | `RESTRICT` | `init` |
| `ClaimedReward_userId_fkey` | `ClaimedReward.userId` | `User.id` | `RESTRICT` | `init` |
| `ClaimedReward_rewardId_fkey` | `ClaimedReward.rewardId` | `RewardCatalog.id` | `RESTRICT` | `init` |
| `Analytics_userId_fkey` | `Analytics.userId` | `User.id` | `SET NULL` | `init` |
| `Partner_ownerId_fkey` | `Partner.ownerId` | `User.id` | `SET NULL` | `security_backup_codes…` |
| `IdentityDocument_userId_fkey` | `IdentityDocument.userId` | `User.id` | `CASCADE` | `password_accounts…` |
| `IdentityDocument_reviewerId_fkey` | `IdentityDocument.reviewerId` | `User.id` | `SET NULL` | `password_accounts…` |

Toutes ont `ON UPDATE CASCADE`, valeur générée par Prisma ; les clés primaires n'étant jamais modifiées, cela n'a pas d'effet pratique.

`RESTRICT` sur les tickets, les mouvements de points et les échanges interdit de supprimer un compte qui a une activité. La suppression RGPD contourne ce point par l'anonymisation de la ligne `User` (voir [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md#effacement-rgpd)).

Les deux clés de `IdentityDocument` sont créées directement, sans `NOT VALID` : la table est nouvelle et vide au moment de la migration. `Partner_ownerId_fkey` a été ajoutée en `NOT VALID` puis validée par `VALIDATE CONSTRAINT`. Sur une table existante, cela évite de bloquer les écritures pendant la vérification des lignes ; voir [Migrations](migrations.md#contraintes-ajoutees-sans-bloquer).

## Contraintes CHECK

| Contrainte | Expression | Invariant protégé |
|---|---|---|
| `User_pointsBalance_non_negative` | `"pointsBalance" >= 0` | Un solde d'EtherPoints ne devient jamais négatif. `debitPoints` vérifie le solde avant de débiter, mais deux débits simultanés pourraient passer tous les deux ce contrôle applicatif ; la contrainte fait échouer le second |
| `RewardCatalog_remainingStock_non_negative` | `"remainingStock" >= 0` | Une offre ne peut pas être échangée au-delà de son stock, même si deux citoyens échangent la dernière unité au même instant : la décrémentation (`remainingStock: { decrement: 1 }`) du second échoue |
| `RewardCatalog_totalStock_non_negative` | `"totalStock" >= 0` | Un stock initial est positif ou nul |
| `RewardCatalog_costInPoints_positive` | `"costInPoints" > 0` | Une offre gratuite ou à coût négatif créditerait des points au lieu d'en débiter |
| `LotteryRound_prizePool_non_negative` | `"prizePool" >= 0` | Une cagnotte affichée n'est jamais négative |

Les cinq contraintes sont ajoutées en `NOT VALID` puis validées dans la même migration. La règle, posée par la décision d'architecture sur les migrations, est que les invariants critiques sont garantis par la base et non seulement par le code.

Une violation remonte à l'application comme une erreur PostgreSQL de code `23514` (ou Prisma `P2004`). Le gestionnaire d'erreurs [`backend/src/middlewares/error.middleware.ts`](src:backend/src/middlewares/error.middleware.ts) la traduit en HTTP 409 « L'opération viole une règle d'intégrité des données (solde ou stock insuffisant) ». De même, une violation d'unicité (`23505` ou `P2002`) donne une 409 « Cette ressource existe déjà ». Le contrôle applicatif préalable (`Solde d'EtherPoints insuffisant`, stock épuisé) traite le cas normal avec un message précis ; la contrainte ne sert que dans les courses.

## Ce qui n'est pas contraint

| Invariant | Garanti par |
|---|---|
| `pointsBalance` égal à la somme des `PointTransaction.amount` | Le service ledger, qui écrit les deux dans une transaction |
| `remainingStock <= totalStock` | Rien |
| `ticketIndex` renseigné en mode onchain | Le code de l'indexeur |
| Adresses en minuscules | Le code (`toLowerCase()` avant chaque écriture) |
| Valeurs de `actionType` | Le type TypeScript `LedgerActionType` |
| Une seule ligne dans `ChainCursor` | L'identifiant constant `BlockLucky` |
