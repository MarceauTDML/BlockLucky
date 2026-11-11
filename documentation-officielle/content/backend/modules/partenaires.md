# Partenaires

Le module `partners` gère les commerçants d'EtherBay qui acceptent les EtherPoints : fiche de l'entreprise, offres de récompense, import de lots de codes promo et statistiques de consommation. Un compte `PARTNER` n'agit que sur les entreprises dont il est propriétaire ; un `ADMIN` agit sur toutes. La suspension d'un partenaire relève du module [Administration Mairie](administration.md#patch-admin-partners-partnerid-status), la consommation des offres du module [Boutique et récompenses](boutique.md).

| Fichier | Contenu |
|---|---|
| [`backend/src/api/partners/partners.routes.ts`](src:backend/src/api/partners/partners.routes.ts) | 5 routes |
| [`backend/src/api/partners/partners.validators.ts`](src:backend/src/api/partners/partners.validators.ts) | 3 schémas Zod |
| [`backend/src/api/partners/partners.services.ts`](src:backend/src/api/partners/partners.services.ts) | Règles métier et `assertPartnerAccess` |
| [`backend/src/api/partners/partners.repo.ts`](src:backend/src/api/partners/partners.repo.ts) | `Partner` et `RewardCatalog` |

Le guide [Ajouter un commerçant partenaire](../../guides/ajouter-partenaire.md) enchaîne ces routes pour un nouveau commerçant.

## Routes

| Méthode et chemin | Accès | Middlewares | Rôle |
|---|---|---|---|
| `GET /api/v1/partners` | public | aucun | Liste de toutes les entreprises et de leurs offres |
| `POST /api/v1/partners` | PARTNER, ADMIN | `authenticate`, `requireRoles('PARTNER', 'ADMIN')`, `validate(createPartnerSchema)` | Création d'une entreprise |
| `POST /api/v1/partners/offers` | PARTNER, ADMIN | idem, `validate(createRewardOfferSchema)` | Création d'une offre |
| `POST /api/v1/partners/codes/upload` | PARTNER, ADMIN | idem, `validate(uploadCodesBatchSchema)` | Import d'un lot de codes |
| `GET /api/v1/partners/:partnerId/consumption` | PARTNER, ADMIN | `authenticate`, `requireRoles('PARTNER', 'ADMIN')` | Statistiques de l'entreprise |

## Règle de propriété

`assertPartnerAccess(partner, actor)` est appelée par toutes les routes qui visent une entreprise existante, ainsi que par `POST /marketplace/redeem`.

| Situation | Résultat |
|---|---|
| Entreprise introuvable | `404 Entreprise partenaire introuvable` |
| Acteur `ADMIN` | autorisé |
| Acteur `PARTNER` et `Partner.ownerId` égal à son identifiant | autorisé |
| Acteur `PARTNER` sans lien, ou entreprise sans propriétaire | `403 Accès refusé : cette entreprise partenaire n'est pas rattachée à votre compte` |

La relation `Partner.owner` est déclarée avec `onDelete: SetNull` : si le compte propriétaire est supprimé de la base, l'entreprise devient orpheline et seul un administrateur peut encore la gérer. L'anonymisation RGPD ne supprime pas la ligne `User` et ne détache donc pas l'entreprise.

## GET /partners

Renvoie `partners`, la liste complète triée par date de création décroissante, entreprises suspendues comprises. Chaque entreprise contient toutes ses colonnes (`id`, `name`, `logoUrl`, `isActive`, `ownerId`, `createdAt`) et ses offres avec `_count.claimedRewards`. Pour n'afficher que les offres disponibles, les clients utilisent [`GET /marketplace/catalog`](boutique.md#get-marketplace-catalog).

## POST /partners

| Champ | Type | Règles |
|---|---|---|
| `name` | chaîne | 2 à 100 caractères, espaces retirés aux extrémités |
| `logoUrl` | chaîne | URL de 500 caractères au plus, obligatoirement en `https://` ; défaut `https://assets.etherbay.fr/partners/default.png` |
| `ownerId` | UUID | facultatif, pris en compte seulement pour un ADMIN |

Un PARTNER devient toujours propriétaire de l'entreprise qu'il crée, quel que soit `ownerId`. Un ADMIN peut désigner un propriétaire ou laisser l'entreprise sans propriétaire. L'entreprise est créée avec `isActive = true` : elle apparaît dans le catalogue dès sa première offre, sans validation préalable de la Mairie.

```json
{
  "success": true,
  "message": "Entreprise partenaire créée avec succès",
  "data": {
    "partner": { "id": "019a7c60-3a1b-7e2c-9d4f-6b8a0c2e4f17", "name": "Fromagerie des Quais", "logoUrl": "https://assets.etherbay.fr/partners/default.png", "isActive": true, "ownerId": "019a7c5f-...", "createdAt": "2026-11-11T15:10:02.118Z" }
  }
}
```

> [!NOTE]
> L'existence et le rôle du compte désigné par `ownerId` ne sont pas vérifiés. Un identifiant qui ne correspond à aucun compte viole la clé étrangère ; cette erreur Prisma (`P2003`) n'est pas traduite par le gestionnaire d'erreurs et produit une réponse 500.

## POST /partners/offers

| Champ | Type | Règles |
|---|---|---|
| `partnerId` | UUID | entreprise visée, message `Identifiant partenaire invalide` |
| `title` | chaîne | 3 à 120 caractères |
| `costInPoints` | entier | 10 à 100 000, message `Coût minimum de 10 EtherPoints` |
| `totalStock` | entier | 1 à 100 000, message `Stock minimum de 1 lot` |
| `expiresAt` | date | facultatif, ISO 8601 avec fuseau (`2026-12-31T23:59:59+01:00`) |

L'offre est créée active avec `remainingStock = totalStock`. Si `expiresAt` est fourni, il est écrit dans la clé Redis `partner:offer_expiry:<offerId>` et renvoyé dans la réponse.

> [!WARNING]
> La date d'expiration n'est lue nulle part : une offre expirée reste au catalogue et reste échangeable. Elle n'est pas non plus persistée en base, donc perdue si Redis est vidé.

```json
{
  "success": true,
  "message": "Offre partenaire créée avec succès",
  "data": {
    "offer": { "id": "019a7c61-...", "partnerId": "019a7c60-...", "title": "Un plateau découverte offert", "costInPoints": 300, "totalStock": 30, "remainingStock": 30, "isActive": true, "createdAt": "2026-11-11T15:12:40.004Z", "expiresAt": "2026-12-31T23:59:59+01:00" }
  }
}
```

## POST /partners/codes/upload

Importe des codes promo fournis par le commerçant. Ils seront distribués avant les codes générés lors des échanges.

| Champ | Type | Règles |
|---|---|---|
| `rewardId` | UUID | offre visée |
| `codes` | tableau de chaînes | facultatif, 5 000 éléments au plus, chacun de 3 à 64 caractères |
| `csvContent` | chaîne | facultatif, 200 000 caractères au plus |

### Règles

1. L'offre doit exister (`404 Offre partenaire introuvable`) et l'acteur doit avoir accès à son entreprise.
2. Si `codes` contient au moins un élément, il est utilisé et `csvContent` est ignoré.
3. Sinon `csvContent` est découpé sur les retours à la ligne, virgules et points-virgules. Les éléments de moins de 3 caractères et l'en-tête `code` (toute casse) sont écartés. La longueur maximale de 64 caractères n'est pas vérifiée dans ce cas.
4. Sans aucun code retenu : `400 Aucun code promo valide fourni dans le lot (CSV ou liste)`.
5. Les doublons du lot sont retirés, puis le lot est fusionné sans doublon avec la réserve existante de la clé Redis `partner:codes:<rewardId>`.
6. `totalStock` et `remainingStock` de l'offre augmentent du nombre de codes du lot.

```bash
curl -s -X POST http://localhost:2053/api/v1/partners/codes/upload \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"rewardId":"019a7c61-0e5d-7a3b-8c2f-4d6e8a0b2c19","csvContent":"code\nBOUL-2026-0001\nBOUL-2026-0002\nBOUL-2026-0003"}'
```

```json
{
  "success": true,
  "message": "Lot de codes promos uniques injecté avec succès",
  "data": { "rewardId": "019a7c61-0e5d-7a3b-8c2f-4d6e8a0b2c19", "injectedCount": 3, "totalPoolAvailable": 3, "totalStock": 103, "remainingStock": 103 }
}
```

> [!CAUTION]
> La réserve de codes n'existe que dans Redis, sans expiration. Sans Redis, elle tombe dans la mémoire du process et disparaît au redémarrage, alors que le stock en base a été augmenté : les échanges suivants reçoivent des codes générés. Un code déjà présent dans la réserve, réimporté, augmente quand même le stock. Un code déjà attribué par le passé n'est pas détecté : son second tirage échoue sur l'unicité de `ClaimedReward.uniqueCode` après le débit des points.

## GET /partners/:partnerId/consumption

`partnerId` n'est pas validé par Zod ; un identifiant inconnu donne `404 Entreprise partenaire introuvable`. La réponse agrège toutes les offres de l'entreprise :

```json
{
  "success": true,
  "message": "Indicateur de consommation des codes récupéré",
  "data": {
    "partner": { "id": "019a7c4f-...", "name": "La Boulangerie du Port d'EtherBay", "logoUrl": "https://assets.etherbay.fr/partners/default.png", "isActive": true },
    "summary": { "totalStock": 150, "remainingStock": 141, "claimedCount": 9, "redeemedInStoreCount": 4, "consumptionPercentage": 6 },
    "offersBreakdown": [
      { "rewardId": "019a7c50-...", "title": "-15% sur les viennoiseries et pains spéciaux", "costInPoints": 100, "totalStock": 100, "remainingStock": 94, "claimedCount": 6, "redeemedInStoreCount": 3, "consumptionRatePercent": 6 }
    ]
  }
}
```

| Indicateur | Calcul |
|---|---|
| `claimedCount` | nombre de `ClaimedReward` de l'offre |
| `redeemedInStoreCount` | parmi eux, ceux dont `isUsed = true` |
| `consumptionRatePercent`, `consumptionPercentage` | `round(claimedCount / totalStock x 100)`, 0 si le stock total est nul |

Le repository charge toutes les lignes `ClaimedReward` de l'entreprise pour les compter en mémoire : le coût de la route croît avec le nombre de codes distribués.

## Erreurs du module

| Statut | Message | Route |
|---|---|---|
| 400 | `Erreur de validation des données` | création, offres, import |
| 400 | `Aucun code promo valide fourni dans le lot (CSV ou liste)` | import |
| 403 | `Accès refusé (RBAC) : Rôle PARTNER ou ADMIN requis pour cette ressource` | toutes les routes protégées, pour un USER |
| 403 | `Accès refusé : cette entreprise partenaire n'est pas rattachée à votre compte` | offres, import, consommation |
| 404 | `Entreprise partenaire introuvable` | offres, consommation |
| 404 | `Offre partenaire introuvable` | import |
| 500 | `Erreur interne du serveur` en production, message Prisma ailleurs | création avec un `ownerId` inexistant |
