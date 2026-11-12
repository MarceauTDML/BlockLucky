# Administration Mairie

Le module `admin` sert l'espace d'administration de la Mairie d'EtherBay : tableau de bord, disjoncteur du smart contract, reversement de la commission à la trésorerie, suspension des partenaires, vérification des pièces d'identité, export de rapports et journal d'audit. Le tirage et l'annulation d'un tour, aussi réservés à l'ADMIN, sont dans le module [Loterie](loterie.md#post-lottery-draw).

| Fichier | Contenu |
|---|---|
| [`backend/src/api/admin/admin.routes.ts`](src:backend/src/api/admin/admin.routes.ts) | 9 routes, protection au niveau du routeur |
| [`backend/src/api/admin/admin.validators.ts`](src:backend/src/api/admin/admin.validators.ts) | 6 schémas Zod |
| [`backend/src/api/admin/admin.services.ts`](src:backend/src/api/admin/admin.services.ts) | Règles métier et écriture de l'audit |
| [`backend/src/api/admin/admin.repo.ts`](src:backend/src/api/admin/admin.repo.ts) | Agrégats, audit, statut des partenaires, demandes de vérification d'identité |
| [`backend/src/services/blockchain.service.ts`](src:backend/src/services/blockchain.service.ts) | Disjoncteur et trésorerie en mode simulé |

## Protection

Le routeur applique `router.use(authenticate, requireRoles('ADMIN'))` avant toutes ses routes. Une requête sur n'importe quel chemin sous `/admin`, même inexistant, passe donc d'abord par ces deux contrôles : un USER reçoit 403 et non 404.

| Contrôle | Échec |
|---|---|
| Jeton présent et valide | `401` |
| Rôle du jeton égal à `ADMIN` | `403 Accès refusé (RBAC) : Rôle ADMIN requis pour cette ressource` |
| Compte encore présent, non supprimé, rôle inchangé en base | `403 Droits révoqués ou modifiés : reconnectez-vous` |
| 2FA active sur le compte si `ADMIN_MFA_REQUIRED=true` | `403 La double authentification est obligatoire pour les comptes d'administration. Activez-la depuis votre profil.`, avec `errors.code` à `ADMIN_MFA_REQUIRED` |
| Base de données joignable pour ces vérifications | `503 Vérification des droits impossible` |

Pendant une maintenance (`MAINTENANCE_MODE=true`), seules les routes appelées par `/api/admin/...` restent accessibles ; le préfixe `/api/v1/admin/...` est bloqué comme le reste de l'API (voir [Structure et cycle d'une requête](../structure.md#middlewares-globaux)).

## Routes

| Méthode et chemin | Middlewares propres | Rôle | Audit |
|---|---|---|---|
| `GET /api/v1/admin/dashboard` | aucun | Indicateurs globaux | non |
| `POST /api/v1/admin/circuit-breaker` | `validate(circuitBreakerSchema)` | Pause ou reprise du contrat | `CIRCUIT_BREAKER_PAUSE` ou `CIRCUIT_BREAKER_RESUME` |
| `POST /api/v1/admin/treasury/withdraw` | `validate(treasuryWithdrawalSchema)` | Reversement de la commission | `TREASURY_WITHDRAWAL_MULTISIG` |
| `PATCH /api/v1/admin/partners/:partnerId/status` | `validate(approvePartnerSchema)` | Activation ou suspension d'un partenaire | `PARTNER_APPROVED` ou `PARTNER_SUSPENDED` |
| `GET /api/v1/admin/reports/export` | aucun | Rapport CSV ou « PDF » | `EXPORT_REPORT_CSV` ou `EXPORT_REPORT_PDF` |
| `GET /api/v1/admin/identity-verifications` | `validate(listIdentityVerificationsSchema)` | File des pièces d'identité par statut | non |
| `GET /api/v1/admin/identity-verifications/:id` | `validate(identityVerificationIdSchema)` | Consultation d'une pièce | `IDENTITY_DOCUMENT_VIEWED` |
| `POST /api/v1/admin/identity-verifications/:id/decision` | `validate(identityDecisionSchema)` | Approbation ou refus | `IDENTITY_VERIFICATION_DECISION` |
| `GET /api/v1/admin/audit-logs` | aucun | Journal d'audit | non |

## GET /admin/dashboard

Combine les agrégats du module, ceux du [tableau de bord analytique](analytique.md#get-analytics-dashboard) et l'état du réseau.

```json
{
  "success": true,
  "message": "Tableau de bord central Mairie récupéré",
  "data": {
    "kpis": { "totalPrizePoolEth": 3.42, "ticketsSold": 342, "municipalityRevenueEth": 0.342, "registeredCitizens": 128, "activePartners": 2, "claimedRewards": 17 },
    "demographics": { "target18_35Validated": true, "ageBreakdown": { "18-25": 61, "26-35": 44, "36-50": 15, "50+": 6 } },
    "utmAcquisition": [ { "source": "direct", "conversions": 402 } ],
    "network": { "mode": "onchain", "chainId": 31337, "isFallback": false, "rpcUrl": "http://127.0.0.1:8545", "isPaused": false, "contractAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", "poapContractAddress": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" },
    "rounds": [ { "id": "019a7c41-...", "contractRoundId": 1, "status": "OPEN", "prizePool": 3.42 } ]
  }
}
```

| Indicateur | Calcul |
|---|---|
| `totalPrizePoolEth` | somme des `prizePool` de tous les tours en base, annulés compris |
| `municipalityRevenueEth` | 10 % de cette somme, taux codé en dur et non lu dans le contrat |
| `activePartners` | nombre total de lignes `Partner`, suspendues comprises |
| `registeredCitizens` | comptes non supprimés, tous rôles confondus |
| `rounds` | toutes les colonnes de tous les tours, du plus récent au plus ancien |

La commission réellement disponible sur le contrat (`accruedFees`) n'est pas affichée ici. Elle est lisible sur la chaîne, voir [Exploitation du contrat](../../smart-contracts/exploitation.md).

## POST /admin/circuit-breaker

| Champ | Type | Règles |
|---|---|---|
| `paused` | booléen | obligatoire |
| `reason` | chaîne | facultatif, 5 caractères au moins, message `Motif de sécurité obligatoire pour l'audit` ; défaut `Action manuelle de sécurité Mairie / DSI` |

Mode onchain : le compte opérateur appelle `pause()` ou `unpause()` sur `BlockLucky`, ce qui exige le rôle `PAUSER_ROLE`. Pendant la pause, le contrat refuse achats et tirages : `POST /lottery/buy` renvoie `503` avec `circuitBreaker: true`, le keeper ne fait rien. Un compte opérateur sans le rôle produit `403 Le compte opérateur du backend n'a pas le rôle requis sur le Smart Contract.`

Mode simulé : la clé Redis `blockchain:circuit_breaker` passe à `true` ou `false` et un hachage aléatoire est renvoyé.

```json
{
  "success": true,
  "message": "Circuit Breaker ACTIVÉ : Smart Contract mis en pause d'urgence",
  "data": { "paused": true, "txHash": "0x3c7e...b210", "timestamp": "2026-11-11T17:00:00.000Z", "reason": "Comportement anormal détecté sur les achats" }
}
```

L'état courant est exposé par `GET /health` (`network.isPaused`) et `GET /lottery/status`. Le parcours complet est dans [Disjoncteur](../../architecture/flux/disjoncteur.md).

## POST /admin/treasury/withdraw

| Champ | Type | Règles |
|---|---|---|
| `multisigWallet` | chaîne | `0x` + 40 hexadécimaux, message `Adresse du portefeuille multi-signatures de la Mairie invalide` |
| `amountEth` | nombre | strictement positif, 1 000 au plus |
| `note` | chaîne | facultatif, 500 caractères au plus |

Mode onchain, dans [`lotteryGateway.withdrawFees`](src:backend/src/blockchain/lottery.gateway.ts) :

1. si `multisigWallet` diffère de la trésorerie enregistrée dans le contrat, le compte opérateur appelle `setTreasury(multisigWallet)`, qui exige le rôle d'administrateur du contrat ;
2. il lit `accruedFees`, puis appelle `withdrawFees()`, qui verse la totalité de la commission accumulée à la trésorerie.

> [!IMPORTANT]
> `amountEth` n'est pas utilisé pour le virement : c'est toujours la totalité de `accruedFees` qui part. La valeur demandée est seulement conservée dans l'audit (`requestedAmountEth`). L'adresse n'est pas contrôlée comme un portefeuille multi-signatures : toute adresse valide est acceptée et devient la nouvelle trésorerie du contrat. Sans commission, le contrat renvoie `409 Aucune commission à reverser à la trésorerie.`

Mode simulé : aucun fonds ne bouge, la réponse contient un hachage aléatoire et reprend `amountEth`.

```json
{
  "success": true,
  "message": "Retrait de trésorerie vers le portefeuille multi-signatures exécuté",
  "data": { "transactionHash": "0x8e41...07cd", "amountEth": 0.004, "treasury": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" }
}
```

En mode simulé, la réponse est `{ transactionHash, multisigWallet, amountEth, timestamp }`.

## PATCH /admin/partners/:partnerId/status

| Champ | Type | Règles |
|---|---|---|
| `isActive` | booléen | obligatoire |

Met à jour `Partner.isActive`. Une entreprise suspendue disparaît du catalogue avec toutes ses offres, mais ses codes déjà attribués restent valables en magasin et ses offres restent lisibles par `GET /marketplace/rewards/:id`. `partnerId` n'est pas validé : un identifiant inconnu renvoie `404 Ressource introuvable` (erreur Prisma `P2025`). La réponse renvoie `{ "partner": {...} }`.

Les entreprises sont actives dès leur création par `POST /partners` : cette route sert à suspendre puis éventuellement réactiver, pas à valider une demande en attente.

## GET /admin/reports/export

| Paramètre | Règles |
|---|---|
| `format` | `CSV` (défaut) ou `PDF`, insensible à la casse ; toute autre valeur donne `CSV` |

Le rapport reprend les `kpis` du tableau de bord.

| Format | Contenu déposé sur S3 | Réponse |
|---|---|---|
| `CSV` | `reports/etherbay-report-<horodatage>.csv`, une ligne `Metric,Value` puis 7 lignes, cellules neutralisées contre l'injection de formules | `format`, `generatedAt`, `downloadUrl`, `content` (texte CSV) |
| `PDF` | `reports/etherbay-report-<horodatage>.pdf`, qui contient en réalité un JSON indenté (titre, date, `kpis`, `demographics`) déclaré `application/pdf` | `format`, `generatedAt`, `downloadUrl`, `summary` |

```text
"Metric","Value"
"Date","2026-11-11T17:30:00.000Z"
"Total_Prize_Pool_ETH","3.42"
"Municipality_Revenue_ETH","0.342"
"Tickets_Sold","342"
"Registered_Citizens","128"
"Active_Partners","2"
"Claimed_Rewards","17"
```

> [!WARNING]
> Aucun PDF n'est produit : le fichier `.pdf` ne s'ouvre pas dans un lecteur PDF. `downloadUrl` est construit comme `AWS_S3_ENDPOINT/AWS_S3_BUCKET/clé`, sans URL présignée : il ne fonctionne que si le bucket est public. Si le dépôt S3 échoue, l'erreur est seulement journalisée et l'URL renvoyée pointe vers un fichier absent.

## Vérification des pièces d'identité

Ces trois routes servent la page [Identités](../../web/pages.md) de l'espace Mairie. Elles traitent les demandes envoyées par `POST /user/identity` (voir [Utilisateur](utilisateur.md#verification-d-age)).

### GET /admin/identity-verifications

| Paramètre | Règles |
|---|---|
| `status` | `PENDING` (défaut), `VERIFIED` ou `REJECTED` |
| `page`, `limit` | pagination, `limit` de 1 à 100 |

La liste est triée par date d'envoi, la plus ancienne en premier. Chaque entrée contient `id`, `userId`, `email`, `submittedAt` et `status`, sans image. La réponse porte un objet `meta` de pagination.

### GET /admin/identity-verifications/:id

L'identifiant doit être un UUID (`400 Identifiant de demande invalide`) ; une demande inconnue renvoie 404. La réponse, servie avec `Cache-Control: no-store`, contient le compte (`email`, `walletAddress`, `accountCreatedAt`), le statut, les dates, l'agent qui a statué, le motif d'un refus et les deux images `front` et `back` sous forme d'URL `data:` déchiffrées.

Les images ne sont renvoyées que pour une demande `PENDING`. Après une décision, `front` et `back` valent `null`, puisque les images ont été effacées. Chaque consultation est tracée dans l'audit, même sans image.

### POST /admin/identity-verifications/:id/decision

| Champ | Type | Règles |
|---|---|---|
| `approved` | booléen | obligatoire |
| `note` | chaîne | 500 caractères au plus ; au moins 3 caractères obligatoires en cas de refus (`Le motif du refus est obligatoire`) |

| Cas | Réponse |
|---|---|
| Demande inconnue | `404 Demande de vérification d'identité introuvable` |
| Demande de l'administrateur lui-même | `403 Vous ne pouvez pas statuer sur votre propre pièce d'identité.` |
| Demande déjà traitée, y compris par un autre agent au même moment | `409 Cette demande a déjà été traitée.` |

La décision est écrite dans une transaction qui ne s'applique qu'à une demande encore `PENDING` :

| Donnée | Approbation | Refus |
|---|---|---|
| `IdentityDocument.status` | `VERIFIED` | `REJECTED` |
| `frontEncrypted`, `backEncrypted` | effacés | effacés |
| `reviewedAt`, `reviewerId` | date et agent | date et agent |
| `User.ageVerificationStatus` | `VERIFIED` | `REJECTED` |
| `User.ageVerifiedAt` | date de la décision | `null` |
| `User.ageVerificationNote` | `null` | motif |

L'administrateur reçoit `{ "decision": { "id", "userId", "status", "reviewedAt", "note" } }`. Le citoyen reçoit l'email `identity-decision`, avec le motif en cas de refus ; il peut alors envoyer une nouvelle pièce. Un compte sans email n'est pas prévenu.

## Journal d'audit

Chaque action sensible écrit une ligne `Analytics` avec `eventType = ADMIN_AUDIT:<action>`, `userId` de l'administrateur, `utmSource = admin-dashboard` et le détail en `metadata`. Les clients ne peuvent pas écrire de lignes avec ce préfixe (voir [Analytique](analytique.md#post-analytics-track)).

| Action | `metadata` |
|---|---|
| `CIRCUIT_BREAKER_PAUSE`, `CIRCUIT_BREAKER_RESUME` | `paused`, `reason`, `txHash` |
| `TREASURY_WITHDRAWAL_MULTISIG` | `multisigWallet`, `amountEth` (versé), `requestedAmountEth`, `note`, `transactionHash` |
| `PARTNER_APPROVED`, `PARTNER_SUSPENDED` | `partnerId`, `partnerName`, `isActive` |
| `EXPORT_REPORT_CSV`, `EXPORT_REPORT_PDF` | `format`, `timestamp` |
| `IDENTITY_DOCUMENT_VIEWED` | `verificationId`, `userId`, `imagesShown` |
| `IDENTITY_VERIFICATION_DECISION` | `verificationId`, `userId`, `approved`, `status`, `note` s'il est fourni |

L'audit est écrit après l'action : une action qui échoue n'est pas tracée, et un échec d'écriture de l'audit après une transaction réussie renvoie une erreur alors que l'action a eu lieu. Le tirage et l'annulation de tour (`POST /lottery/draw`, `/refund`) ne sont pas audités.

### GET /admin/audit-logs

`limit` est lu dans la query, défaut 100, sans borne supérieure.

```json
{
  "success": true,
  "message": "Journal des logs d'audit récupéré",
  "data": {
    "logs": [
      { "id": "019a7c80-...", "action": "CIRCUIT_BREAKER_PAUSE", "adminId": "019a7c01-...", "adminWallet": "0x4a1e...", "metadata": { "paused": true, "reason": "Comportement anormal détecté sur les achats", "txHash": "0x3c7e...b210" }, "timestamp": "2026-11-11T17:00:00.000Z" }
    ]
  }
}
```

`adminWallet` vaut `Système` si la ligne n'est rattachée à aucun compte.
