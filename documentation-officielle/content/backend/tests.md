# Tests

Le backend a deux niveaux de tests automatisés. La suite principale, lancée par `npm test`, exerce l'application Express de bout en bout avec Supertest, en mode `BLOCKCHAIN_MODE=simulated`, sur des doublures en mémoire de Prisma et de Redis : elle ne demande ni base, ni Redis, ni nœud. La suite de chaîne, lancée par `npm run test:chain`, rejoue le parcours complet sur une vraie base PostgreSQL, un vrai Redis et un nœud Hardhat avec les contrats déployés. La stratégie de test de l'ensemble du dépôt est décrite dans [Tests et qualité](../contribuer/tests-qualite.md).

## Commandes

Depuis `backend/` :

| Commande | Effet |
|---|---|
| `npm test` | `jest --runInBand` : toutes les suites `__tests__/**/*.test.ts`, en série |
| `npm run test:coverage` | idem avec rapport de couverture dans `coverage/` |
| `npm run test:chain` | `jest --runInBand --config jest.chain.config.json` : suite `__tests__/chain/**/*.chain.ts` |
| `npx jest __tests__/api/auth-security.test.ts` | une seule suite |
| `npx jest -t "révoque le jeton"` | les tests dont le titre contient ce texte |

La configuration principale est dans la section `jest` de [`backend/package.json`](src:backend/package.json) : préréglage `ts-jest`, environnement `node`, dossier `dist/` ignoré et fichier de préparation `__tests__/setup-env.ts`. Elle ne fixe aucun seuil de couverture.

## Résultats actuels

Exécution de `npx jest` sur la branche de travail, le 11 novembre 2026 :

```text
Test Suites: 13 passed, 13 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        33.055 s
```

Avec `npm run test:coverage`, sur l'ensemble des fichiers chargés par les suites :

| Mesure | Couverture |
|---|---|
| Instructions | 65,96 % (1 791 sur 2 715) |
| Branches | 42,63 % (440 sur 1 032) |
| Fonctions | 59,62 % (288 sur 483) |
| Lignes | 67,24 % (1 675 sur 2 491) |

Le chemin `onchain` des services (passerelle, indexeur réel, keeper, file d'actions, portefeuilles) n'est pas exécuté par cette suite, ce qui explique l'essentiel des branches non couvertes. Il est couvert par la suite de chaîne.

## Préparation de l'environnement

[`backend/__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts) s'exécute avant chaque suite et fixe :

```typescript
process.env.LOGIN_EMAIL_CODE_REQUIRED = 'false';
process.env.ADMIN_MFA_REQUIRED = 'false';
process.env.BLOCKCHAIN_MODE = 'simulated';
process.env.AGE_VERIFICATION_REQUIRED = 'false';
```

Jest définit `NODE_ENV=test`, ce qui coupe la création du client Redis, l'envoi SMTP, le dépôt S3, les logs et les métriques par défaut, et relève les limites de débit à 10 000 requêtes. Les suites qui testent le code email, la 2FA obligatoire des administrateurs ou la vérification d'âge modifient `env.LOGIN_EMAIL_CODE_REQUIRED`, `env.ADMIN_MFA_REQUIRED` ou `env.AGE_VERIFICATION_REQUIRED` au début du test ou de la suite et les restaurent à la fin. La vérification d'âge n'est réactivée que dans des blocs de `lottery.test.ts` et `marketplace.test.ts`.

## Doublures de Prisma et Redis

Chaque suite remplace les deux modules de configuration avant d'importer l'application :

```typescript
jest.mock('../../src/config/prisma.config', () => ({
  __esModule: true,
  prisma: prismaMock,
  default: prismaMock,
}));

jest.mock('../../src/config/redis.config', () => ({
  __esModule: true,
  redis: redisMock,
  default: redisMock,
}));

import app from '../../src/app';
```

| Doublure | Fichier | Comportement |
|---|---|---|
| `prismaMock` | [`backend/__tests__/__mocks__/prisma.mock.ts`](src:backend/__tests__/__mocks__/prisma.mock.ts) | une `Map` par modèle (`user`, `identityDocument`, `token`, `lotteryRound`, `ticket`, `pointTransaction`, `partner`, `rewardCatalog`, `claimedReward`, `analytics`) et des fonctions `jest.fn` qui imitent les requêtes utilisées par le code ; `resetPrismaMockStore()` vide tout |
| `redisMock` | [`backend/__tests__/__mocks__/redis.mock.ts`](src:backend/__tests__/__mocks__/redis.mock.ts) | une `Map` ; `get`, `set`, `setIfAbsent`, `del`, `ping` (`disabled`), `close` ; `getRawClient()` renvoie `null` ; `resetRedisMockStore()` vide tout |

Ces doublures ont des limites à garder en tête en écrivant un test :

| Limite | Conséquence |
|---|---|
| `$transaction` exécute les opérations par `Promise.all` | pas d'atomicité ni de retour arrière |
| Ni contrainte `CHECK`, ni contrainte d'unicité, ni clé étrangère | les traductions d'erreurs 409 du gestionnaire d'erreurs ne sont pas testées |
| Les durées de vie Redis sont ignorées | l'expiration d'un code OTP, d'une révocation ou d'une clé d'idempotence n'est pas testée |
| `getRawClient()` renvoie `null` | aucune file BullMQ : les emails partent par l'envoi direct, les workers ne sont jamais exécutés |
| Pas de `chainCursor` | l'indexeur réel n'est pas testable avec cette doublure |

Une nouvelle requête Prisma dans le code doit être ajoutée à la doublure, sinon le test échoue sur une fonction absente.

## Suites

| Suite | Tests | Ce qui est vérifié |
|---|---|---|
| `api/auth-security.test.ts` | 10 | code email exigé avant création du compte ; code invalidé après 5 essais ; révocation à la déconnexion ; rejet d'un JWT d'un autre algorithme ou sans émetteur ; 2FA imposée aux administrateurs ; rôle du jeton relu en base ; rejet du rejeu TOTP ; ré-authentification pour désactiver la 2FA ; types analytiques réservés ; isolation entre partenaires |
| `api/auth.test.ts` | 3 | écrans d'accueil ; refus sans certification 18+ ; inscription, +25 points, configuration et vérification TOTP |
| `api/auth-password.test.ts` | 10 | inscription après code email ; refus d'une seconde inscription ; politique de mot de passe et conditions ; activation d'un compte créé par un cadeau ; message unique d'échec ; blocage après 10 échecs, adresse inconnue comprise ; code TOTP demandé ; réinitialisation et révocation des sessions ; mot de passe défini sur un compte sans mot de passe ; `hasPassword` et `ageVerificationStatus` dans le profil |
| `api/auth-oauth.test.ts` | 8 | jetons Google et Apple vérifiés avec audience, émetteur et clés ; email non vérifié ou jeton rejeté ; 503 sans configuration ; création puis reconnexion par email ; 2FA demandée avant la session |
| `api/identity.test.ts` | 7 | envoi chiffré au repos et statut `PENDING` ; corps de plus de 1 Mo accepté sur cette route seule ; image trop lourde, format inconnu ou face manquante ; session exigée ; consultation, approbation, effacement des images et email ; motif obligatoire puis nouvel envoi ; routes réservées à l'ADMIN et interdiction de statuer sur sa propre pièce |
| `api/lottery.test.ts` | 11 | statut et paliers ; phase, salle d'attente et participants ; achats refusés en salle d'attente ; ticket unique, +50 points et numéro ; second ticket refusé ; cadeau ; cadeau à une personne qui a déjà son ticket ; numéro et résultat dans `my-tickets` ; achat, cadeau et échange refusés sans âge vérifié, puis achat accepté ; métadonnées POAP |
| `api/idempotency.test.ts` | 2 | rejeu d'un achat avec la même clé sans second ticket ; refus d'une clé mal formée |
| `api/marketplace.test.ts` | 5 | catalogue, échange, QR code dans « Mes codes » ; ticket à gratter : débit et récompense en stock, refus sans points et sans débit, 404 sans récompense, offre inconnue et âge exigé |
| `api/partners.test.ts` | 1 | création d'entreprise et d'offre, import CSV, statistiques |
| `api/user.test.ts` | 1 | quêtes, limite de jeu responsable, export RGPD, suppression confirmée |
| `api/settings.test.ts` | 17 | prénom et nom : enregistrement, effacement par chaîne vide, refus des valeurs invalides, présence dans l'export RGPD ; catégories de notifications par défaut, fusion partielle, préférences anciennes complétées, refus d'une valeur non booléenne, notifications masquées ; changement d'email par code, mot de passe exigé, adresse déjà prise, compte sans mot de passe et mauvais code, confirmation sans demande ; premier mot de passe, mot de passe actuel exigé, révocation des anciennes sessions et nouvelle session ; message au support avec adresse de réponse, validation de l'objet et du message, session exigée |
| `api/admin.test.ts` | 2 | refus 403 pour un USER ; tableau de bord, disjoncteur, trésorerie, export CSV, audit pour un ADMIN |
| `api/system.test.ts` | 8 | sondes de vivacité et de disponibilité, `X-Request-Id`, `/api/config`, préfixe `/api/v1`, `/metrics`, JSON mal formé, CORS |
| `integration/blockchain-indexer.test.ts` | 4 | indexation idempotente par webhook signé, rejeu ignoré, signature absente ou périmée, corps invalide |
| `integration/full-draw-flow.test.ts` | 1 | inscription, achat, tirage simulé, gagnant |
| `services/keeper.test.ts` | 3 | attente de `DRAW_REVEAL_DELAY_SECONDS` avant `requestDraw` ; tirage immédiat si le délai vaut 0 ; clôture sans attente d'un tour expiré sans assez de participants |
| `services/ledger.test.ts` | 2 | crédit et débit avec historique, refus d'un débit supérieur au solde |
| `services/totp.test.ts` | 2 | secret, code, QR code et vérification ; format des codes de secours |

Plusieurs suites (`admin`, `auth-security`, `partners`, `full-draw-flow`) signent directement leurs jetons avec `sessionService.sign(...)` après insertion du compte dans la doublure ; les autres passent par `POST /auth/login`, qui délivre le jeton immédiatement puisque le code email est désactivé.

## Test sur une vraie chaîne

[`backend/__tests__/chain/onchain-lottery.chain.ts`](src:backend/__tests__/chain/onchain-lottery.chain.ts) contient deux tests, avec un délai de 120 secondes par test ([`backend/jest.chain.config.json`](src:backend/jest.chain.config.json)). Sa préparation [`setup-chain-env.ts`](src:backend/__tests__/chain/setup-chain-env.ts) force `BLOCKCHAIN_MODE=onchain`, `NODE_ENV=development`, les adresses des contrats locaux, désactive le code email, la 2FA obligatoire et la vérification d'âge, et met `DRAW_REVEAL_DELAY_SECONDS` à 0 s'il n'est pas défini.

1. **Achat, cadeau, tirage et versement.** Deux citoyens se connectent ; leur portefeuille intégré est différent de l'adresse envoyée et a reçu la dotation. Le statut est en phase `OPEN` sans `revealAt`. Alice achète son ticket, dont le numéro a 5 chiffres, puis un second achat est refusé en 409 `PlayerLimitReached`. Bob achète le sien, en offre un à Dave, puis se voit refuser un cadeau à Alice, qui a déjà son ticket. Le test avance le temps du nœud (`evm_increaseTime`, `evm_mine`) au-delà de la fin du tour, appelle `runKeeperOnce()` qui demande le tirage, attend que l'indexeur enregistre le gagnant, vérifie que la cagnotte vaut 90 % des 3 tickets et que l'historique donne le numéro gagnant et `isWinner`, attend le versement par le worker `chain-actions` puis la frappe des POAP visibles dans `my-tickets`.
2. **Disjoncteur.** Un administrateur met le contrat en pause par `POST /api/v1/admin/circuit-breaker` ; `paused()` vaut `true` sur la chaîne ; un achat renvoie 503 avec `circuitBreaker: true` ; la reprise remet `paused()` à `false`.

Prérequis : PostgreSQL et Redis joignables, nœud Hardhat lancé avec les contrats et l'oracle VRF local (conteneur `blockchain` de `docker-compose.yml`), base migrée et vierge, cohérente avec l'état de la chaîne. Le test crée ses comptes avec un suffixe unique et suppose un tour ouvert sur la chaîne.

```bash
docker compose up -d --wait
cd backend
npx prisma migrate deploy
npm run test:chain
```

> [!WARNING]
> Ce test écrit dans la base désignée par `DATABASE_URL` et avance l'horloge du nœud local. Ne le lancez jamais contre une base ou une chaîne partagées. Après son exécution, le tour local est terminé ; redémarrez le nœud et réinitialisez la base pour retrouver l'état initial. Le fonctionnement côté blockchain est détaillé dans [Tests sur une vraie chaîne](../integration-blockchain/tests.md).

## Intégration continue

Le workflow `.github/workflows/ci.yml` exécute les deux suites dans des jobs séparés.

| Job | Services | Étapes du backend |
|---|---|---|
| `backend` | PostgreSQL et Redis de CI | `npm ci`, `npm audit --omit=dev --audit-level=high`, `npx prisma generate`, `npm run env:check`, `npm run typecheck`, `npm run lint`, `npx prisma migrate deploy`, contrôle de dérive `prisma migrate diff`, `npm test -- --ci`, `npm run compile` |
| `chain` | PostgreSQL, Redis et image `blocklucky-chain:ci` construite depuis `smart-contract/` | `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run test:chain -- --ci`, journaux du nœud en cas d'échec |

La couverture du backend n'est pas mesurée en CI. Le détail des jobs est dans [Intégration continue](../infrastructure/ci.md).

## Écrire un test

1. Créer `__tests__/<dossier>/<sujet>.test.ts`.
2. Déclarer les deux `jest.mock` avant `import app from '../../src/app'`.
3. Appeler `resetPrismaMockStore()` et `resetRedisMockStore()` dans `beforeEach`.
4. Insérer les données nécessaires par les fonctions de la doublure (`prismaMock.user.create(...)`) et signer un jeton avec `sessionService.sign`.
5. Appeler l'API avec `request(app)` et vérifier statut, `success`, `data` ou `errors`.
6. Pour un email, espionner `emailService.sendTemplateEmail` avec `jest.spyOn` et lire les variables reçues.

Le guide [Ajouter un endpoint](../guides/ajouter-endpoint.md) contient un exemple complet.
