# Boutique et récompenses

Le module `marketplace` permet aux citoyens de dépenser leurs EtherPoints contre des récompenses proposées par les commerçants partenaires, puis aux commerçants de valider en magasin le code obtenu. Les EtherPoints sont des points de fidélité stockés uniquement en base : ils ne circulent pas sur la blockchain. Les offres et les lots de codes sont créés par le module [Partenaires](partenaires.md).

| Fichier | Contenu |
|---|---|
| [`backend/src/api/marketplace/marketplace.routes.ts`](src:backend/src/api/marketplace/marketplace.routes.ts) | 6 routes |
| [`backend/src/api/marketplace/marketplace.validators.ts`](src:backend/src/api/marketplace/marketplace.validators.ts) | 2 schémas Zod |
| [`backend/src/api/marketplace/marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) | Catalogue, échange, validation en magasin |
| [`backend/src/api/marketplace/marketplace.repo.ts`](src:backend/src/api/marketplace/marketplace.repo.ts) | `RewardCatalog`, `ClaimedReward` |
| [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts) | Débit des points et historique |

Le parcours est décrit dans [Échange de récompense](../../architecture/flux/recompense.md).

## Routes

| Méthode et chemin | Accès | Middlewares | Rôle |
|---|---|---|---|
| `GET /api/v1/marketplace/catalog` | public | aucun | Offres actives des partenaires actifs |
| `GET /api/v1/marketplace/rewards/:id` | public | aucun | Détail d'une offre |
| `GET /api/v1/marketplace/points` | connecté | `authenticate` | Solde et 50 derniers mouvements |
| `POST /api/v1/marketplace/claim` | connecté | `authenticate`, `idempotency`, `validate(claimRewardSchema)` | Échange de points contre un code |
| `GET /api/v1/marketplace/my-codes` | connecté | `authenticate` | Codes obtenus, avec QR code |
| `POST /api/v1/marketplace/redeem` | PARTNER, ADMIN | `authenticate`, `requireRoles('PARTNER', 'ADMIN')`, `validate(usePromoCodeSchema)` | Validation d'un code en magasin |

## Sources des EtherPoints

Le solde `User.pointsBalance` ne bouge que par [`ledgerService`](../services.md#ledgerservice), qui écrit en même temps une ligne `PointTransaction`. Une contrainte `CHECK ("pointsBalance" >= 0)` interdit un solde négatif en base.

| Type de mouvement | Montant | Déclencheur |
|---|---|---|
| `SOCIAL_QUEST` | +25 | création du compte |
| `REFERRAL` | +100 au parrain, +50 au filleul | création d'un compte avec code de parrainage |
| `TICKET_PURCHASE` | +50 par ticket | achat (indexeur en onchain, service loterie en simulé) |
| `GIFT_TICKET` | +75 par ticket offert | cadeau, crédité à l'acheteur |
| `SOCIAL_QUEST` | +20 à +40 | [quêtes sociales](utilisateur.md#quetes-sociales) |
| `REWARD_CLAIM` | moins le coût de l'offre | échange dans la boutique |

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

1. L'offre doit exister et être active : sinon `404 Cette offre n'est plus disponible`. L'état du partenaire n'est pas contrôlé ici.
2. Le stock restant doit être positif : sinon `400 Stock épuisé pour cette récompense partenaire`.
3. Le solde doit couvrir le coût : sinon `400 EtherPoints insuffisants (80 disponibles, 100 requis)`.
4. Les points sont débités par `ledgerService.debitPoints` (`REWARD_CLAIM`, description `Échange récompense : <titre> (<partenaire>)`).
5. Le code est pris en tête du lot importé par le partenaire (clé Redis `partner:codes:<rewardId>`). Si le lot est vide ou absent, un code est généré : préfixe tiré des quatre premiers caractères du nom du partenaire en majuscules, chaque caractère qui n'est pas une lettre de A à Z étant remplacé par `EBAY`, puis un tiret et 12 caractères hexadécimaux. « La Boulangerie… » donne par exemple `LAEBAYB-3F9A1C07B2DE`.
6. Le stock est décrémenté et le `ClaimedReward` créé dans une même transaction.
7. Un QR code PNG en data URL encode `{ claimId, uniqueCode, partner }`.
8. Un email `reward-claim` est envoyé si le compte a une adresse.

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
| 400 | `Erreur de validation des données` | `claim`, `redeem` |
| 400 | `Stock épuisé pour cette récompense partenaire` | `claim` |
| 400 | `EtherPoints insuffisants (<solde> disponibles, <coût> requis)` | `claim` |
| 400 | `Ce code promo a déjà été utilisé en magasin` | `redeem` |
| 403 | `Accès refusé (RBAC) : Rôle PARTNER ou ADMIN requis pour cette ressource` | `redeem` par un USER |
| 404 | `Récompense introuvable dans le catalogue` | `rewards/:id` |
| 404 | `Cette offre n'est plus disponible` | `claim` |
| 404 | `Code promo introuvable` | `redeem` |
| 409 | `L'opération viole une règle d'intégrité des données (solde ou stock insuffisant)` | `claim` en concurrence |
