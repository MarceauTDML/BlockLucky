# Mode onchain ou simulé

Le backend fonctionne selon deux modes, choisis par la variable `BLOCKCHAIN_MODE` déclarée dans [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts). Le mode est lu une seule fois au démarrage : en changer impose de redémarrer l'API et le worker.

| Valeur | Défaut | Usage prévu |
|---|---|---|
| `onchain` | oui | Fonctionnement réel : nœud Hardhat local, Sepolia ou tout réseau EVM qui héberge les contrats |
| `simulated` | non | Tests unitaires et développement sans nœud blockchain |

Le test central est l'accesseur `chainClient.isOnchain` de [`backend/src/blockchain/chain.client.ts`](src:backend/src/blockchain/chain.client.ts), qui renvoie `env.BLOCKCHAIN_MODE === 'onchain'`. Chaque service du backend qui touche à la loterie commence par ce test et appelle soit la [passerelle du contrat](passerelle.md), soit l'ancienne implémentation simulée.

## Ce qui change entre les deux modes

| Fonction | Mode `onchain` | Mode `simulated` |
|---|---|---|
| État du tour (`GET /lottery/status`) | Lu dans le contrat (`currentRoundId`, `getRound`, `paused`), puis recopié en base par `upsertRoundFromChain` | Lu en base ; tour créé à la volée par `getCurrentOrCreateRound` ; fin de tour fixée à 48 h après `startedAt` ; prix fixe 0,01 ETH codé en dur |
| Achat de ticket | Transaction `buyTickets` signée par le portefeuille intégré, indexée depuis le reçu | Hachage de transaction aléatoire produit par `relayTicketPurchase`, numéro de bloc aléatoire à partir de 19 500 000, ticket écrit directement en base |
| Cadeau de ticket | Transaction `buyTicketsFor` payée par l'expéditeur | Ticket écrit en base au nom du destinataire, adresse de portefeuille aléatoire si le destinataire n'existe pas |
| Tirage | `requestDraw` sur le contrat, gagnant désigné par Chainlink VRF dans un bloc ultérieur | Gagnant choisi par `crypto.randomInt` parmi les tickets en base, identifiant VRF fictif `vrf-req-…` |
| Annulation | `cancelRound` sur le contrat, remboursements réclamés par la [file d'actions](actions.md) | Statut `CANCELLED` en base, aucun remboursement réel |
| Versement de la cagnotte | Automatique (job `CLAIM_PRIZE`) ou `POST /lottery/claim-prize` | Refusé avec une erreur 409 |
| Badges POAP | Frappés par le contrat `BlockLuckyPOAP`, lus avec `badgeOf` et `tokenURI` | Objets construits en mémoire, identifiant aléatoire, URL `ipfs://QmEtherBayPOAP2026/…` fictive |
| Disjoncteur | `pause` et `unpause` sur le contrat | Clé Redis `blockchain:circuit_breaker` et variable en mémoire |
| Reversement de la commission | `setTreasury` si besoin, puis `withdrawFees` | Hachage aléatoire, montant demandé renvoyé tel quel |
| Portefeuille (`GET /lottery/wallet`) | Portefeuille créé si besoin, dotation versée, solde lu sur la chaîne | Adresse en base, solde `null`, `explorerUrl` `null` |
| Webhook `POST /api/webhooks/blockchain` | Désactivé : réponse 409 | Point d'entrée de l'indexation simulée (`TICKET_PURCHASED`, `WINNER_PICKED`, `RPC_FALLBACK_SWITCH`) |
| Indexeur, keeper, file `chain-actions` | Démarrés | Non démarrés : `startChainServices` et `startChainActionsWorker` renvoient `null`, `enqueueChainAction` ne fait rien |
| Liens vers l'explorateur | Construits si `EXPLORER_URL` est défini | Toujours `null` |

Les réponses de l'API indiquent le mode. `GET /lottery/status` renvoie `guarantees.simulated` (`true` en mode simulé) et `guarantees.vrfCertified` (`true` seulement en mode onchain). `GET /lottery/wallet` renvoie `mode`. Le bloc `blockchain` des réponses, produit par `lotteryGateway.describe()`, contient `mode`, `chainId` et les adresses des contrats dans les deux modes.

> [!WARNING]
> En mode simulé, les champs `transactionHash`, `blockNumber`, `chainlinkRequestId` et `vrfProofHash` sont des valeurs aléatoires qui ne correspondent à aucune transaction. Elles ne doivent jamais être présentées comme vérifiables. La page [Ce qui est réel, ce qui est simulé](../presentation/reel-ou-simule.md) fait le bilan pour l'ensemble du projet.

### Ce qui ne change pas

- Les EtherPoints sont crédités dans les deux modes : 50 par ticket acheté, 75 pour l'expéditeur d'un ticket offert. En mode onchain, c'est l'[indexeur](indexeur.md#points-attribues) qui les crédite, et le destinataire d'un cadeau reçoit aussi ses 50 points de ticket ; en mode simulé, c'est le service de loterie, et seul l'expéditeur d'un cadeau est crédité.
- Un participant n'a qu'un ticket par tour : le contrôle est fait en base dans les deux modes, et en mode onchain aussi sur le contrat (`ticketsOf`, puis `maxTicketsPerPlayer` qui vaut 1 avec la configuration de déploiement par défaut). L'ancien plafond personnel de jeu responsable (clé Redis `user:ticket_limit:<userId>`) n'est plus lu : le profil renvoie toujours `responsibleGaming.maxTicketsPerRound: 1`.
- La vérification d'âge (`AGE_VERIFICATION_REQUIRED`) et les phases du tour (`OPEN`, `WAITING_ROOM`, `DRAWING`, `COMPLETED`, `CANCELLED`) existent dans les deux modes. En mode simulé, la salle d'attente s'ouvre à la fin des 48 heures et `revealAt` est calculé sans le keeper : aucun tirage n'a lieu automatiquement, il faut appeler `POST /lottery/draw`.
- `GET /lottery/wallet` renvoie `balanceEth: null` en mode simulé : il n'y a pas de solde d'ethers à afficher.
- Le schéma de base de données est identique. Les colonnes propres au mode onchain (`ticketIndex`, `payerWallet`, `ticketPriceWei`, `prizeWei`…) restent vides en mode simulé.

## Règle de production

Le schéma de configuration refuse de démarrer en production avec la simulation. Dans `superRefine`, quand `NODE_ENV` vaut `production` et que `BLOCKCHAIN_MODE` ne vaut pas `onchain`, la validation ajoute l'erreur suivante et le process s'arrête avec le code 1 :

```text
Configuration invalide, démarrage interrompu :
  - BLOCKCHAIN_MODE : BLOCKCHAIN_MODE doit valoir onchain en production : la simulation est réservée au développement
```

La même validation interdit en production les valeurs de développement de `RELAYER_PRIVATE_KEY` et `ENCRYPTION_KEY` (le compte Hardhat n° 0 et la clé `0123…cdef`). Un déploiement de production en mode onchain doit donc fournir une vraie clé d'opérateur et une vraie clé de chiffrement des portefeuilles. Le détail est sur la page [Variables d'environnement](../backend/variables-environnement.md).

[`docker-compose.yml`](src:docker-compose.yml) fixe `NODE_ENV: production` et `BLOCKCHAIN_MODE: onchain` pour les services `backend` et `worker`. Les secrets y sont lus depuis l'environnement de l'hôte (`${RELAYER_PRIVATE_KEY:-}`) : sans eux, le démarrage échoue, ce qui est voulu.

## Mode des tests unitaires

Le fichier [`backend/__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts), déclaré dans `setupFiles` de la configuration Jest de [`backend/package.json`](src:backend/package.json), force trois variables avant tout import :

```typescript
process.env.LOGIN_EMAIL_CODE_REQUIRED = 'false';
process.env.ADMIN_MFA_REQUIRED = 'false';
process.env.BLOCKCHAIN_MODE = 'simulated';
```

`npm test` tourne donc toujours en mode simulé, sans nœud, avec Prisma et Redis remplacés par des doubles en mémoire ([`backend/__tests__/__mocks__/prisma.mock.ts`](src:backend/__tests__/__mocks__/prisma.mock.ts), [`backend/__tests__/__mocks__/redis.mock.ts`](src:backend/__tests__/__mocks__/redis.mock.ts)). Le mode onchain est couvert par une suite séparée, `npm run test:chain`, dont le fichier d'environnement [`backend/__tests__/chain/setup-chain-env.ts`](src:backend/__tests__/chain/setup-chain-env.ts) force au contraire `BLOCKCHAIN_MODE=onchain`. Voir [Tests sur une vraie chaîne](tests.md).

## Choisir le mode en développement

Le fichier `backend/.env.example` livre `BLOCKCHAIN_MODE="onchain"`. Le développement normal suppose donc que le service `blockchain` de Docker Compose tourne (`docker compose up -d --wait` démarre le nœud Hardhat, déploie les contrats aux adresses par défaut et lance le répondeur VRF local). La procédure est décrite sur la page [Blockchain locale](../smart-contracts/blockchain-locale.md).

Passer en `simulated` est utile pour travailler sur l'interface ou sur les EtherPoints sans nœud. Dans ce cas, il faut garder à l'esprit que :

- les tickets sont créés sans transaction et sans numéro de ticket (`ticketIndex` vide) ;
- un ticket simulé n'est jamais retrouvé par l'indexeur si l'on repasse en mode onchain : la base contient alors des tours et des tickets qui n'existent pas sur la chaîne. Il faut réinitialiser la base (`npm run prisma:reset`) avant de revenir au mode onchain ;
- le webhook simulé exige une signature HMAC valide, produite par `signWebhookPayload` de [`backend/src/api/webhooks/webhook-signature.ts`](src:backend/src/api/webhooks/webhook-signature.ts).
