# Reconstruire depuis la chaîne

En mode onchain, le contrat `BlockLucky` est la source de vérité de la loterie : qui a acheté quel ticket, dans quel tour, pour quel montant, qui a gagné et si la cagnotte a été versée. Les tables `LotteryRound` et `Ticket` n'en sont qu'une projection, écrite par l'[indexeur](../integration-blockchain/indexeur.md). Si ces tables sont perdues, corrompues ou incohérentes, on peut les reconstruire en faisant relire les événements du contrat depuis son bloc de déploiement.

Cette page décrit la procédure, ce qu'elle reconstruit et surtout ce qu'elle ne reconstruit pas.

## Ce que la chaîne permet de retrouver

| Donnée | Reconstructible | Source |
|---|---|---|
| Tours : numéro, prix, dates, statut, gagnant, ticket gagnant, cagnotte nette, identifiant VRF, date de versement | Oui | `RoundOpened`, `DrawRequested`, `WinnerPicked`, `PrizeClaimed`, `RoundCancelled`, et `getRound` |
| Tickets : tour, numéro, bénéficiaire, payeur, transaction, bloc, date | Oui | `TicketsPurchased` |
| Cagnotte collectée (`prizePool`) | Oui, sous conditions | Somme des `amount` de `TicketsPurchased` |
| Comptes rattachés aux adresses | Partiellement | Une adresse inconnue donne un compte sans email |
| EtherPoints | Non (voir [Limites](#limites)) | |
| Clés privées des portefeuilles intégrés | Non | Uniquement en base, chiffrées |
| Comptes, emails, double authentification, parrainages, récompenses, analytique | Non | Uniquement en base |
| Badges POAP | Rien à reconstruire | Lus directement sur la chaîne |

La reconstruction ne remplace donc pas les sauvegardes : elle les complète. Le plan de sauvegarde est sur la page [Performance et sauvegardes](performance-sauvegardes.md#sauvegardes).

## Principe

L'indexeur part du bloc `lastBlock + 1` de la ligne `ChainCursor` d'identifiant `BlockLucky`, ou de `CHAIN_START_BLOCK` si cette ligne n'existe pas. Remettre le curseur juste avant le bloc de déploiement fait relire tous les événements du contrat, dans l'ordre, par tranches de 2 000 blocs.

Comme le traitement est [idempotent](../integration-blockchain/indexeur.md#idempotence), relire un événement déjà indexé ne crée rien. Deux variantes existent donc :

| Variante | Quand | Effet |
|---|---|---|
| **Rattrapage** : curseur remis en arrière, données conservées | Tickets manquants, curseur avancé par erreur, doute sur la complétude | Seuls les tickets absents sont créés ; tours mis à jour |
| **Reconstruction complète** : tickets et tours supprimés, curseur remis en arrière | Projection corrompue, tours incohérents | Tours et tickets recréés à partir de zéro, avec les effets secondaires décrits plus bas |

## Bloc de déploiement

Le bloc de déploiement est enregistré par le script de déploiement dans `smart-contract/deployments/<réseau>.json`, champ `deploymentBlock`. Pour le nœud local, `smart-contract/deployments/localhost.json` indique le bloc 1. Pour Sepolia, voir [Déploiement sur Sepolia](../smart-contracts/sepolia.md).

Le constructeur du contrat ouvre le premier tour : son événement `RoundOpened` est dans le bloc de la transaction de déploiement. Il faut le relire. Les deux scripts ne relèvent pas `deploymentBlock` au même moment :

| Script | Moment du relevé par `getBlockNumber()` | Conséquence |
|---|---|---|
| `deploy-local.ts` | Après le déploiement du coordinateur VRF simulé, **avant** celui de la loterie | Partir de `deploymentBlock` relit le déploiement de la loterie |
| `deploy-sepolia.ts` | **Après** `waitForDeployment()` de la loterie | Égal au bloc de déploiement, ou postérieur si un bloc a été produit entre-temps |

Sur Sepolia, il est plus sûr de prendre le bloc de la transaction de création du contrat, affiché par l'explorateur, plutôt que `deploymentBlock`. Le curseur doit valoir ce bloc moins un.

## Procédure

### 1. Arrêter les indexeurs

Arrêter l'API et le worker, pour qu'aucun indexeur n'avance le curseur pendant l'opération. Avec Docker Compose :

```bash
docker compose stop backend worker
```

### 2. Sauvegarder

```bash
docker compose exec -T postgres pg_dump -U etherbay_admin -d blocklucky_db -Fc > avant-reconstruction.dump
```

### 3. Remettre le curseur

Rattrapage, données conservées :

```sql
UPDATE "ChainCursor" SET "lastBlock" = 0 WHERE "id" = 'BlockLucky';
```

`0` correspond au nœud local (`deploymentBlock` 1). Une autre façon de faire est de supprimer la ligne et de régler `CHAIN_START_BLOCK` sur le bloc de déploiement :

```sql
DELETE FROM "ChainCursor" WHERE "id" = 'BlockLucky';
```

Reconstruction complète : supprimer d'abord les tickets puis les tours (la clé étrangère `Ticket_lotteryId_fkey` interdit l'ordre inverse), puis le curseur, dans une même transaction :

```sql
BEGIN;
DELETE FROM "Ticket";
DELETE FROM "LotteryRound";
DELETE FROM "ChainCursor" WHERE "id" = 'BlockLucky';
COMMIT;
```

Ces requêtes se lancent avec `docker compose exec -T postgres psql -U etherbay_admin -d blocklucky_db`.

### 4. Relancer l'indexation sans clients connectés

Démarrer d'abord le worker seul, l'API restant arrêtée :

```bash
docker compose start worker
docker compose logs -f worker
```

Pendant la relecture, chaque `WinnerPicked` historique émet de nouveau `draw:winner`. Le worker publie ces événements sur Redis ; si aucune API n'est démarrée, personne ne les reçoit, ce qui est le but : les citoyens connectés ne voient pas réapparaître les gagnants des tours passés.

La progression se suit avec :

```sql
SELECT "lastBlock", "updatedAt" FROM "ChainCursor";
```

Avec les réglages par défaut (`INDEXER_INTERVAL_MS` 3 000, tranche de 2 000 blocs), le rattrapage avance d'environ 2 000 blocs toutes les 3 s.

### 5. Redémarrer l'API

Quand `lastBlock` a rejoint la tête de chaîne :

```bash
docker compose start backend
```

### 6. Contrôler

Le nombre de tickets d'un tour en base doit être égal au `ticketCount` du contrat :

```sql
SELECT r."contractRoundId", r."status", count(t."id") AS tickets
FROM "LotteryRound" r LEFT JOIN "Ticket" t ON t."lotteryId" = r."id"
GROUP BY r."id" ORDER BY r."contractRoundId";
```

La valeur de comparaison se lit par `getRound(id)` sur le contrat, par exemple depuis Remix ou l'explorateur (voir [Exploitation des contrats](../smart-contracts/exploitation.md)).

## Effets secondaires de la relecture

| Événement relu | Effet secondaire | Conséquence |
|---|---|---|
| `TicketsPurchased` d'un ticket absent | Points crédités, `points:awarded` émis, job `MINT_BADGE` | Le badge existe déjà : le job se termine sur `BadgeAlreadyMinted` |
| `TicketsPurchased` d'un ticket présent | Aucun | |
| `WinnerPicked` | `draw:winner` émis, job `CLAIM_PRIZE` | Le job se termine sur `PrizeAlreadyClaimed` si la cagnotte a été versée ; **il la verse** sinon |
| `RoundCancelled` | Un job `CLAIM_REFUND` par payeur | Se termine sur `NothingToRefund` si déjà remboursé ; **rembourse** sinon |

Les deux derniers cas sont souhaitables : une reconstruction termine aussi les versements et remboursements restés en suspens.

## Limites

### Points

Les EtherPoints ne sont **pas** reconstruits par la chaîne, pour deux raisons.

D'abord, seuls les points liés aux tickets (`TICKET_PURCHASE`, `GIFT_TICKET`) dérivent d'événements du contrat. Les points de bienvenue, de parrainage (`REFERRAL`), de quêtes (`SOCIAL_QUEST`), les bonus d'administration et les débits d'échange de récompenses (`REWARD_CLAIM`) n'existent qu'en base.

Ensuite, la table `PointTransaction` et la colonne `pointsBalance` ne sont pas touchées par la suppression des tickets. Lors d'une **reconstruction complète**, chaque ticket recréé crédite à nouveau ses points : 50 par ticket au bénéficiaire, 75 au payeur d'un cadeau. Les citoyens sont alors crédités deux fois.

Pour éviter ce double crédit, il faut, dans la transaction de suppression, retirer aussi les mouvements liés aux tickets et recalculer les soldes :

```sql
DELETE FROM "PointTransaction" WHERE "actionType" IN ('TICKET_PURCHASE', 'GIFT_TICKET');
UPDATE "User" u SET "pointsBalance" = COALESCE((SELECT sum(p."amount") FROM "PointTransaction" p WHERE p."userId" = u."id"), 0);
```

Cette correction suppose que le solde de chaque compte était égal à la somme de ses mouvements, ce qui est faux pour les comptes du [seed](seed.md), et elle échoue sur la contrainte `User_pointsBalance_non_negative` si un citoyen a déjà dépensé des points gagnés par des tickets. Elle est aussi faussée en mode simulé, où les tickets créditent leurs points sous ces mêmes types. Elle doit donc être validée sur une copie de la base avant d'être appliquée.

Dans la variante **rattrapage**, ce problème n'existe pas : les tickets présents ne recréditent rien. En revanche, un ticket dont les points n'avaient jamais été crédités (arrêt du process entre l'écriture des tickets et le crédit) ne sera pas corrigé, puisqu'il est présent.

### Cadeaux

La chaîne conserve le payeur et le bénéficiaire de chaque ticket : un cadeau reste reconnaissable (`payerWallet` différent de l'adresse du bénéficiaire). Mais :

- les 75 points de l'expéditeur ne sont crédités que si l'adresse du payeur correspond à un compte au moment de la relecture ;
- le lien entre le cadeau et l'**email** du destinataire n'est pas sur la chaîne. Si le compte destinataire a été perdu, l'indexeur recrée un compte anonyme pour son adresse, sans email ni clé privée : le destinataire ne peut plus s'y connecter ;
- le parrainage créé lors du cadeau (l'expéditeur devient parrain du nouveau compte) n'est pas reconstruit.

### Comptes et portefeuilles

Les clés privées des portefeuilles intégrés n'existent que dans `User.walletEncryptedKey`. Si la table `User` est perdue sans sauvegarde, les comptes recréés par l'indexeur n'ont pas de clé : les ethers fictifs de ces portefeuilles sont inaccessibles, et les versements ou remboursements automatiques ne peuvent plus être signés. La reconstruction ne s'applique donc qu'aux tables de la loterie, sur une base dont les comptes ont été conservés ou restaurés.

### Cagnotte collectée

`prizePool` est incrémenté à chaque `TicketsPurchased`. Il n'est juste que si le tour a été créé à 0 par son `RoundOpened`. Si le curseur part après le bloc d'ouverture d'un tour, le tour est créé par `ensureRound` avec le `totalCollected` actuel du contrat, puis les achats relus s'y ajoutent : la cagnotte du tour est comptée en double. D'où l'importance de partir du bloc de déploiement. Pour le tour courant, `GET /lottery/status` réécrit de toute façon `prizePool` depuis le contrat.

### Statut des tours anciens

`ensureRound` crée un tour inconnu avec l'état actuel du contrat, pas son état au bloc relu. Les événements suivants corrigent le statut dans l'ordre. L'état final est juste ; seuls les états intermédiaires pendant la relecture peuvent être anachroniques.

### Chaîne réinitialisée

La reconstruction suppose que la chaîne existe encore. Le nœud Hardhat local perd tout son état à chaque redémarrage du conteneur `blockchain` : il n'y a alors rien à relire. L'indexeur le signale (« Le curseur d'indexation … dépasse la tête de chaîne ») et la seule issue est de réinitialiser la base (`npm run prisma:reset`). Voir [Détection d'une chaîne réinitialisée](../integration-blockchain/indexeur.md#detection-d-une-chaine-reinitialisee).

### Tickets simulés

Les tickets créés en mode simulé n'ont pas de `ticketIndex` et ne correspondent à rien sur la chaîne. La variante rattrapage les laisse en place ; seule la reconstruction complète les supprime.
