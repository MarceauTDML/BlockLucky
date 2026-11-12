# Boutique et récompenses

Le module `marketplace` permet aux citoyens de dépenser leurs EtherPoints contre des récompenses proposées par les commerçants partenaires, soit en choisissant une offre, soit en achetant un ticket à gratter qui en tire une au hasard, puis aux commerçants de valider en magasin le code obtenu. Les EtherPoints sont des points de fidélité stockés uniquement en base : ils ne circulent pas sur la blockchain. Les offres et les lots de codes sont créés par le module [Partenaires](partenaires.md).

| Fichier | Contenu |
|---|---|
| [`backend/src/api/marketplace/marketplace.routes.ts`](src:backend/src/api/marketplace/marketplace.routes.ts) | 7 routes |
| [`backend/src/api/marketplace/marketplace.validators.ts`](src:backend/src/api/marketplace/marketplace.validators.ts) | 3 schémas Zod |
| [`backend/src/api/marketplace/marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) | Catalogue, échange, ticket à gratter, validation en magasin |
| [`backend/src/api/marketplace/marketplace.repo.ts`](src:backend/src/api/marketplace/marketplace.repo.ts) | `RewardCatalog`, `ClaimedReward` |
| [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts) | Débit des points et historique |

Le parcours est décrit dans [Échange de récompense](../../architecture/flux/recompense.md).

## Routes

| Méthode et chemin | Accès | Middlewares | Rôle |
|---|---|---|---|
| `GET /api/v1/marketplace/catalog` | public | aucun | Offres actives des partenaires actifs |
| `GET /api/v1/marketplace/rewards/:id` | public | aucun | Détail d'une offre |
| `GET /api/v1/marketplace/points` | connecté | `authenticate` | Solde et 50 derniers mouvements |
| `POST /api/v1/marketplace/claim` | connecté, âge vérifié | `authenticate`, `requireAgeVerification`, `idempotency`, `validate(claimRewardSchema)` | Échange de points contre un code |
| `POST /api/v1/marketplace/scratch` | connecté, âge vérifié | `authenticate`, `requireAgeVerification`, `idempotency`, `validate(scratchTicketSchema)` | Achat d'un ticket à gratter |
| `GET /api/v1/marketplace/my-codes` | connecté | `authenticate` | Codes obtenus, avec QR code |
| `POST /api/v1/marketplace/redeem` | PARTNER, ADMIN | `authenticate`, `requireRoles('PARTNER', 'ADMIN')`, `validate(usePromoCodeSchema)` | Validation d'un code en magasin |

## Sources des EtherPoints

Le solde `User.pointsBalance` bouge par [`ledgerService`](../services.md#ledgerservice), qui écrit en même temps une ligne `PointTransaction`, sauf pour le ticket à gratter, dont la transaction écrit le débit et sa ligne directement. Une contrainte `CHECK ("pointsBalance" >= 0)` interdit un solde négatif en base.

| Type de mouvement | Montant | Déclencheur |
|---|---|---|
| `SOCIAL_QUEST` | +25 | création du compte |
| `REFERRAL` | +100 au parrain, +50 au filleul | création d'un compte avec code de parrainage |
| `TICKET_PURCHASE` | +50 par ticket | achat (indexeur en onchain, service loterie en simulé) |
| `GIFT_TICKET` | +75 par ticket offert | cadeau, crédité à l'acheteur |
| `SOCIAL_QUEST` | +20 à +40 | [quêtes sociales](utilisateur.md#quetes-sociales) |
| `REWARD_CLAIM` | moins le coût de l'offre | échange dans la boutique |
| `REWARD_CLAIM` | moins le prix du ticket à gratter | ticket à gratter |

Le type `ADMIN_BONUS` existe dans `LedgerActionType` mais aucune route ne l'utilise.

## GET /marketplace/catalog

Renvoie les offres `isActive` dont le partenaire est `isActive`, triées par coût croissant.

```json
{
  "success": true,
  "message": "Catalogue des récompenses partenaires récupéré",
  "data": {
    "catalog": [
      {
        "id": "019a7c50-1d3e-7b8a-9c0f-2e4d6a8b0c13",
        "title": "-15% sur les viennoiseries et pains spéciaux",
        "costInPoints": 100,
        "totalStock": 100,
        "remainingStock": 97,
        "stockPercentage": 97,
        "isActive": true,
        "partner": { "id": "019a7c4f-...", "name": "La Boulangerie du Port d'EtherBay", "logoUrl": "https://assets.etherbay.fr/partners/default.png" }
      }
    ]
  }
}
```

`stockPercentage` vaut `round(remainingStock / totalStock x 100)`, ou 0 si le stock total est nul.

## GET /marketplace/rewards/:id

Renvoie l'offre complète avec son partenaire (toutes les colonnes de `Partner`, dont `ownerId`), `stockPercentage` et `claimedCount` (nombre de codes déjà obtenus). Une offre inexistante renvoie `404 Récompense introuvable dans le catalogue`. Une offre désactivée, ou dont le partenaire est suspendu, reste lisible par cette route.

## GET /marketplace/points

```json
{
  "success": true,
  "message": "Solde et historique d'EtherPoints récupérés",
  "data": {
    "balance": 125,
    "history": [
      { "id": "019a7c45-...", "userId": "019a7c3e-...", "amount": 100, "actionType": "TICKET_PURCHASE", "description": "Achat de 2 ticket(s) sur le tour #1", "createdAt": "2026-11-11T13:41:02.512Z" },
      { "id": "019a7c3e-...", "userId": "019a7c3e-...", "amount": 25, "actionType": "SOCIAL_QUEST", "description": "Bonus de bienvenue Onboarding EtherBay", "createdAt": "2026-11-11T13:30:11.204Z" }
    ]
  }
}
```

L'historique est limité aux 50 mouvements les plus récents, sans pagination. Les débits ont un `amount` négatif.

## POST /marketplace/claim

### Corps

| Champ | Type | Règles |
|---|---|---|
| `rewardId` | UUID | obligatoire, message `Identifiant de récompense invalide` |

### Règles

1. L'âge du compte doit être vérifié, sinon `403 AGE_VERIFICATION_REQUIRED` (voir [Utilisateur](utilisateur.md#controle-a-l-achat)).
2. L'offre doit exister et être active : sinon `404 Cette offre n'est plus disponible`. L'état du partenaire n'est pas contrôlé ici.
3. Le stock restant doit être positif : sinon `400 Stock épuisé pour cette récompense partenaire`.
4. Le solde doit couvrir le coût : sinon `400 EtherPoints insuffisants (80 disponibles, 100 requis)`.
5. Les points sont débités par `ledgerService.debitPoints` (`REWARD_CLAIM`, description `Échange récompense : <titre> (<partenaire>)`).
6. Le code est pris en tête du lot importé par le partenaire (clé Redis `partner:codes:<rewardId>`). Si le lot est vide ou absent, un code est généré : préfixe tiré des quatre premiers caractères du nom du partenaire en majuscules, chaque caractère qui n'est pas une lettre de A à Z étant remplacé par `EBAY`, puis un tiret et 12 caractères hexadécimaux. « La Boulangerie… » donne par exemple `LAEBAYB-3F9A1C07B2DE`.
7. Le stock est décrémenté et le `ClaimedReward` créé dans une même transaction.
8. Un QR code PNG en data URL encode `{ claimId, uniqueCode, partner }`.
9. Un email `reward-claim` est envoyé si le compte a une adresse.

```json
{
  "success": true,
  "message": "Récompense débloquée ! Grattez votre carte virtuelle.",
  "data": {
    "claim": {
      "id": "019a7c52-6f0a-7c1d-8e2b-4a6c8e0f2d15",
      "uniqueCode": "BOUL-2026-0007",
      "isUsed": false,
      "claimedAt": "2026-11-11T14:02:44.019Z",
      "rewardTitle": "-15% sur les viennoiseries et pains spéciaux",
      "partnerName": "La Boulangerie du Port d'EtherBay",
      "partnerLogo": "https://assets.etherbay.fr/partners/default.png",
      "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgo...",
      "scratchCardReady": true
    },
    "remainingStock": 96,
    "newPointsBalance": 25
  }
}
```

`scratchCardReady` est une constante `true` : la carte à gratter est une animation du client, le code est attribué dès cette réponse.

> [!WARNING]
> Le débit des points et la décrémentation du stock sont deux transactions distinctes. Si la seconde échoue (stock passé à zéro entre la vérification et l'écriture, ce que la contrainte `CHECK` transforme en `409 L'opération viole une règle d'intégrité des données`), les points sont déjà débités et ne sont pas recrédités. Le code tiré du lot Redis est lui aussi perdu. Utiliser `Idempotency-Key` évite le cas du double clic, pas celui de deux citoyens sur la dernière unité.

### Effets de bord

| Effet | Détail |
|---|---|
| `PointTransaction` | ligne négative `REWARD_CLAIM` |
| `RewardCatalog.remainingStock` | moins 1 |
| `ClaimedReward` | nouvelle ligne, `uniqueCode` unique |
| Redis | retrait du premier code du lot `partner:codes:<rewardId>` |
| Email | gabarit `reward-claim` avec `REWARD_TITLE`, `PARTNER_NAME`, `PROMO_CODE` |
| Métrique | `business_events_total{event="reward_claimed"}` et `points_debited_reward_claim` |

## POST /marketplace/scratch

Le ticket à gratter est acheté en EtherPoints et attribue au hasard une récompense partenaire en stock. L'application mobile révèle ensuite le code en grattant l'écran.

| Champ | Type | Règles |
|---|---|---|
| `offer` | énumération | `violet` ou `lucky`, sinon `400 Offre de ticket à gratter inconnue (violet ou lucky)` |

| Offre | Prix | Variable |
|---|---|---|
| `violet` | 50 EtherPoints par défaut | `SCRATCH_COST_VIOLET` |
| `lucky` | 100 EtherPoints par défaut | `SCRATCH_COST_LUCKY` |

### Règles

1. L'âge du compte doit être vérifié (`403 AGE_VERIFICATION_REQUIRED`).
2. Les récompenses candidates sont les offres actives, dont le stock restant est positif et dont le partenaire est actif. S'il n'y en a aucune : `404 Aucune récompense n'est disponible pour le moment dans les tickets à gratter.`
3. Un solde inférieur au prix renvoie `402 EtherPoints insuffisants pour ce ticket à gratter (30 disponibles, 50 requis).`, avec `errors: { "code": "INSUFFICIENT_POINTS", "balance", "cost" }`.
4. Le tirage se fait par `crypto.randomInt` parmi les offres dont le coût en points est au moins égal au prix du ticket, ou parmi toutes les candidates si aucune n'atteint ce prix. Chaque offre a la même chance, quel que soit son stock.
5. Le code est obtenu comme pour `claim` : lot du partenaire, sinon code généré. Il est pris dans le lot avant la transaction : si la transaction échoue, ce code est perdu.
6. Une transaction débite le prix seulement si le solde le couvre encore, réserve une unité de stock, crée le `ClaimedReward` et écrit la ligne `PointTransaction` (`REWARD_CLAIM`, description `Ticket à gratter <offre> : <titre> (<partenaire>)`). Un solde devenu insuffisant entre-temps renvoie 402 ; un stock épuisé entre-temps renvoie `409 Cette récompense vient d’être épuisée, veuillez réessayer.` et annule le débit.
7. Le QR code et l'email `reward-claim` sont produits comme pour `claim`, puis la métrique `business_events_total{event="scratch_ticket_bought"}` est incrémentée.

La réponse, en 201, contient `offer`, l'objet `claim` (même forme que pour `claim`, avec `scratchCardReady: true`), `remainingStock`, `pointsSpent` et le nouveau solde, présent deux fois sous `newBalance` et `newPointsBalance`.

> [!NOTE]
> Le prix payé ne dépend pas de la valeur de la récompense tirée : une offre qui coûte 300 points dans le catalogue peut sortir d'un ticket violet à 50 points. Le caractère aléatoire de ce mécanisme payant est discuté dans [Veille juridique](../../juridique/veille-juridique.md).

## GET /marketplace/my-codes

Renvoie `codes`, la liste des récompenses obtenues par le citoyen, de la plus récente à la plus ancienne : identifiant, `uniqueCode`, `isUsed`, `claimedAt`, titre, coût, partenaire et `qrCodeDataUrl`. Contrairement à la réponse de `claim`, ce QR code encode seulement le texte du code, pas l'objet JSON. Les QR codes sont recalculés à chaque appel.

## POST /marketplace/redeem

Utilisé par le commerçant, depuis l'espace partenaire, pour marquer un code comme consommé.

| Champ | Type | Règles |
|---|---|---|
| `uniqueCode` | chaîne | 4 à 64 caractères, espaces retirés aux extrémités, message `Code promo requis` |

1. Le code doit exister : sinon `404 Code promo introuvable`.
2. Un PARTNER ne peut valider que les codes des entreprises dont il est propriétaire (`Partner.ownerId`). Pour un code d'une autre entreprise, la réponse est aussi `404 Code promo introuvable`, pour ne pas révéler l'existence du code. Un ADMIN peut valider tous les codes.
3. Un code déjà utilisé renvoie `400 Ce code promo a déjà été utilisé en magasin`.
4. `isUsed` passe à `true`.

```json
{
  "success": true,
  "message": "Code promo validé en magasin avec succès",
  "data": { "redeemed": true, "uniqueCode": "BOUL-2026-0007", "rewardTitle": "-15% sur les viennoiseries et pains spéciaux", "partnerName": "La Boulangerie du Port d'EtherBay", "usedAt": "2026-11-12T09:15:30.441Z" }
}
```

> [!NOTE]
> La date de validation n'est pas stockée : `usedAt` est l'heure de la réponse. La mise à jour n'est pas conditionnée à `isUsed = false`, si bien que deux validations simultanées du même code peuvent toutes deux réussir. Le code est comparé tel quel : la casse compte.

## Erreurs du module

| Statut | Message | Route |
|---|---|---|
| 400 | `Erreur de validation des données` | `claim`, `scratch`, `redeem` |
| 400 | `Stock épuisé pour cette récompense partenaire` | `claim` |
| 400 | `EtherPoints insuffisants (<solde> disponibles, <coût> requis)` | `claim` |
| 400 | `Ce code promo a déjà été utilisé en magasin` | `redeem` |
| 402 | `EtherPoints insuffisants pour ce ticket à gratter ...` | `scratch` |
| 403 | `Vérifiez votre âge pour jouer.` | `claim`, `scratch` |
| 403 | `Accès refusé (RBAC) : Rôle PARTNER ou ADMIN requis pour cette ressource` | `redeem` par un USER |
| 404 | `Récompense introuvable dans le catalogue` | `rewards/:id` |
| 404 | `Cette offre n'est plus disponible` | `claim` |
| 404 | `Code promo introuvable` | `redeem` |
| 404 | `Aucune récompense n'est disponible pour le moment dans les tickets à gratter.` | `scratch` |
| 409 | `L'opération viole une règle d'intégrité des données (solde ou stock insuffisant)` | `claim` en concurrence |
| 409 | `Cette récompense vient d’être épuisée, veuillez réessayer.` | `scratch` en concurrence |
