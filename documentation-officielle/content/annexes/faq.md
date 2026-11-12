# FAQ

Questions fréquentes des développeurs qui reprennent le projet et du jury. Chaque réponse renvoie vers la page de référence.

## Le projet

### De l'argent réel est-il en jeu ?

Non. Les tickets s'achètent en ethers fictifs : ceux du nœud Hardhat local, ou ceux du réseau de test Sepolia, qui n'ont aucune valeur marchande. Les EtherPoints sont des points de fidélité sans valeur monétaire, échangés contre des avantages chez des commerçants partenaires fictifs. La qualification juridique d'un tel dispositif, s'il devenait réel, est discutée dans [Crypto-actifs et MiCA](../juridique/crypto-actifs.md) et [Veille juridique](../juridique/veille-juridique.md).

### Qu'est-ce qui est réel et qu'est-ce qui est simulé ?

Le smart contract, le tirage par Chainlink VRF, les portefeuilles intégrés, l'indexation et le keeper fonctionnent réellement sur une chaîne. En local, seul l'oracle VRF est simulé. Certaines données restent codées en dur, comme le centre de notifications. La liste complète est dans [Réel, simulé ou à venir](../presentation/reel-ou-simule.md) et [Dette technique et limites](dette-technique.md).

### Pourquoi un portefeuille intégré plutôt que MetaMask ?

Le public visé n'a pas de portefeuille Ethereum et ne doit pas avoir à en installer un. Le backend crée donc une clé par citoyen, la chiffre en AES-256-GCM et signe à sa place. Le prix de ce confort est la garde des clés par le serveur. La décision est argumentée dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md) et ses risques dans [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md).

### Pourquoi les EtherPoints ne sont-ils pas sur la chaîne ?

Ce sont des points de fidélité, crédités et débités très souvent, sans valeur à transférer entre citoyens. Les mettre sur la chaîne coûterait du gas à chaque mouvement et en ferait un jeton échangeable, avec des conséquences réglementaires. Ils vivent dans PostgreSQL, avec un historique complet dans `PointTransaction`. Voir [Boutique et récompenses](../backend/modules/boutique.md).

### Le tirage est-il vraiment aléatoire ?

Sur Sepolia, oui : l'aléa vient de Chainlink VRF, avec une preuve vérifiée par le coordinateur avant que le contrat ne désigne le gagnant. Ni la Mairie, ni le backend ne peuvent choisir le résultat. En local, l'oracle est simulé par `local-vrf-responder.ts` et le coordinateur `VRFCoordinatorV2_5Mock` produit un aléa dérivé de l'identifiant de requête : le mécanisme est identique, l'imprévisibilité ne l'est pas. Voir [Tirage Chainlink VRF](../smart-contracts/chainlink-vrf.md).

### Que devient l'argent si le backend tombe ?

Les mises et la cagnotte sont détenues par le contrat, pas par le backend. Le gagnant d'un tour reste désigné sur la chaîne et sa cagnotte reste réclamable par `claimPrize`. Mais comme le backend détient les clés des portefeuilles intégrés, c'est lui qui signe ce retrait : sans lui (ou sans `ENCRYPTION_KEY`), un citoyen ne peut pas agir seul. Voir [Limites connues](../smart-contracts/limites.md).

## Développement

### Comment se connecter en développement ?

Sur le web, la connexion se fait par code envoyé par email. En local, les emails arrivent dans Mailpit, à l'adresse `http://localhost:8025`. Avec `NODE_ENV=development`, la réponse de `POST /api/auth/login` contient aussi le code dans le champ `devOtpPreview`. Sur mobile, la connexion se fait par email et mot de passe (`POST /api/auth/signin`). Les trois comptes de démonstration créés par le seed ont le mot de passe `EtherBay2026demo` et un âge déjà vérifié. Voir [Comptes de démonstration et connexion](../demarrage/comptes-et-connexion.md).

### Où est la documentation de l'API ?

Swagger UI est servi par le backend sur `/api/docs` (par exemple `http://localhost:2053/api/docs`). Certains résumés y sont anciens ; la référence fiable, générée depuis les routes, est [Référence de l'API](../backend/reference-api.md).

### Comment déclencher un tirage sans attendre la fin du tour ?

Un tirage n'est possible que si le tour compte au moins `minTicketsToDraw` tickets (2 par défaut) et que son échéance est passée ou tous ses tickets vendus. Avant, `POST /api/lottery/draw` répond 409 (`DrawNotReady`). En local, deux solutions :

- avancer l'horloge du nœud Hardhat, puis miner un bloc ; le tour passe en salle d'attente et le keeper lance le tirage une fois écoulé le délai de révélation (`DRAW_REVEAL_DELAY_SECONDS`, 600 secondes par défaut ; le mettre à 0 dans `backend/.env` pour un tirage dans les 10 secondes) :

  ```bash
  curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"evm_increaseTime","params":[1800]}' http://127.0.0.1:8545
  ```

  ```bash
  curl -s -X POST -H "content-type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"evm_mine","params":[]}' http://127.0.0.1:8545
  ```

- raccourcir les tours au déploiement avec la variable `ROUND_DURATION_SECONDS`, lue par `deploy-local.ts` (30 minutes par défaut). Le service Compose `blockchain` la lit dans le fichier `.env` placé à la racine du dépôt (par exemple `ROUND_DURATION_SECONDS=180`), puis il faut recréer le conteneur avec `docker compose up -d --force-recreate blockchain`. Une blockchain neuve oblige à vider les tours, les tickets et `ChainCursor` en base, à remettre `welcomeGrantTxHash` à `NULL` et à effacer les clés `bull:chain-actions:*` et `blocklucky:development:chain:*` de Redis.

Un tour prêt peut aussi être tiré depuis le dashboard Mairie (`POST /api/lottery/draw`) : cet appel n'attend pas le délai de révélation du keeper.

### Pourquoi mon achat échoue-t-il en 403 ?

Le compte n'a pas encore d'âge vérifié. Avec `AGE_VERIFICATION_REQUIRED=true` (valeur par défaut, obligatoire en production), l'achat, le cadeau, l'échange d'une récompense et le ticket à gratter répondent 403 avec le code `AGE_VERIFICATION_REQUIRED` tant que `User.ageVerificationStatus` ne vaut pas `VERIFIED`. Le citoyen envoie sa pièce depuis `/profil/identite` sur le web ou depuis l'application mobile, puis un administrateur la valide sur `/mairie/identites`. Sur le web, la billetterie relit le statut à chaque chargement et quand l'onglet reprend le focus : l'approbation est prise en compte sans nouvelle connexion. Les comptes du seed sont déjà vérifiés. Voir [Vérification d'âge requise](../mobile/portefeuille-loterie.md#verification-d-age-requise).

### Pourquoi un second achat échoue-t-il en 409 ?

Un participant n'a droit qu'à un ticket par grand tirage. Le backend refuse le second achat, ou un cadeau à une personne qui a déjà son ticket, avec 409 et `contractError: PlayerLimitReached`. Le contrat applique la même règle (`maxTicketsPerPlayer` à 1 au déploiement).

### Pourquoi mon achat échoue-t-il en 402 ?

Le portefeuille intégré n'a pas assez d'ethers fictifs pour le prix des tickets et le gas. Causes habituelles : la dotation de bienvenue n'a pas pu être versée (opérateur sans fonds), ou la chaîne locale a été réinitialisée alors que la base indique la dotation comme déjà versée. Voir [Runbooks blockchain](../infrastructure/runbooks-blockchain.md).

### Après un redémarrage, plus rien ne fonctionne côté loterie. Pourquoi ?

Le nœud Hardhat ne garde pas son état : un redémarrage du conteneur `blockchain` repart d'une chaîne vierge, tandis que PostgreSQL garde l'ancien état. Le worker l'annonce par un message « Le curseur d'indexation dépasse la tête de chaîne ». La procédure est dans [Chaîne locale réinitialisée](../infrastructure/runbooks-blockchain.md#chaine-locale-reinitialisee). En développement, le plus simple est `docker compose down -v` puis de relancer migrations et seed.

### Quand utiliser le mode simulé ?

Pour travailler sur le backend ou les interfaces sans nœud blockchain, par exemple sur une machine où Docker n'est pas disponible. Le mode simulé produit des transactions fictives et ne teste rien de l'intégration réelle. Il est refusé en production. Voir [Mode onchain ou simulé](../integration-blockchain/modes.md).

### Comment tester l'application sur un téléphone ?

Remplacer `localhost` par l'adresse IP du poste dans `mobile-app/.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`), et vérifier que le pare-feu du poste laisse passer le port 2053. Voir [Tester sur un téléphone](../mobile/telephone-physique.md).

### Comment donner le rôle administrateur à un compte ?

Il n'existe pas d'écran pour cela. Le seed crée un administrateur (`maire@etherbay.fr`) ; pour un autre compte, modifier la colonne `role` de la table `User` en base. En production, un administrateur doit activer la double authentification avant d'accéder à l'espace Mairie (`ADMIN_MFA_REQUIRED`). Voir [Autorisations et matrice des droits](../securite/autorisations.md).

## Exploitation

### Pourquoi l'API refuse-t-elle de démarrer dans la stack Docker ?

La stack tourne en `NODE_ENV=production`, qui exige des secrets réels : `JWT_SECRET`, `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY`, `WEBHOOK_SECRET` et `METRICS_TOKEN`, dans un fichier `.env` à la racine du dépôt. Le message `Configuration invalide, démarrage interrompu` liste les variables en cause. Voir [Docker Compose](../infrastructure/docker-compose.md#secrets-obligatoires).

### Pourquoi l'API et le worker sont-ils deux processus ?

Pour que le travail de fond (emails, EtherPoints, indexation, keeper, actions on-chain) ne ralentisse pas les réponses HTTP, et pour pouvoir dimensionner l'API sans multiplier le keeper. En développement, un seul processus fait tout (`RUN_WORKERS=true`). Voir [Files et workers](../backend/files-workers.md).

### La CI déploie-t-elle l'application ?

Non. Elle vérifie le code, construit les images et les analyse, mais ne publie aucune image et ne déploie rien. Le déploiement de démonstration est manuel. Voir [Intégration continue](../infrastructure/ci.md) et [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md).

### Les contrats sont-ils déployés sur Sepolia ?

Non. Les scripts sont prêts (`npm run vrf:sepolia`, `deploy:sepolia`, `automation:sepolia`, `verify:sepolia`) et répartissent les rôles entre le multisig de la Mairie, la trésorerie et l'opérateur, mais leur exécution demande les clés et les fonds de test de l'équipe, et aucune adresse Sepolia n'est versionnée dans le dépôt. La démonstration en ligne utilise un nœud Hardhat sur la VM. Voir [Déploiement sur Sepolia](../smart-contracts/sepolia.md).

### Les notifications push fonctionnent-elles ?

Non. Le centre de notifications renvoie trois notifications écrites en dur dans le backend, et l'application mobile n'enregistre aucun jeton de notification auprès d'Expo. Sur le web, la bannière « push » de l'aide est simulée ; sur mobile, l'écran Notifications affiche la même liste. Voir [Dette technique et limites](dette-technique.md).

### Que faire en cas de faille suspectée dans le contrat ?

Activer le disjoncteur depuis l'espace Mairie ou par `POST /api/admin/circuit-breaker` : achats et tirages sont bloqués, les gagnants et les participants d'un tour annulé peuvent toujours retirer leurs fonds. Puis suivre [Réponse aux incidents](../infrastructure/incidents.md).

## Données personnelles

### La suppression d'un compte efface-t-elle tout ?

Elle anonymise le compte en base, efface la clé chiffrée du portefeuille, le mot de passe haché et le motif d'un refus de vérification d'âge, et supprime la pièce d'identité éventuellement en attente. Les transactions déjà inscrites sur la chaîne restent publiques et ne peuvent pas être effacées, mais l'adresse n'est plus reliée à une identité côté BlockLucky. Voir [Suppression RGPD](../architecture/flux/suppression-rgpd.md) et [Blockchain et données personnelles](../juridique/blockchain-donnees.md).

### Quelles données sont envoyées à des tiers ?

En démonstration, aucune : les emails restent dans Mailpit et la chaîne est locale. Seule la connexion Google, si elle est configurée, fait intervenir ce fournisseur, qui délivre le jeton d'identité vérifié par le backend. Sur Sepolia, les adresses et transactions deviennent publiques. Le registre complet est dans [Registre des traitements](../juridique/registre-traitements.md).
