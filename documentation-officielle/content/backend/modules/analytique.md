# Analytique

Le module `analytics` collecte des événements d'usage dans la table `Analytics` et calcule le tableau de bord démographique et d'acquisition de la Mairie. La même table sert aussi de journal d'audit de l'administration (préfixe `ADMIN_AUDIT:`), ce qui explique les règles de nommage imposées aux événements envoyés par les clients. Le consentement côté navigateur est décrit dans [Analytique et consentement](../../web/analytique-consentement.md).

| Fichier | Contenu |
|---|---|
| [`backend/src/api/analytics/analytics.routes.ts`](src:backend/src/api/analytics/analytics.routes.ts) | 2 routes |
| [`backend/src/api/analytics/analytics.validators.ts`](src:backend/src/api/analytics/analytics.validators.ts) | Schéma `trackEventSchema` et préfixes réservés |
| [`backend/src/api/analytics/analytics.services.ts`](src:backend/src/api/analytics/analytics.services.ts) | Agrégations du tableau de bord |
| [`backend/src/api/analytics/analytics.repo.ts`](src:backend/src/api/analytics/analytics.repo.ts) | Requêtes Prisma |

## Routes

| Méthode et chemin | Accès | Middlewares | Rôle |
|---|---|---|---|
| `POST /api/v1/analytics/track` | public, jeton facultatif | `optionalAuthenticate`, `validate(trackEventSchema)` | Enregistre un événement |
| `GET /api/v1/analytics/dashboard` | ADMIN | `authenticate`, `requireRoles('ADMIN')` | Indicateurs, démographie, acquisition |

## Origine des événements

| `eventType` | Émetteur | Contenu de `metadata` |
|---|---|---|
| `USER_SIGNUP` | service d'authentification à la création du compte | `provider`, `ageGroup`, `isAdultConfirmed` |
| `USER_LOGIN` | service d'authentification | `provider`, `ageGroup` et `isAdultConfirmed` ou `provider: EMAIL_CODE` ou `TOTP` |
| `ADMIN_AUDIT:<action>` | module d'administration | détail de l'action (voir [Administration Mairie](administration.md#journal-d-audit)) |
| tout autre type | clients web et mobile par `POST /analytics/track` | libre, dans les limites du schéma |

## POST /analytics/track

### Corps

| Champ | Type | Règles |
|---|---|---|
| `eventType` | chaîne | 2 à 64 caractères `[A-Za-z0-9_:.-]` ; ne doit pas commencer, sans tenir compte de la casse, par `ADMIN_AUDIT`, `USER_SIGNUP` ou `USER_LOGIN` |
| `utmSource` | chaîne | facultatif, 100 caractères au plus ; `direct` si absent |
| `metadata` | objet | facultatif, 20 clés au plus, clés de 64 caractères au plus, valeurs chaîne de 200 caractères au plus, nombre, booléen ou `null` |

Un type réservé est refusé avec le message `Type d'événement réservé au serveur` : un client ne peut ni fabriquer une ligne d'audit, ni gonfler les inscriptions. Plus de 20 clés produisent `Métadonnées trop nombreuses`. Les objets imbriqués et les tableaux sont refusés.

Si un jeton valide accompagne la requête, l'événement est rattaché au compte (`userId`). Sinon il est anonyme. Un jeton invalide n'empêche pas l'enregistrement : il est simplement ignoré.

```bash
curl -s -X POST http://localhost:2053/api/v1/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"eventType":"LOGIN_SUCCESS","utmSource":"instagram","metadata":{"ageGroup":"26-35","provider":"GOOGLE"}}'
```

```json
{
  "success": true,
  "message": "Événement analytique enregistré",
  "data": {
    "event": { "id": "019a7c70-...", "userId": null, "eventType": "LOGIN_SUCCESS", "utmSource": "instagram", "metadata": { "ageGroup": "26-35", "provider": "GOOGLE" }, "timestamp": "2026-11-11T16:20:00.000Z" }
  }
}
```

> [!NOTE]
> La route n'a pas de limite propre en dehors du rate limiting global (300 requêtes par 15 minutes et par IP). Un client anonyme peut donc écrire jusqu'à 300 lignes par fenêtre et par adresse, et influencer la répartition par âge du tableau de bord en envoyant des `metadata.ageGroup`.

## GET /analytics/dashboard

### Calcul

| Indicateur | Source |
|---|---|
| `kpis.totalUsers` | comptes dont `deletedAt` est nul |
| `kpis.targetParticipants` | constante 10 000 |
| `kpis.completionRatePercent` | `totalUsers / 10 000 x 100`, deux décimales |
| `kpis.totalTicketsSold` | nombre de lignes `Ticket` |
| `kpis.totalPrizePoolEth` | somme de `prizePool` de tous les tours, y compris annulés |
| `kpis.municipalityRevenueShareEth` | 10 % de cette somme, taux codé en dur |
| `kpis.totalClaimedRewards` | nombre de `ClaimedReward` |
| `demographics.ageBreakdown` | compte de `metadata.ageGroup` sur les 500 événements les plus récents, tous types confondus |
| `utmAcquisition` | nombre d'événements par `utmSource`, sur toute la table |

```json
{
  "success": true,
  "message": "Données analytiques et démographiques récupérées",
  "data": {
    "kpis": { "totalUsers": 128, "targetParticipants": 10000, "completionRatePercent": 1.28, "totalTicketsSold": 342, "totalPrizePoolEth": 3.42, "municipalityRevenueShareEth": 0.342, "totalClaimedRewards": 17 },
    "demographics": { "target18_35Validated": true, "ageBreakdown": { "18-25": 61, "26-35": 44, "36-50": 15, "50+": 6 } },
    "utmAcquisition": [ { "source": "direct", "conversions": 402 }, { "source": "instagram", "conversions": 37 }, { "source": "admin-dashboard", "conversions": 12 } ]
  }
}
```

### Limites du calcul

> [!WARNING]
> Si aucun des 500 derniers événements ne porte une tranche d'âge reconnue, `ageBreakdown` est remplacé par une répartition fixe codée en dur : 42, 33, 17 et 8. Le tableau de bord affiche alors des chiffres qui ne viennent d'aucune donnée. `target18_35Validated` est une constante `true`.

- Les tranches reconnues sont `18-25`, `26-35`, `36-50` et `50+`. La valeur `18-35` enregistrée par défaut à l'inscription sans tranche est ignorée.
- Un même citoyen compte autant de fois qu'il a d'événements portant sa tranche parmi les 500 derniers : c'est une répartition d'événements, pas de personnes.
- `utmAcquisition` additionne tous les événements, y compris connexions, événements du navigateur et lignes d'audit (source `admin-dashboard`) : le terme `conversions` est trompeur.
- Le taux de 10 % ne lit pas la commission réelle du contrat (`feeBps`), qui vaut 10 % sur le déploiement local mais peut être configurée jusqu'à 20 %.
- Les tours sont tous chargés en mémoire pour faire la somme.

Ces agrégats sont repris tels quels par [`GET /admin/dashboard`](administration.md#get-admin-dashboard).

## Erreurs du module

| Statut | Message | Cas |
|---|---|---|
| 400 | `Erreur de validation des données` avec `Type d'événement invalide`, `Type d'événement réservé au serveur` ou `Métadonnées trop nombreuses` | `track` |
| 401 | `Authentification requise (Token JWT manquant)` | `dashboard` sans jeton |
| 403 | `Accès refusé (RBAC) : Rôle ADMIN requis pour cette ressource` | `dashboard` pour un USER ou un PARTNER |
| 403 | `La double authentification est obligatoire pour les comptes d'administration. Activez-la depuis votre profil.` | `dashboard` pour un ADMIN sans 2FA |
