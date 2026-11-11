# Seed

Le script [`backend/prisma/seed.ts`](src:backend/prisma/seed.ts) peuple une base vide avec des comptes de démonstration, un tour de loterie et deux commerces partenaires. Il sert au développement et aux démonstrations. Il ne doit pas être lancé sur une base de production.

## Lancer le seed

Depuis `backend/`, sur une base déjà migrée :

```bash
npm run prisma:seed
```

Le script npm exécute `tsx prisma/seed.ts`. Le script importe le client de [`backend/src/config/prisma.config.ts`](src:backend/src/config/prisma.config.ts), donc la configuration complète de l'application : `DATABASE_URL` et toutes les variables validées par `env.config.ts` sont lues depuis `backend/.env`.

> [!NOTE]
> [`backend/package.json`](src:backend/package.json) déclare aussi `"prisma": { "seed": "tsx prisma/seed.ts" }`. Prisma 7 ne lit plus cette clé : il cherche la commande de seed dans `migrations.seed` du fichier [`backend/prisma.config.ts`](src:backend/prisma.config.ts), qui n'en déclare pas. `npx prisma db seed` répond donc « No seed command configured », et `npm run prisma:reset` ne relance pas le seed. Seul `npm run prisma:seed` fonctionne.

## Ce que crée le seed

### Comptes

Les trois comptes sont créés par `upsert` sur `walletAddress` : relancer le seed ne les duplique pas et ne modifie pas un compte existant (`update: {}`).

| Email | Rôle | `walletAddress` | EtherPoints | Particularité |
|---|---|---|---|---|
| `maire@etherbay.fr` | `ADMIN` | `0xadmin0000000000000000000000000000etherbay` | 1 000 | |
| `boulangerie@etherbay.fr` | `PARTNER` | `0xpartner00000000000000000000000000etherbay` | 500 | Gestionnaire des deux commerces |
| `citoyen@etherbay.fr` | `USER` | `0xcitizen00000000000000000000000000etherbay` | 250 | Parrainé par le compte administrateur |

Les trois comptes ont `isEmailVerified` à vrai, la double authentification désactivée, et un `referralCode` généré par défaut.

Points d'attention :

- **Adresses factices** : ces valeurs contiennent des lettres hors de l'alphabet hexadécimal ; ce ne sont pas des adresses Ethereum. Elles ne servent qu'à satisfaire l'unicité de la colonne.
- **Pas de portefeuille intégré** : `walletEncryptedKey` est vide. En mode onchain, le premier achat ou la première consultation de `GET /lottery/wallet` crée un portefeuille et **remplace** `walletAddress` par la nouvelle adresse (voir [Portefeuilles intégrés](../integration-blockchain/portefeuilles.md#creation-a-la-demande-ensurewallet)). Après cela, relancer le seed tente de recréer le compte avec l'adresse factice et échoue sur l'unicité de l'email, déjà pris par le compte modifié.
- **Soldes sans historique** : `pointsBalance` est écrit directement, sans ligne `PointTransaction`. La règle « le solde est la somme des mouvements » n'est pas respectée pour ces comptes ; l'historique des points affiché pour eux est vide alors que le solde ne l'est pas.
- **Pas de mot de passe** : la connexion se fait par email et code à usage unique (voir [Comptes et connexion](../demarrage/comptes-et-connexion.md)). Avec `LOGIN_EMAIL_CODE_REQUIRED` actif, le code arrive dans Mailpit (`http://localhost:8025`).
- **Double authentification administrateur** : avec `ADMIN_MFA_REQUIRED` actif (valeur par défaut), les routes d'administration exigent que `maire@etherbay.fr` configure d'abord une double authentification.

### Tour de loterie

`upsert` sur `contractRoundId` à 1 :

| Colonne | Valeur |
|---|---|
| `contractRoundId` | 1 |
| `status` | `OPEN` |
| `prizePool` | 12,5 |
| autres colonnes | valeurs par défaut (`startedAt` à la date du seed, colonnes onchain vides) |

Ce tour n'a aucun ticket : la cagnotte de 12,5 ETH est une valeur d'affichage pour le mode simulé.

En mode onchain, ce tour est en conflit avec la chaîne : le tour 1 du contrat existe aussi, ouvert au déploiement. Tant que le tour 1 est le tour courant du contrat, chaque `GET /lottery/status` appelle `upsertRoundFromChain`, qui réécrit le statut, la cagnotte, le prix, la date de fin et le gagnant à partir du contrat. La cagnotte de 12,5 disparaît alors ; `startedAt` garde la date du seed. L'indexeur, lui, n'écrase pas `prizePool` lors de `RoundOpened` pour un tour existant ; il l'incrémente à chaque achat.

### Commerces et récompenses

Les deux commerces sont créés par `create`, avec leurs offres en écriture imbriquée. Leur gestionnaire (`ownerId`) est le compte `boulangerie@etherbay.fr`.

| Commerce | Logo | Offre | Coût | Stock total | Stock restant |
|---|---|---|---|---|---|
| La Boulangerie du Port d'EtherBay | `https://assets.etherbay.fr/partners/boulangerie.png` | -15% sur les viennoiseries et pains spéciaux | 100 | 100 | 95 |
| | | Une Galette des Rois offerte pour 2 achetées | 200 | 50 | 50 |
| Cinéma Le Phare EtherBay | `https://assets.etherbay.fr/partners/cinema.png` | 1 Place de Cinéma achetée = 1 Place offerte | 150 | 200 | 180 |

> [!WARNING]
> Contrairement aux comptes et au tour, les commerces ne sont pas créés par `upsert`. **Chaque exécution du seed ajoute deux nouveaux commerces et trois nouvelles offres**, en doublon des précédents. Pour repartir d'un état propre, réinitialiser la base (`npm run prisma:reset`) puis relancer le seed.

Les stocks restants inférieurs aux stocks totaux (95 sur 100, 180 sur 200) simulent des échanges passés, mais aucune ligne `ClaimedReward` correspondante n'est créée. Les URL de logos pointent vers un domaine qui n'est pas servi par le dépôt.

### Ce que le seed ne crée pas

- aucun ticket, aucun mouvement d'EtherPoints, aucune récompense échangée ;
- aucune ligne `ChainCursor` : l'indexeur part de `CHAIN_START_BLOCK` ;
- aucune donnée Redis (limites de jeu responsable, lots de codes promo) ;
- aucune donnée sur la chaîne : les contrats et le premier tour on-chain sont créés par le script de déploiement de `smart-contract/` (voir [Blockchain locale](../smart-contracts/blockchain-locale.md)).

## Sortie

En fin d'exécution, le script affiche les emails des trois comptes, le numéro du tour et le nom des deux commerces, puis ferme la connexion Prisma. En cas d'échec, l'erreur est affichée et le process sort avec le code 1.

```text
Début du seeding BlockLucky — Ville d'EtherBay...
Seeding terminé avec succès : {
  admin: 'maire@etherbay.fr',
  partnerUser: 'boulangerie@etherbay.fr',
  citizen: 'citoyen@etherbay.fr',
  activeRoundId: 1,
  partners: [ "La Boulangerie du Port d'EtherBay", 'Cinéma Le Phare EtherBay' ]
}
```
