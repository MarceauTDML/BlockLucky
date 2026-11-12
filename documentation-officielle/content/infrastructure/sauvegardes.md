# Sauvegardes et reprise

Cette page dit quelles données sauvegarder, avec quels objectifs de perte et de reprise, et comment sauvegarder, tester et restaurer. Les aspects de performance de la base sont traités dans [Performance et sauvegardes](../base-de-donnees/performance-sauvegardes.md).

> [!NOTE]
> Aucune sauvegarde automatique n'est en place dans le dépôt ni sur la VM de démonstration. Les procédures ci-dessous sont manuelles. Elles suffisent pour une démonstration ; une exploitation réelle demanderait une tâche planifiée, un stockage hors de la machine et une alerte en cas d'échec.

## Ce qui doit être sauvegardé

| Donnée | Où | Source de vérité | Perte si elle disparaît |
| --- | --- | --- | --- |
| Comptes, emails, rôles, 2FA, EtherPoints, récompenses, partenaires, journal d'administration | PostgreSQL, volume `pgdata` | PostgreSQL | définitive |
| Clés privées chiffrées des portefeuilles intégrés | PostgreSQL, colonne `User.walletEncryptedKey` | PostgreSQL | définitive : les ethers et tickets de ces adresses deviennent inaccessibles |
| Tours, tickets, gagnants, cagnottes | PostgreSQL, tables `LotteryRound` et `Ticket` | smart contract | aucune : reconstruits par l'indexeur |
| Codes promotionnels importés par les partenaires (`partner:codes:*`), préférences et quêtes (`user:prefs:*`, `user:quests:*`) | Redis, volume `redisdata` | Redis | définitive : ces données n'existent pas en base |
| Révocation des sessions (`auth:revoked:*`, `auth:revoked-before:*`) | Redis | Redis | les sessions révoquées redeviennent valides jusqu'à l'expiration de leur JWT (12 h par défaut) |
| Files de jobs, verrous, idempotence, rate limiting, défis OTP | Redis | Redis | jobs en attente perdus ; le reste se reconstitue |
| Secrets (`JWT_SECRET`, `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY`, `WEBHOOK_SECRET`, `METRICS_TOKEN`) | fichier `.env` racine | ce fichier | `ENCRYPTION_KEY` : toutes les clés de portefeuille et secrets TOTP deviennent indéchiffrables |
| État de la chaîne locale | mémoire du conteneur `blockchain` | aucune | tout est perdu à chaque redémarrage, voir [Runbooks blockchain](runbooks-blockchain.md#chaine-locale-reinitialisee) |
| État de la chaîne Sepolia | réseau Sepolia | la chaîne | aucune, la chaîne est répliquée par tous ses nœuds |

> [!CAUTION]
> Une sauvegarde de la base sans `ENCRYPTION_KEY` est inutilisable pour les portefeuilles. Inversement, la clé et la base réunies donnent accès à tous les portefeuilles : elles se conservent séparément, et chacune chiffrée. Voir [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

## Objectifs de perte et de reprise

Le RPO (Recovery Point Objective) est la quantité maximale de données qu'on accepte de perdre, exprimée en durée. Le RTO (Recovery Time Objective) est la durée maximale acceptable pour revenir en service.

| Donnée | RPO cible | RTO cible | Mécanisme |
| --- | --- | --- | --- |
| PostgreSQL | 24 h | 1 h | `pg_dump` quotidien, à planifier |
| Redis | 1 s | 15 min | AOF `appendfsync everysec` sur le volume `redisdata` |
| Données on-chain en base | 0 | durée de réindexation | indexeur idempotent sur `(tour, numéro de ticket)` |
| Secrets | 0 | 15 min | copie chiffrée hors de la machine, faite à leur création |

Le RPO de Redis ne protège que d'un crash du processus : si le volume `redisdata` est perdu, tout Redis l'est. Redis porte des données de référence que PostgreSQL n'a pas (codes partenaires, préférences, quêtes) et la file `ledger-queue`, dont un job en attente est un mouvement d'EtherPoints non encore écrit. Il doit donc être sauvegardé comme la base.

## Sauvegarder PostgreSQL

Sauvegarde logique au format personnalisé de `pg_dump` (compressé, restaurable table par table) :

```bash
docker compose exec -T postgres pg_dump -U etherbay_admin -d blocklucky_db -Fc > backup-$(date +%Y%m%d-%H%M).dump
```

L'option `-T` désactive l'allocation d'un pseudo-terminal : sans elle, le flux binaire serait altéré. La sauvegarde se fait à chaud, sans arrêter l'API : `pg_dump` lit un instantané cohérent de la base.

Le fichier contient des données personnelles (emails) et les clés de portefeuille chiffrées. Avant de le sortir de la machine, le chiffrer, par exemple :

```bash
gpg --symmetric --cipher-algo AES256 backup-AAAAMMJJ-HHMM.dump
```

### Planifier

Une ligne de `crontab` du compte `etherbay` suffirait sur la VM, en adaptant le chemin du clone et le dossier de destination :

```text
15 3 * * * cd /chemin/du/clone && docker compose exec -T postgres pg_dump -U etherbay_admin -d blocklucky_db -Fc > /chemin/des/sauvegardes/backup-$(date +\%Y\%m\%d).dump
```

Dans une `crontab`, le caractère `%` doit être échappé. Prévoir une rotation des fichiers et une copie hors de la VM : une sauvegarde sur le même disque ne protège pas contre la perte de la machine.

### Durée de conservation

Les sauvegardes contiennent les comptes supprimés au titre du RGPD jusqu'à leur expiration. Leur durée de conservation doit être bornée et inscrite au registre des traitements (voir [Registre des traitements](../juridique/registre-traitements.md)). Une restauration doit rejouer les suppressions RGPD intervenues après la date de la sauvegarde.

## Tester une restauration

Une sauvegarde jamais restaurée n'est pas une sauvegarde. Le test se fait dans une base temporaire, sans toucher à `blocklucky_db` :

```bash
docker compose exec -T postgres createdb -U etherbay_admin blocklucky_restore_test
```

```bash
docker compose exec -T postgres pg_restore -U etherbay_admin -d blocklucky_restore_test --no-owner < backup-AAAAMMJJ-HHMM.dump
```

```bash
docker compose exec -T postgres psql -U etherbay_admin -d blocklucky_restore_test -c 'SELECT count(*) FROM "User";'
```

```bash
docker compose exec -T postgres psql -U etherbay_admin -d blocklucky_restore_test -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 3;'
```

```bash
docker compose exec -T postgres dropdb -U etherbay_admin blocklucky_restore_test
```

Le test est réussi si le nombre de comptes est plausible et si la dernière migration correspond à celle du code déployé. Mesurer la durée de l'opération : elle donne une estimation réaliste du RTO.

## Restaurer en production

La restauration réelle est destructive : elle remplace le contenu de `blocklucky_db`.

1. Arrêter l'API et le worker, pour qu'aucune écriture n'ait lieu pendant l'opération :

   ```bash
   docker compose --profile app stop backend worker
   ```

2. Faire une sauvegarde de l'état actuel, même dégradé : elle peut servir à récupérer des données postérieures au dump.
3. Restaurer :

   ```bash
   docker compose exec -T postgres pg_restore -U etherbay_admin -d blocklucky_db --clean --if-exists --no-owner < backup-AAAAMMJJ-HHMM.dump
   ```

4. Si le code déployé est plus récent que la sauvegarde, appliquer les migrations manquantes :

   ```bash
   docker compose --profile app run --rm migrate
   ```

5. Redémarrer :

   ```bash
   docker compose --profile app start backend worker
   ```

6. Vérifier `/health/ready`, puis les journaux du worker : l'indexeur reprend depuis le curseur de la sauvegarde et rattrape les événements de la chaîne survenus depuis.

### Cohérence avec la chaîne

La base restaurée a un curseur d'indexation plus ancien que la chaîne. Sur Sepolia, c'est sans risque : l'indexeur relit les événements manquants et l'idempotence sur `(tour, numéro de ticket)` évite les doublons. Les achats faits après la sauvegarde réapparaissent, avec leurs EtherPoints.

Sur la chaîne locale, en revanche, la restauration n'a de sens que si le nœud Hardhat n'a pas redémarré depuis la sauvegarde. Restaurer une base sur une chaîne neuve reproduit l'incident de chaîne réinitialisée.

Les comptes créés après la sauvegarde sont perdus, avec leur portefeuille intégré. Si ces portefeuilles ont reçu des ethers ou des tickets, ces fonds restent sur la chaîne mais leur clé n'existe plus nulle part.

## Sauvegarder Redis

Redis contient des données sans copie en base (voir le premier tableau). Le sauvegarder au même rythme que PostgreSQL, et systématiquement avant une opération risquée (mise à jour de Redis, migration de VM). Le plus simple est de copier le volume :

```bash
docker run --rm -v blocklucky_redisdata:/data:ro -v "$PWD":/backup alpine tar czf /backup/redis-data.tgz -C /data .
```

Le nom du volume est préfixé par le nom du projet Compose (`blocklucky`). Le vérifier avec `docker volume ls`. Pour une copie cohérente, arrêter Redis le temps de la copie (`docker compose stop redis`), puis le redémarrer ainsi que l'API et le worker, qui ne se reconnectent pas seuls (voir [Runbooks](runbooks.md#redis-indisponible)).

## Reconstruire la base depuis la chaîne

Si les tables on-chain sont corrompues mais que les comptes sont intacts, il n'est pas nécessaire de restaurer : l'indexeur peut tout relire. Supprimer la ligne du curseur (`DELETE FROM "ChainCursor";`) fait repartir l'indexation de `CHAIN_START_BLOCK`. Comme les tickets existants sont reconnus et ignorés, il faut d'abord vider `Ticket` et `LotteryRound` pour obtenir une projection neuve. La procédure complète, ses limites et la place des EtherPoints sont dans [Reconstruire depuis la chaîne](../base-de-donnees/reconstruction.md).

## Perte de la VM de démonstration

| Élément | Reprise |
| --- | --- |
| Code | clone du dépôt GitHub |
| Configuration | fichier de surcharge et `.env`, à partir de leurs copies hors VM |
| Base | dernier dump |
| Chaîne | nœud Hardhat neuf : l'option A de la procédure de chaîne réinitialisée s'applique |
| Caddy | Caddyfile de `/opt/edge`, à recréer ; les certificats sont redemandés à Let's Encrypt |
| DNS | mise à jour des enregistrements chez get.tech vers la nouvelle adresse IP |

La procédure de construction de la VM est décrite dans [Déploiement sur etherbay.tech](deploiement-etherbay.md).
