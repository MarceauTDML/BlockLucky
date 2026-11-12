# Avant une mise en production

BlockLucky n'a jamais été mis en production réelle : la démonstration `etherbay.tech` est une vitrine pédagogique sur Sepolia, avec des ethers fictifs. Cette page est la liste de contrôle à dérouler avant tout déploiement destiné à de vrais citoyens, même sur un réseau de test. Chaque point renvoie au fichier ou à la page qui le détaille. Les cases sont à cocher dans la pull request ou le ticket de mise en production.

> [!CAUTION]
> Le modèle de portefeuille intégré est custodial : le backend détient les clés privées des citoyens. C'est acceptable avec des ethers sans valeur sur un réseau de test. Sur un réseau principal, avec des actifs ayant une valeur, l'opérateur deviendrait prestataire de services sur crypto-actifs au sens du règlement MiCA (voir [Crypto-actifs et MiCA](../juridique/crypto-actifs.md) et [Points à valider](../juridique/points-a-valider.md)). Cette liste ne couvre pas ce changement de régime.

## 1. Secrets

Le backend refuse de démarrer en `NODE_ENV=production` si l'un des quatre secrets garde sa valeur de développement (`DEV_DEFAULTS` de [`env.config.ts`](src:backend/src/config/env.config.ts)). Ce contrôle évite l'oubli, pas une valeur faible : chaque secret doit être généré aléatoirement.

| Secret | Format exigé | Rôle | Si perdu ou divulgué |
| --- | --- | --- | --- |
| `JWT_SECRET` | 16 caractères au moins | Signature des sessions | Divulgué : toutes les sessions peuvent être forgées, changer la valeur déconnecte tout le monde |
| `ENCRYPTION_KEY` | 64 caractères hexadécimaux | Chiffrement des clés privées des portefeuilles et des secrets TOTP | **Perdu : les portefeuilles des citoyens et la 2FA par application deviennent inutilisables, sans recours.** Divulgué avec une copie de la base : tous les portefeuilles sont compromis |
| `RELAYER_PRIVATE_KEY` | `0x` puis 64 caractères hexadécimaux | Compte opérateur : rôles `OPERATOR_ROLE`, `PAUSER_ROLE`, `MINTER_ROLE`, dotations de bienvenue, gas du keeper | Divulgué : un tiers peut mettre en pause, annuler un tour, frapper des badges et vider le solde de l'opérateur |
| `WEBHOOK_SECRET` | 8 caractères au moins | Signature des webhooks blockchain entrants | Divulgué : des webhooks peuvent être forgés |
| `METRICS_TOKEN` | non vide si `METRICS_ENABLED=true` | Accès à `/metrics` et au détail de `/health/deep` | Divulgué : fuite d'informations d'exploitation |

Générer une valeur hexadécimale de 64 caractères :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`RELAYER_PRIVATE_KEY` prend le préfixe `0x` devant cette valeur, ou la clé exportée d'un portefeuille créé pour l'occasion.

Liste de contrôle :

- [ ] Les cinq secrets sont générés pour cet environnement, jamais réutilisés d'un autre.
- [ ] Ils sont stockés dans le gestionnaire de secrets de l'hébergeur ou un fichier `.env` lisible par le seul utilisateur du service, jamais dans le dépôt.
- [ ] `ENCRYPTION_KEY` est sauvegardée **séparément** de la base, dans un coffre, par au moins deux personnes habilitées.
- [ ] Le mot de passe PostgreSQL n'est pas `etherbay_password` : [`docker-compose.yml`](src:docker-compose.yml) l'écrit en clair dans `DATABASE_URL` et dans le service `postgres`.
- [ ] `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` ne valent pas `minioadmin`. Le schéma ne refuse pas ces valeurs en production : le contrôle est manuel.
- [ ] `SMTP_USER` et `SMTP_PASS` sont ceux d'un vrai relais SMTP.

## 2. Configuration de production

`NODE_ENV=production` active des contrôles au démarrage. Le processus s'arrête avec la liste des erreurs si l'un échoue :

| Variable | Exigence en production |
| --- | --- |
| `LOGIN_EMAIL_CODE_REQUIRED` | ne peut pas être `false` |
| `ADMIN_MFA_REQUIRED` | ne peut pas être `false` : tout compte `ADMIN` doit activer la 2FA |
| `AGE_VERIFICATION_REQUIRED` | ne peut pas être `false` : achat, cadeau, échange et ticket à gratter exigent un âge vérifié |
| `BLOCKCHAIN_MODE` | doit valoir `onchain` : la simulation est refusée |
| `METRICS_TOKEN` | obligatoire si `METRICS_ENABLED=true` |
| `JWT_SECRET`, `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY`, `WEBHOOK_SECRET` | valeur de développement refusée |

En production, les réponses de connexion ne contiennent plus le code à usage unique (`devOtpPreview`, renvoyé seulement en `development`).

Liste de contrôle :

- [ ] `NODE_ENV=production` pour l'API, le worker et le job de migration.
- [ ] `FRONTEND_URL` vaut l'URL publique du frontend web (elle sert aussi aux liens des emails RGPD).
- [ ] `CORS_ORIGINS` ne contient que les origines publiques, sans `localhost`.
- [ ] `TRUST_PROXY` vaut le nombre de proxys devant l'API (`1` derrière Caddy seul), sinon la limitation de débit voit l'adresse du proxy pour tous les clients.
- [ ] `LOG_LEVEL` n'est pas `debug`.
- [ ] `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL` sont passées au **build** de l'image web : elles sont figées dans le JavaScript publié.
- [ ] `EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_WS_URL` pointent vers l'API publique dans le build mobile.
- [ ] `SITE.lotteryAppUrl` de l'Office de Tourisme ne vaut plus `http://localhost:3000` (voir [Servir et déployer](../office-tourisme/deploiement.md#avant-une-mise-en-ligne)).
- [ ] `MAINTENANCE_MODE=false`.
- [ ] `DRAW_REVEAL_DELAY_SECONDS` est validé avec le responsable événementiel (600 secondes par défaut).
- [ ] Pour la connexion Google et Apple, `GOOGLE_CLIENT_IDS` et `APPLE_CLIENT_IDS` listent les identifiants client des applications publiées, et le build mobile reçoit les `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` correspondants. Vides, les deux routes répondent 503.
- [ ] La procédure d'examen des pièces d'identité est confiée à des agents habilités, avec un délai de traitement annoncé aux citoyens (voir [Points à valider](../juridique/points-a-valider.md)).
- [ ] `SCRATCH_COST_VIOLET` et `SCRATCH_COST_LUCKY` sont validés ; le mobile affiche les prix par défaut, écrits dans son code.

Toutes les variables sont décrites dans [Variables d'environnement](../backend/variables-environnement.md).

## 3. Base de données et migrations

| Règle | Raison |
| --- | --- |
| Les migrations sont appliquées par le job dédié (cible `migrator` du [`backend/Dockerfile`](src:backend/Dockerfile), service `migrate` de Compose), une fois, avant l'API | Pas de course entre instances, ADR 0003 |
| Seule `prisma migrate deploy` est lancée en production | `migrate dev` et `migrate reset` peuvent supprimer des données |
| Le seed n'est **jamais** lancé en production | [`prisma/seed.ts`](src:backend/prisma/seed.ts) crée un compte `ADMIN` `maire@etherbay.fr`, un compte `PARTNER`, un citoyen, deux partenaires et un tour fictif |
| Chaque migration est compatible avec la version précédente du code | Retour arrière possible sans restaurer la base |

Liste de contrôle :

- [ ] Sauvegarde complète prise juste avant la migration, et restauration testée.
- [ ] `npm run prisma:status` montre l'état attendu avant et après.
- [ ] Le premier compte administrateur est créé par une procédure tracée (promotion d'un compte existant en `ADMIN` en base), puis active sa 2FA à la première connexion.
- [ ] Les comptes et partenaires de démonstration n'existent pas.

Voir [Migrations](../base-de-donnees/migrations.md) et [Ajouter une migration](../guides/ajouter-migration.md).

## 4. Smart contract

Le contrat est immuable : une erreur de configuration au déploiement oblige à redéployer et à repartir d'une base vide.

Liste de contrôle :

- [ ] Les contrats sont ceux du commit fusionné dans `main`, CI verte (tests, couverture 100 %, Slither).
- [ ] Trois comptes distincts : administrateur de la Mairie (`DEFAULT_ADMIN_ROLE`), opérateur du backend, trésorerie. Idéalement l'administrateur et la trésorerie sont des portefeuilles multi-signatures (`MAIRIE_ADMIN_ADDRESS`, `MAIRIE_TREASURY_ADDRESS` du script).
- [ ] Les paramètres des tours sont validés par la Mairie : `TICKET_PRICE_WEI`, `MAX_TICKETS`, `MIN_TICKETS_TO_DRAW`, `MAX_TICKETS_PER_PLAYER`, `ROUND_DURATION_SECONDS`, `MUNICIPALITY_FEE_BPS` (20 % au plus, imposé par le contrat).
- [ ] L'abonnement Chainlink VRF est financé et le contrat y est ajouté comme consommateur.
- [ ] Le code source des deux contrats est vérifié sur Etherscan.
- [ ] L'opérateur a reçu `OPERATOR_ROLE` et `PAUSER_ROLE` sur `BlockLucky` et `MINTER_ROLE` sur `BlockLuckyPOAP`.
- [ ] `treasury()` du contrat vaut déjà l'adresse de trésorerie qui sera saisie dans le dashboard Mairie.
- [ ] `POAP_BASE_URI` pointe vers l'API publique (`https://<api>/api/v1/lottery/poap/`).
- [ ] `deployments/sepolia.json` et `deployments/sepolia-blocklucky-args.ts`, non versionnés, sont archivés avec la documentation de mise en production.

> [!WARNING]
> Le reversement de la commission (`withdrawFees` de [`lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts)) appelle `setTreasury` avec l'adresse saisie si elle diffère de la trésorerie du contrat. `setTreasury` exige `DEFAULT_ADMIN_ROLE`, que l'opérateur n'a pas quand l'administrateur est un compte distinct : le retrait échoue alors avec « Le compte opérateur du backend n'a pas le rôle requis ». Fixer la trésorerie depuis le compte administrateur avant la mise en service, et saisir exactement cette adresse dans le dashboard.

La procédure de déploiement est dans [Déploiement sur Sepolia](../smart-contracts/sepolia.md) et [Redéployer sur Sepolia](../guides/redeployer-sepolia.md).

## 5. Raccordement du backend à Sepolia

Liste de contrôle :

- [ ] `CHAIN_ID=11155111`.
- [ ] `RPC_URL` est un accès RPC dédié (fournisseur avec clé, quota connu) et `FALLBACK_RPC_URL` un second fournisseur différent. La valeur par défaut de secours est le nœud public `ethereum-sepolia-rpc.publicnode.com`, sans garantie de service.
- [ ] `LOTTERY_CONTRACT_ADDRESS` et `POAP_CONTRACT_ADDRESS` sont celles de `deployments/sepolia.json`.
- [ ] `CHAIN_START_BLOCK` vaut le `deploymentBlock` du fichier de déploiement : l'indexeur ne parcourt pas tout l'historique de Sepolia.
- [ ] `CHAIN_CONFIRMATIONS=2` au moins, pour ne pas indexer un bloc qui serait réorganisé.
- [ ] `EXPLORER_URL=https://sepolia.etherscan.io`, pour les liens de transparence.
- [ ] Le compte opérateur est approvisionné : chaque inscription coûte `WELCOME_GRANT_WEI` (0,5 ETH par défaut) plus le gas, le premier achat d'un participant dans un tour déclenche la frappe de son badge POAP, payée par l'opérateur, et le keeper paie le gas de `requestDraw`. Prévoir le solde pour le nombre d'inscriptions attendu.
- [ ] Un achat de test, un tirage et un versement de cagnotte ont été observés de bout en bout sur l'explorateur.

Voir [Mode onchain ou simulé](../integration-blockchain/modes.md) et [Client RPC et compte opérateur](../integration-blockchain/client-rpc.md).

## 6. Infrastructure

Liste de contrôle :

- [ ] Images construites depuis `main` par la CI, avec Trivy vert.
- [ ] L'API, le worker et le frontend ne publient leurs ports que sur `127.0.0.1`, derrière le proxy HTTPS. Dans [`docker-compose.yml`](src:docker-compose.yml), `backend` (`2053`), `web` (`3000`) et `tourisme` (`4000`) sont publiés sur toutes les interfaces.
- [ ] Le nœud Hardhat local (`blockchain`) n'est pas démarré : il sert au développement seulement.
- [ ] Mailpit n'est pas démarré : les emails partent par le relais SMTP réel.
- [ ] L'API tourne avec `RUN_WORKERS=false` et un worker séparé, comme dans Compose. Le keeper est protégé par un verrou Redis et l'indexeur est idempotent, ce qui tolère plusieurs processus, mais un worker séparé isole les tâches blockchain et les envois d'emails de l'API qui répond aux citoyens, et simplifie la supervision.
- [ ] Redis est persistant (`--appendonly yes`, `--appendfsync everysec`) et en `noeviction` : les files BullMQ et les verrous ne doivent jamais être évincés.
- [ ] Les en-têtes de sécurité sont actifs sur chaque domaine (vérifier avec `curl -I`).

Voir [Environnements](../infrastructure/environnements.md) et [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md).

## 7. Sauvegardes

| Donnée | Mécanisme | À vérifier |
| --- | --- | --- |
| PostgreSQL | `pg_dump -Fc` planifié, copie hors de la machine | Restauration testée dans une base temporaire |
| Redis | AOF sur le volume `redisdata` | Le volume est inclus dans les sauvegardes de la machine |
| Tickets, tirages, cagnottes | Le contrat est la source de vérité | La reconstruction depuis la chaîne est documentée (curseur `ChainCursor`) |
| `ENCRYPTION_KEY`, `RELAYER_PRIVATE_KEY` | Coffre de secrets | Deux personnes savent les restaurer |
| Fichiers de déploiement des contrats | Archive hors dépôt | Adresses, bloc de déploiement, arguments du constructeur |

Liste de contrôle :

- [ ] Une sauvegarde automatique quotidienne au moins (objectif de perte de données : 24 heures).
- [ ] Une restauration complète a été répétée sur un environnement de test, chronométrée (objectif : 1 heure).

Voir [Sauvegardes et reprise](../infrastructure/sauvegardes.md) et [Reconstruire depuis la chaîne](../base-de-donnees/reconstruction.md).

## 8. Supervision

| Sonde ou indicateur | Point d'accès | Usage |
| --- | --- | --- |
| Vivacité de l'API | `GET /health/live` | Redémarrage du conteneur |
| Disponibilité | `GET /health/ready` (base joignable, 503 pendant l'arrêt) | Retrait du répartiteur de charge |
| Diagnostic complet | `GET /health/deep` avec `Authorization: Bearer <METRICS_TOKEN>` | Base, Redis, réseau blockchain, version |
| Métriques Prometheus de l'API | `GET /metrics` avec le même jeton | `http_request_duration_seconds`, `http_requests_in_flight`, `queue_jobs_total`, `business_events_total` |
| Sondes du worker | port `PORT + 1` (`2054`) : `/health/live`, `/metrics` | Supervision du worker séparé |

Liste de contrôle :

- [ ] Les sondes sont branchées sur l'orchestrateur ou un service de surveillance externe.
- [ ] `/metrics` est collecté, et des alertes existent sur le taux d'erreurs des achats, les jobs en échec (`queue_jobs_total{status="failed"}`) et l'absence de tirage après l'échéance d'un tour.
- [ ] Le solde du compte opérateur et celui de l'abonnement VRF sont surveillés : aucune métrique ne les expose aujourd'hui, la surveillance se fait sur l'explorateur ou dans le Subscription Manager de Chainlink.
- [ ] Les journaux JSON sont centralisés et conservés selon la durée prévue au [Registre des traitements](../juridique/registre-traitements.md).
- [ ] Les procédures de [Runbooks](../infrastructure/runbooks.md), [Runbooks blockchain](../infrastructure/runbooks-blockchain.md) et [Réponse aux incidents](../infrastructure/incidents.md) sont connues de l'équipe d'astreinte, en particulier l'activation du disjoncteur.

Les objectifs de service sont dans [Objectifs de service et métriques](../infrastructure/slo-metriques.md).

## 9. Conformité

- [ ] Les mentions légales, CGU, la politique de confidentialité et le registre des traitements décrivent l'exploitant réel, et non la ville fictive.
- [ ] La qualification juridique de la loterie et les autorisations éventuelles sont validées par le service juridique de la Ville (voir [Veille juridique](../juridique/veille-juridique.md)).
- [ ] La déclaration d'accessibilité est publiée.
- [ ] Le fichier `security.txt` désigne une adresse surveillée.

## 10. Le jour de la mise en service

1. Activer `MAINTENANCE_MODE=true` si une version précédente est en service.
2. Sauvegarder la base.
3. Lancer le job de migration, vérifier `npm run prisma:status`.
4. Déployer le worker, puis l'API, puis les frontends.
5. Vérifier `/health/deep` et un parcours complet avec un compte de test : connexion, achat, consultation du ticket sur l'explorateur.
6. Désactiver le mode maintenance.
7. Surveiller les métriques pendant la première heure.

Le plan de retour arrière est celui de la pull request : redéployer l'image précédente, la migration étant compatible avec l'ancienne version du code. Un contrat déjà déployé ne se retire pas : en cas de problème sur la chaîne, activer le disjoncteur (`pause`) puis annuler le tour pour rembourser les participants.
