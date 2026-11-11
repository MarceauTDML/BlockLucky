# Registre des risques

- Date : 2026-11-11
- Échelle : probabilité (P) et impact (I) notés de 1 (faible) à 4 (critique) ; criticité = P x I.
  - criticité de 9 ou plus : traitement prioritaire ;
  - de 5 à 8 : surveillance ;
  - 4 ou moins : accepté.
- Les notes résiduelles tiennent compte des mesures déjà en place dans le dépôt.

## 1. Smart contract

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| SC1 | Réentrance permettant de vider la cagnotte | 3 | 4 | Checks-effects-interactions, `ReentrancyGuard`, pull payments, test d'attaque `ReentrantPlayer`, Slither en CI | 1 | 4 | Équipe contrat |
| SC2 | Tirage prévisible ou manipulé par la Mairie, un mineur ou le backend | 3 | 4 | Chainlink VRF v2.5, aucun choix de gagnant hors contrat, `requestDraw` public, preuve consultable | 1 | 4 | Équipe contrat |
| SC3 | Oracle VRF qui ne répond pas, tour bloqué en `Drawing` | 2 | 3 | `retryDraw` après `drawTimeout`, annulation avec remboursement intégral, alerte du keeper | 1 | 3 | Opérateur |
| SC4 | Fonds bloqués : gagnant ou participant incapable de recevoir de l'ETH | 2 | 3 | Retrait à l'initiative du bénéficiaire, l'échec d'un bénéficiaire ne bloque personne d'autre, tests `RejectingPlayer` | 1 | 2 | Équipe contrat |
| SC5 | Abus de l'administrateur : commission excessive, détournement | 2 | 4 | Commission plafonnée à 20 % dans le code, seule la commission est retirable, rôles séparés, événements publics, code vérifié sur Etherscan | 1 | 3 | Mairie |
| SC6 | Faille découverte après déploiement | 2 | 4 | Disjoncteur `pause`, 100 % des lignes couvertes, fuzzing, Slither. Le contrat n'est pas modifiable : une correction passe par un redéploiement documenté. | 1 | 4 | DSI |
| SC7 | Abonnement VRF non financé sur Sepolia | 3 | 2 | Vérification au déploiement, `retryDraw`, suivi du solde LINK dans le Subscription Manager | 2 | 2 | Opérateur |

## 2. Portefeuilles et clés

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| K1 | Fuite de la clé opérateur (`RELAYER_PRIVATE_KEY`) | 2 | 4 | Secret fourni par l'environnement, valeur de développement refusée en production, gitleaks sur tout l'historique, rôles limités (pas d'administration) ; l'administrateur peut révoquer le rôle | 1 | 3 | DSI |
| K2 | Fuite de la base de données exposant les clés des citoyens | 2 | 3 | Clés chiffrées AES-256-GCM avec `ENCRYPTION_KEY` hors base, testnet sans valeur | 1 | 2 | DSI |
| K3 | Perte de `ENCRYPTION_KEY` rendant les portefeuilles inutilisables | 1 | 3 | Sauvegarde du secret documentée dans les runbooks, fonds fictifs et redistribuables | 1 | 2 | DSI |
| K4 | Épuisement des ETH de l'opérateur, plus de dotation de bienvenue | 3 | 2 | Dotation versée une seule fois par citoyen (verrou Redis), solde visible, réapprovisionnement par faucet | 2 | 2 | Opérateur |
| K5 | Conflit de nonce entre processus signant avec le même compte | 2 | 2 | Un seul compte par rôle (l'oracle local a son propre compte), `NonceManager` réinitialisé et une nouvelle tentative en cas de nonce expiré | 1 | 2 | Équipe backend |

## 3. Plateforme et exploitation

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| P1 | Nœud RPC indisponible | 3 | 3 | RPC de secours (`FALLBACK_RPC_URL`), délais d'expiration, erreurs 503 explicites, indexeur qui reprend au curseur | 2 | 2 | Opérateur |
| P2 | Écart entre la base et la chaîne | 2 | 3 | La chaîne fait foi, indexeur idempotent, détection d'un curseur en avance sur la chaîne, test d'intégration sur nœud réel en CI | 1 | 2 | Équipe backend |
| P3 | Pic de charge au moment du tirage | 3 | 3 | Worker séparé, files BullMQ, cache Redis, tests k6, objectifs de service | 2 | 2 | DSI |
| P4 | Double achat ou double réclamation | 2 | 2 | En-tête `Idempotency-Key`, identifiants de tâche uniques dans la file, unicité `(tour, ticket)` en base | 1 | 1 | Équipe backend |
| P5 | Compte administrateur compromis | 2 | 4 | MFA obligatoire, journal d'audit, limites de débit, rôle ADMIN distinct | 1 | 3 | DSI |
| P6 | Dépendance vulnérable | 3 | 2 | Dependabot hebdomadaire, `npm audit` en CI, Trivy sur les images, CodeQL | 2 | 2 | Équipe |

## 4. Juridique, éthique et image

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| J1 | Requalification en loterie prohibée | 2 | 4 | Ethers fictifs gratuits, aucune vente ni conversion, testnet uniquement, [veille juridique](veille-juridique.md) à faire valider | 1 | 4 | Mairie |
| J2 | Participation de mineurs | 2 | 3 | Déclaration de majorité obligatoire à l'inscription | 2 | 2 | Mairie |
| J3 | Non-conformité RGPD (immutabilité de la chaîne) | 2 | 3 | Aucune donnée personnelle sur la chaîne, effacement du lien entre compte et adresse, registre des traitements | 1 | 2 | DPO |
| J4 | Incitation excessive au jeu | 2 | 2 | Plafonds par participant dans le contrat et le backend, pas d'achat d'ethers possible | 1 | 2 | Mairie |
| J5 | Perte de confiance si une transaction « disparaît » de l'explorateur | 2 | 3 | Liens vers l'explorateur uniquement pour de vraies transactions, mode démonstration affiché quand la blockchain est simulée | 1 | 2 | Équipe front |

## 5. Suivi

Le registre est revu :

- à chaque nouvelle version du contrat ;
- avant le passage sur Sepolia ;
- après tout incident (voir le [plan de réponse aux incidents](../incident-securite.md)).

Les risques résiduels de criticité 4 et plus (SC1, SC2, SC6, J1) sont acceptés pour une démonstration sur testnet. Ils deviendraient bloquants pour une exploitation avec des fonds réels.
