# Registre des risques

Ce registre recense les risques techniques, juridiques et d'image du projet, avec leur cotation avant et après les mesures en place. Il reprend le registre tenu par l'équipe le 11 novembre 2026, corrigé là où le code contredit les mesures annoncées, et complété par les risques relevés lors de la rédaction de cette documentation. Les menaces sous-jacentes sont analysées dans le [modèle de menaces](../securite/menaces.md).

## Méthode

| Élément | Règle |
|---|---|
| Probabilité (P) | De 1 (faible) à 4 (quasi certaine) |
| Impact (I) | De 1 (faible) à 4 (critique) |
| Criticité | P × I |
| Traitement | 9 ou plus : prioritaire ; de 5 à 8 : surveillance ; 4 ou moins : accepté |
| Cotation résiduelle | Tient compte des mesures déjà présentes dans le dépôt |

Les risques ajoutés dans cette version sont marqués « nouveau ». Leur cotation est une proposition à valider par l'équipe et la DSI, comme celle des autres lignes.

## Smart contract

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| SC1 | Réentrance permettant de vider la cagnotte | 3 | 4 | Checks-effects-interactions, `ReentrancyGuard`, retraits à l'initiative du bénéficiaire, test d'attaque `ReentrantPlayer`, Slither en CI | 1 | 4 | Équipe contrat |
| SC2 | Tirage prévisible ou manipulé par la Mairie, un validateur ou le backend | 3 | 4 | Chainlink VRF v2.5, aucun choix de gagnant hors contrat, `requestDraw` public, preuve consultable | 1 | 4 | Équipe contrat |
| SC3 | Oracle VRF qui ne répond pas, tour bloqué en `Drawing` | 2 | 3 | `retryDraw` après `drawTimeout`, annulation avec remboursement intégral, alerte du keeper | 1 | 3 | Opérateur |
| SC4 | Fonds bloqués : gagnant ou participant incapable de recevoir de l'ETH | 2 | 3 | Retrait à l'initiative du bénéficiaire, l'échec d'un bénéficiaire ne bloque personne, tests `RejectingPlayer` | 1 | 2 | Équipe contrat |
| SC5 | Abus de l'administrateur : commission excessive, détournement | 2 | 4 | Commission plafonnée à 20 % dans le code, seule la commission est retirable, rôles séparés, événements publics, code vérifiable sur Etherscan | 1 | 3 | Mairie |
| SC6 | Faille découverte après déploiement | 2 | 4 | Disjoncteur `pause`, 100 % des lignes couvertes, fuzzing, Slither. Le contrat n'est pas modifiable : une correction passe par un redéploiement documenté. | 1 | 4 | DSI |
| SC7 | Abonnement VRF non financé sur Sepolia | 3 | 2 | Vérification au déploiement, `retryDraw`, suivi du solde dans le Subscription Manager | 2 | 2 | Opérateur |
| SC8 | Nouveau. Le propriétaire hérité de `VRFConsumerBaseV2Plus` (le déployeur) remplace le coordinateur par `setCoordinator` et désigne le gagnant | 2 | 4 | Événement public `CoordinatorSet` ; aucune autre mesure, la propriété n'est pas transférée | 2 | 4 | Mairie |
| SC9 | Nouveau. Un porteur d'`OPERATOR_ROLE` voit la réponse VRF dans le mempool et la devance par `cancelRound` pour censurer un gagnant | 1 | 3 | Remboursement intégral de tous les participants ; annulation visible sur la chaîne | 1 | 3 | Équipe contrat |

## Portefeuilles et clés

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| K1 | Fuite de la clé opérateur (`RELAYER_PRIVATE_KEY`) | 2 | 4 | Secret fourni par l'environnement, valeur de développement refusée en production, gitleaks sur tout l'historique, révocation des rôles par l'administrateur | 1 | 3 | DSI |
| K2 | Fuite de la base exposant les clés des citoyens | 2 | 3 | Clés chiffrées AES-256-GCM avec `ENCRYPTION_KEY` hors base, réseau de test sans valeur | 1 | 2 | DSI |
| K3 | Perte ou rotation de `ENCRYPTION_KEY` rendant les portefeuilles inutilisables | 1 | 3 | Sauvegarde du secret à prévoir avec celle de la base ; fonds fictifs et redistribuables | 1 | 3 | DSI |
| K4 | Épuisement des ETH de l'opérateur, plus de dotation de bienvenue | 3 | 2 | Dotation versée une seule fois par compte (verrou Redis et `welcomeGrantTxHash`), solde visible, réapprovisionnement par robinet | 2 | 2 | Opérateur |
| K5 | Conflit de nonce entre processus signant avec le même compte | 2 | 2 | Un seul compte par rôle (l'oracle local a son propre compte), `NonceManager` réinitialisé et nouvelle tentative en cas de `NONCE_EXPIRED` | 1 | 2 | Équipe backend |

Corrections apportées :

- **K1.** Le registre initial indiquait des « rôles limités (pas d'administration) » pour l'opérateur. En local, l'opérateur par défaut est le compte n°0 de Hardhat, qui est aussi administrateur et propriétaire VRF. Le reversement de commission du backend appelle `setTreasury`, réservé à `DEFAULT_ADMIN_ROLE`, dès que l'adresse demandée diffère de la trésorerie enregistrée. La limitation des rôles dépend donc entièrement du déploiement (voir [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md#compte-operateur)). La probabilité résiduelle reste à 1, mais l'impact résiduel n'est réellement de 3 que si l'opérateur ne détient pas `DEFAULT_ADMIN_ROLE`.
- **K3.** Le registre initial renvoyait aux runbooks pour la sauvegarde du secret. Il n'existe en outre aucun outil de re-chiffrement : une rotation de la clé a le même effet qu'une perte. L'impact résiduel est relevé de 2 à 3.

## Plateforme et exploitation

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| P1 | Nœud RPC indisponible | 3 | 3 | RPC de secours (`FALLBACK_RPC_URL`), délais d'expiration, erreurs 503 explicites, indexeur qui reprend au curseur | 2 | 2 | Opérateur |
| P2 | Écart entre la base et la chaîne | 2 | 3 | La chaîne fait foi, indexeur idempotent, détection d'un curseur en avance, test d'intégration sur nœud réel en CI | 1 | 2 | Équipe backend |
| P3 | Pic de charge au moment du tirage | 3 | 3 | Worker séparé, files BullMQ, cache Redis, scénarios k6, objectifs de service | 2 | 2 | DSI |
| P4 | Double achat ou double réclamation | 2 | 2 | Middleware `Idempotency-Key` côté serveur, identifiants de tâche uniques dans la file, unicité `(tour, ticket)` en base | 1 | 2 | Équipe backend |
| P5 | Compte administrateur compromis | 2 | 4 | 2FA obligatoire, journal d'audit, limites de débit, rôle ADMIN distinct | 2 | 3 | DSI |
| P6 | Dépendance vulnérable | 3 | 2 | Dependabot avec délai de 5 jours, `npm audit` en CI, Trivy sur les images, CodeQL | 2 | 2 | Équipe |
| P7 | Nouveau. Panne de Redis : révocations de session ignorées, limitation de débit locale à chaque instance | 2 | 3 | Repli mémoire documenté (ADR 0002), sondes de santé | 2 | 2 | DSI |

Corrections apportées :

- **P4.** Les clients web et mobile n'envoient pas l'en-tête `Idempotency-Key` : la protection HTTP ne joue pas pour eux. Les deux autres mesures restent effectives. L'impact résiduel passe de 1 à 2.
- **P5.** La 2FA par email n'ajoute pas de facteur à la connexion par code email, et le code TOTP remplace le code email au lieu de s'y ajouter (voir [Authentification](../securite/authentification.md#limites-connues)). La probabilité résiduelle est relevée de 1 à 2.

## Juridique, éthique et image

| N° | Risque | P | I | Mesures en place | P résid. | I résid. | Responsable |
|---|---|---|---|---|---|---|---|
| J1 | Requalification en loterie prohibée | 2 | 4 | Ethers fictifs gratuits, aucune vente ni conversion, réseau de test uniquement, [veille juridique](veille-juridique.md) à faire valider | 1 | 4 | Mairie |
| J2 | Participation de mineurs | 2 | 3 | Pièce d'identité examinée par la Mairie avant tout achat, cadeau ou échange (`AGE_VERIFICATION_REQUIRED`, obligatoire en production), envoyée depuis `/profil/identite` sur le web ou depuis le mobile ; déclaration de majorité à la connexion web | 1 | 2 | Mairie |
| J3 | Non-conformité RGPD liée à l'immutabilité de la chaîne | 2 | 3 | Aucune donnée personnelle directe sur la chaîne, suppression de l'email et de la clé, registre des traitements | 1 | 2 | DPO |
| J4 | Incitation excessive au jeu | 2 | 2 | Plafonds par participant dans le contrat et le backend, aucun achat d'ethers possible | 1 | 2 | Mairie |
| J5 | Perte de confiance si une transaction « disparaît » de l'explorateur | 2 | 3 | Liens vers l'explorateur uniquement pour de vraies transactions, mode démonstration affiché quand la blockchain est simulée | 1 | 2 | Équipe front |
| J6 | Nouveau. Création d'un compte pour le bénéficiaire d'un cadeau sans démarche de sa part ni vérification de majorité | 3 | 2 | Le bénéficiaire doit faire vérifier son âge pour acheter, offrir ou échanger, mais il détient le ticket reçu | 3 | 2 | DPO |
| J7 | Nouveau. Non-conformité à l'obligation d'accessibilité d'un service public | 3 | 2 | Mesures de base sur le web, le site de l'Office de Tourisme et les composants principaux du mobile ; aucun audit ni déclaration | 3 | 2 | Mairie |
| J8 | Nouveau. Absence de licence du dépôt et mentions incomplètes (LCEN, police mobile sans fichier OFL) | 2 | 2 | Licences des dépendances permissives | 2 | 2 | Équipe |
| J9 | Nouveau. Purges non implémentées : conservation au-delà des durées annoncées | 3 | 2 | Durées documentées dans le registre des traitements | 3 | 2 | DPO |
| J10 | Nouveau. Fuite ou consultation abusive des pièces d'identité | 2 | 4 | Chiffrement AES-256-GCM, accès ADMIN avec 2FA, consultation journalisée, images effacées à la décision | 1 | 4 | DSI |
| J11 | Nouveau. Ticket à gratter payé en EtherPoints avec un lot tiré au hasard, perçu comme un jeu de hasard | 2 | 3 | Points gratuits, non achetables ; achat réservé aux âges vérifiés | 2 | 3 | Mairie |

Correction apportée :

- **J2.** La déclaration de majorité est remplacée, pour jouer, par une vérification de la pièce d'identité. La probabilité résiduelle baisse, sans tomber à zéro : la pièce est jugée sur photo, sans contrôle de correspondance avec la personne, et un achat direct sur le contrat échappe au contrôle.
- **J3.** L'anonymisation laisse `payerWallet` et `transactionHash` dans la table `Ticket`, ce qui maintient en base le lien entre l'identifiant du compte et l'ancienne adresse (voir [Blockchain et données personnelles](blockchain-donnees.md)). La cotation résiduelle reste faible tant que l'email est supprimé, mais la mesure « effacement du lien entre compte et adresse » du registre initial est incomplète.

## Risques à traiter en priorité

| N° | Criticité résiduelle | Pourquoi |
|---|---|---|
| SC8 | 8 | Seul risque qui permette de truquer un tirage ; se traite par un simple transfert de propriété |
| J6, J7, J9, J11 | 6 | Écarts de conformité d'un service public, qualification du ticket à gratter |
| J10 | 4 | Impact maximal en cas de fuite : identité civile des citoyens |
| P5 | 6 | Le compte ADMIN pilote le tirage, la trésorerie et le disjoncteur |

Les risques résiduels SC1, SC2 et SC6 (criticité 4) et J1 (criticité 4) sont acceptés pour une démonstration sur réseau de test. Ils deviendraient bloquants pour une exploitation avec des fonds réels, tout comme SC8.

## Suivi

Le registre est revu :

- à chaque nouvelle version du contrat ;
- avant chaque déploiement sur Sepolia ;
- après tout incident, selon le [plan de réponse aux incidents](../infrastructure/incidents.md) ;
- quand une ligne de la page [Points à valider](points-a-valider.md) reçoit une réponse.
