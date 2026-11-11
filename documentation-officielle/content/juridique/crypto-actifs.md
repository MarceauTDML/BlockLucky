# Crypto-actifs et MiCA

BlockLucky utilise un vrai contrat Ethereum et de vraies transactions, mais sur des réseaux de test, avec des ethers sans valeur. Cette page explique pourquoi ce choix tient le projet hors du champ de la réglementation des crypto-actifs, ce que le modèle de conservation custodial impliquerait sur un réseau principal, et quelles garde-fous techniques le dépôt contient. Elle ne constitue pas un avis juridique : les qualifications sont à confirmer par un juriste (voir [Points à valider](points-a-valider.md)).

## Ce que manipule le projet

| Élément | Nature dans le dépôt | Valeur |
|---|---|---|
| Ethers de la cagnotte et des tickets | ETH du réseau Hardhat local (chaîne 31337) ou de Sepolia (chaîne 11155111) | Aucune valeur marchande ; obtenus gratuitement (comptes Hardhat, robinets Sepolia) |
| Dotation de bienvenue | Transfert de `WELCOME_GRANT_WEI` (0,1 ETH de test par défaut) depuis le compte opérateur | Gratuite pour le citoyen |
| Badge POAP | Jeton ERC-721 `BlockLuckyPOAP`, non transférable : `_update` refuse tout transfert entre deux adresses (`SoulboundToken`) | Commémoratif |
| EtherPoints | Solde en base de données (`User.pointsBalance`, journal `PointTransaction`), **pas** un jeton sur la chaîne | Échangeables contre des offres de commerçants |

Le mode `BLOCKCHAIN_MODE=simulated`, réservé au développement et refusé en production, n'écrit rien sur une chaîne ; il ne change rien à l'analyse. Les deux modes sont décrits dans [Mode onchain ou simulé](../integration-blockchain/modes.md).

## Le règlement MiCA

Le règlement (UE) 2023/1114 sur les marchés de crypto-actifs (MiCA) encadre l'émission de crypto-actifs et les services fournis sur ces actifs. Parmi ces services figure la **conservation et l'administration de crypto-actifs pour le compte de clients**, qui suppose un agrément de prestataire de services sur crypto-actifs (CASP). En France, l'autorité compétente est l'Autorité des marchés financiers (AMF).

| Notion de MiCA | Situation de BlockLucky |
|---|---|
| Crypto-actif | Les ethers de réseau de test ne sont pas négociés et n'ont pas de valeur ; leur qualification comme crypto-actif est à confirmer, mais ils ne représentent aucun droit ni aucune valeur pour le citoyen |
| Conservation pour le compte de clients | Techniquement oui : la Ville détient les clés privées des portefeuilles citoyens |
| Échange contre des fonds | Non : aucune vente, aucun rachat, aucune conversion |
| Émission de jetons | Le badge POAP est un jeton non fongible unique par participant et par tour ; les jetons non fongibles uniques sont en principe hors du champ de MiCA |

## Le modèle custodial

### Fonctionnement

Le backend crée pour chaque citoyen un portefeuille Ethereum, chiffre sa clé privée en AES-256-GCM et la conserve dans `User.walletEncryptedKey`. Le citoyen ne voit jamais sa clé ; le backend signe pour lui chaque achat, cadeau ou retrait. Ce choix est justifié dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md) : supprimer l'installation d'une extension de portefeuille, frein majeur pour le public visé. Les aspects de sécurité sont décrits dans [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

### Conséquences hors réseau de test

Si le contrat était déployé sur le réseau principal avec de vrais ethers, la Ville deviendrait dépositaire de fonds appartenant aux citoyens. Trois voies seraient alors possibles :

| Voie | Ce qu'elle suppose | Effet sur le code |
|---|---|---|
| Agrément CASP | Dossier auprès de l'AMF, fonds propres, contrôle interne, ségrégation des actifs, procédures de lutte contre le blanchiment | Ajout d'un parcours d'identification (KYC), de plafonds et d'un module de gestion des clés certifié (HSM ou équivalent) |
| Modèle non custodial | Le citoyen détient sa clé (extension de portefeuille, application mobile, ou export de la clé générée) | Signature côté client ; le backend ne fait plus que préparer les transactions et indexer les événements |
| Délégation | Conservation confiée à un prestataire agréé | Intégration de l'API du prestataire à la place de `wallet.service.ts` |

S'y ajouteraient la réglementation des jeux d'argent, puisque la mise et le gain auraient une valeur (voir [Veille juridique](veille-juridique.md#jeux-d-argent-et-loteries)), et l'obligation d'identifier les clients au titre de la lutte contre le blanchiment. Le dépôt n'implémente aucune de ces exigences.

## Garde-fous présents dans le dépôt

| Garde-fou | Où | Effet |
|---|---|---|
| Script de déploiement limité à Sepolia | [`smart-contract/scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) | Arrêt si l'identifiant de chaîne n'est pas 11155111 |
| Aucun réseau principal configuré | [`smart-contract/hardhat.config.ts`](src:smart-contract/hardhat.config.ts) | Seuls `localhost` et `sepolia` sont déclarés, en plus du réseau intégré de Hardhat |
| Aucune fonction d'achat d'ethers | API et clients | Les ethers ne s'obtiennent que par la dotation |
| Mention de l'absence de valeur | [`frontend-web/src/app/mentions-legales/page.tsx`](src:frontend-web/src/app/mentions-legales/page.tsx) | « Ils n'ont aucune valeur monétaire et ne peuvent être convertis en argent. » |
| Commission plafonnée | `MAX_FEE_BPS = 2000` dans [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) | La Mairie ne peut pas prélever plus de 20 % de la cagnotte |
| Remboursement en cas d'annulation | `claimRefund` | Chaque participant récupère sa contribution |

Ces garde-fous sont techniques : ils n'empêchent pas un opérateur de modifier la configuration Hardhat pour viser un autre réseau. La décision de ne pas déployer sur un réseau principal relève de la gouvernance de la Ville.

## Communication

- Ne jamais présenter les ethers fictifs, la cagnotte ou les EtherPoints comme un investissement, un placement ou une monnaie.
- Ne pas afficher de contre-valeur en euros.
- Rappeler le caractère de démonstration dans l'interface (bandeau de démonstration, charte de transparence) et dans les conditions de participation.

## EtherPoints

Les EtherPoints sont un programme de fidélité tenu en base de données, sans jeton sur la chaîne. Ils sont gagnés par la participation (achat, parrainage, quêtes) et échangés contre des offres de commerçants partenaires, sans intervention du hasard. Deux questions restent ouvertes et sont reprises dans [Points à valider](points-a-valider.md) : leur qualification éventuelle d'avantage en nature, et le régime des offres des commerçants (responsabilité, conditions, fiscalité).
