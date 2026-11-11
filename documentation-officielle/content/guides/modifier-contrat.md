# Modifier le contrat

Modifier [`BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) ou [`BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) ne s'arrête pas au Solidity. Le backend embarque les ABI des contrats, décode leurs erreurs, indexe leurs événements et envoie leurs transactions : chaque changement d'interface se répercute dans quatre fichiers du backend, puis dans un redéploiement. Ce guide suit une modification complète, de l'éditeur à la blockchain locale.

> [!CAUTION]
> Un contrat déployé est immuable : il n'a pas de mécanisme de mise à jour (pas de proxy). Une nouvelle version est un nouveau contrat, à une nouvelle adresse, avec un état vide : tours, tickets, cagnottes et badges de l'ancien contrat y restent. Toute modification destinée à Sepolia se planifie entre deux tours, jamais pendant un tour ouvert.

L'exemple ajoute une limite de tickets par achat, `MAX_TICKETS_PER_PURCHASE`, qui borne la boucle de `_buyTickets` quelle que soit la configuration du tour.

## Fichiers à toucher

| Fichier | Modification |
| --- | --- |
| [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) | Constante, erreur, vérification |
| [`smart-contract/test/BlockLucky.test.ts`](src:smart-contract/test/BlockLucky.test.ts) | Test unitaire de la nouvelle règle |
| [`smart-contract/test/BlockLucky.t.sol`](src:smart-contract/test/BlockLucky.t.sol) | Test de fuzzing, si la règle porte sur une plage de valeurs |
| [`backend/src/blockchain/abi/BlockLucky.json`](src:backend/src/blockchain/abi/BlockLucky.json) | Régénéré par `npm run export:abi` |
| [`backend/src/blockchain/lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) | Traduction de la nouvelle erreur, nouvelle méthode éventuelle |
| [`backend/src/blockchain/chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts) | Classement de l'erreur pour les actions en file, si elle peut y survenir |
| [`backend/src/blockchain/lottery.indexer.ts`](src:backend/src/blockchain/lottery.indexer.ts) | Traitement d'un nouvel événement, voir [Indexer un nouvel événement](indexer-evenement.md) |
| [`documentation-officielle/content/_data/contrats.json`](src:documentation-officielle/content/_data/contrats.json) | Description des nouvelles fonctions, erreurs et événements |

## 1. Modifier le Solidity

```solidity
uint32 public constant MAX_TICKETS_PER_PURCHASE = 100;
```

```solidity
error PurchaseTooLarge(uint32 quantity, uint32 limit);
```

Dans `_buyTickets`, après le contrôle `quantity == 0` :

```solidity
if (quantity > MAX_TICKETS_PER_PURCHASE) revert PurchaseTooLarge(quantity, MAX_TICKETS_PER_PURCHASE);
```

Règles du contrat, vérifiées en revue et en partie par solhint et Slither :

| Règle | Application dans le contrat |
| --- | --- |
| Erreurs personnalisées avec paramètres, jamais `require(..., "message")` | `RoundSoldOut(roundId, remaining)`, `IncorrectPayment(expected, received)`. Imposé par la règle solhint `gas-custom-errors` |
| Un événement pour chaque changement d'état observable | `TicketsPurchased`, `DrawRequested`, `WinnerPicked`, `RoundConfigUpdated`... L'indexeur ne voit que les événements |
| Vérifications, puis effets, puis interactions | `claimPrize` passe `prizeClaimed` à `true` avant d'envoyer les ethers |
| `nonReentrant` sur toute fonction qui envoie des ethers ou appelle un contrat externe | `claimPrize`, `claimRefund`, `withdrawFees`, `requestDraw` |
| Droits par rôle | `onlyRole(DEFAULT_ADMIN_ROLE)` pour la configuration, `OPERATOR_ROLE` pour l'exploitation, `PAUSER_ROLE` pour le disjoncteur |
| Fonds en retrait, jamais poussés en boucle | `claimPrize`, `claimRefund` : un destinataire qui refuse les paiements ne bloque personne |
| Nouvelle configuration validée | `_validateRoundConfig`, `_validateVrfConfig` refusent les valeurs incohérentes avec `InvalidConfiguration` |
| `whenNotPaused` sur les entrées de fonds | `buyTickets`, `buyTicketsFor`, `requestDraw` |

Les règles de sécurité et les constats acceptés sont détaillés dans [Sécurité du contrat](../smart-contracts/securite.md).

## 2. Tester

Ajouter le cas dans le bloc `describe("Achat de tickets")` de [`BlockLucky.test.ts`](src:smart-contract/test/BlockLucky.test.ts). La configuration par défaut des tests (`maxTickets: 20`, `maxTicketsPerPlayer: 10`, [`fixtures.ts`](src:smart-contract/test/fixtures.ts)) bloquerait l'achat avant la nouvelle règle : le test déploie donc un contrat dont la configuration l'autorise.

```typescript
it("refuse un achat de plus de MAX_TICKETS_PER_PURCHASE tickets", async function () {
  const { lottery, admin, alice } = await loadFixture(deployLotteryFixture);
  await lottery
    .connect(admin)
    .setRoundConfig(defaultRoundConfig({ maxTickets: 500, maxTicketsPerPlayer: 500 }));
  await lottery.connect(admin).cancelRound();
  await expect(lottery.connect(alice).buyTickets(101, { value: TICKET_PRICE * 101n }))
    .to.be.revertedWithCustomError(lottery, "PurchaseTooLarge")
    .withArgs(101n, 100n);
});
```

`setRoundConfig` ne s'applique qu'au tour suivant : `cancelRound` clôt le tour courant et ouvre un tour avec la nouvelle configuration. Le compte `admin` de la fixture détient tous les rôles, comme dans les tests existants qui appellent déjà `lottery.connect(admin).cancelRound()`.

Puis, depuis `smart-contract/` :

```bash
npm run lint
npm test
npm run test:coverage
npm run coverage:check
npm run slither
```

| Commande | Attendu |
| --- | --- |
| `npm run lint` | zéro avertissement |
| `npm test` | tous les tests verts, y compris les 4 tests de fuzzing (256 exécutions chacun) |
| `npm run coverage:check` | `OK contracts/BlockLucky.sol : 100.00 % des lignes couvertes` : chaque nouvelle ligne doit être atteinte par un test |
| `npm run slither` | aucun nouveau constat de niveau Medium ou plus. Docker est nécessaire |
| `npm run test:gas` | facultatif : comparer le coût de `buyTickets` avant et après |

Un faux positif de Slither se consigne dans [`slither.db.json`](src:smart-contract/slither.db.json) en lançant Slither en mode triage, et la justification s'écrit dans [Sécurité du contrat](../smart-contracts/securite.md). Un vrai constat se corrige.

## 3. Exporter les ABI

```bash
npm run export:abi
```

Le script compile puis copie l'ABI de chaque contrat dans [`backend/src/blockchain/abi/`](src:backend/src/blockchain/abi/). Il affiche `BlockLucky : ABI exportée vers ...` pour un fichier modifié et `ABI à jour` sinon. La CI lance `node scripts/export-abi.mjs --check`, qui échoue si les fichiers du backend ne correspondent pas au contrat compilé : les ABI régénérées se commitent dans la même pull request que le Solidity.

## 4. Adapter le backend

### Traduire la nouvelle erreur

Les erreurs du contrat sont décodées par `decodeContractError` de [`chain-actions.ts`](src:backend/src/blockchain/chain-actions.ts), à partir des ABI, puis traduites par la table `CONTRACT_ERRORS` de [`lottery.gateway.ts`](src:backend/src/blockchain/lottery.gateway.ts) :

```typescript
PurchaseTooLarge: { status: 400, message: 'Trop de tickets dans un seul achat.' },
```

Une erreur absente de la table devient une réponse 502 générique « L'achat n'a pas pu être enregistré sur la blockchain » et un journal d'erreur : le citoyen ne comprend pas ce qui s'est passé. Toute nouvelle erreur atteignable depuis une route doit y figurer.

Pour une action exécutée en file (`CLAIM_PRIZE`, `CLAIM_REFUND`, `MINT_BADGE`), classer l'erreur dans `chain-actions.ts` :

| Ensemble | Effet |
| --- | --- |
| `ALREADY_DONE_ERRORS` | L'action est considérée comme faite, le job se termine sans erreur (`PrizeAlreadyClaimed`, `NothingToRefund`, `BadgeAlreadyMinted`) |
| `PERMANENT_ERRORS` | Le job échoue définitivement, sans nouvelle tentative (`NotWinner`, `RoundNotCompleted`...) |
| aucun | Le job est réessayé jusqu'à 5 fois |

### Appeler une nouvelle fonction

Une fonction ajoutée au contrat s'appelle par son nom, avec `getFunction`, dans une méthode de `LotteryGateway` :

```typescript
public async maxTicketsPerPurchase(): Promise<number> {
  return Number(await chainClient.lottery().getFunction('MAX_TICKETS_PER_PURCHASE')());
}
```

Une écriture passe par `sendAndIndex`, qui attend le reçu, l'indexe immédiatement et traduit les erreurs. Le signataire est `chainClient.operator` pour une action de la plateforme, ou `walletService.signerFor(user)` pour une action faite au nom d'un citoyen.

### Aligner les validations de l'API

La règle du contrat doit être reprise, au moins aussi stricte, dans le schéma Zod de la route : le citoyen reçoit alors une erreur 400 claire, sans transaction ni frais. Ici, `buyTicketSchema` de [`lottery.validators.ts`](src:backend/src/api/lottery/lottery.validators.ts) limite déjà `quantity` à 10.

### Nouvel événement

Un événement ajouté doit être traité par l'indexeur, sinon il n'existe pas pour la base, l'API et les clients : voir [Indexer un nouvel événement](indexer-evenement.md).

## 5. Vérifier sur la blockchain locale

L'image `blockchain` compile et déploie les contrats au démarrage : il faut la reconstruire. Le nœud Hardhat ne garde pas son état, la base doit donc repartir de zéro elle aussi.

```bash
docker compose down -v
docker compose up -d --build --wait
cd backend
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Les adresses locales ne changent pas : elles dépendent de l'ordre des déploiements dans [`deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts) et du nonce du compte déployeur, pas du code. Si l'ordre des transactions du script change, les adresses changent, et il faut mettre à jour `LOTTERY_CONTRACT_ADDRESS` et `POAP_CONTRACT_ADDRESS` dans [`env.config.ts`](src:backend/src/config/env.config.ts), [`backend/.env.example`](src:backend/.env.example), [`docker-compose.yml`](src:docker-compose.yml) et [`setup-chain-env.ts`](src:backend/__tests__/chain/setup-chain-env.ts). Les adresses déployées sont affichées dans les journaux du conteneur et écrites dans `deployments/localhost.json`.

Lancer enfin le test de bout en bout sur la chaîne :

```bash
cd backend
npm run test:chain
```

## 6. Documenter

| Page | Mise à jour |
| --- | --- |
| [Référence de BlockLucky](../smart-contracts/reference-blocklucky.md) | Générée depuis l'ABI : ajouter dans [`contrats.json`](src:documentation-officielle/content/_data/contrats.json) la description de chaque fonction, événement et erreur ajoutés, puis `npm run build` |
| [Contrat BlockLucky](../smart-contracts/blocklucky.md), [Cycle de vie d'un tour](../smart-contracts/cycle-tour.md) | Règle métier en clair |
| [Sécurité du contrat](../smart-contracts/securite.md) | Nouveau risque ou nouveau constat accepté |
| [Passerelle du contrat et erreurs](../integration-blockchain/passerelle.md) | Nouvelle traduction d'erreur |

Exemple d'entrées pour `contrats.json` :

```json
{
  "BlockLucky": {
    "fonctions": {
      "MAX_TICKETS_PER_PURCHASE": "Nombre maximal de tickets par appel à buyTickets ou buyTicketsFor (100)."
    },
    "erreurs": {
      "PurchaseTooLarge": "La quantité demandée dépasse MAX_TICKETS_PER_PURCHASE."
    }
  }
}
```

## 7. Déployer

Sur Sepolia, la nouvelle version est un nouveau contrat : suivre [Redéployer sur Sepolia](redeployer-sepolia.md). Le plan de retour arrière de la pull request doit dire ce qui arrive à l'ancien contrat : en général, pause de l'ancien contrat, dernier tour terminé ou annulé, remboursements réclamés, puis bascule du backend sur la nouvelle adresse.

## Liste de contrôle

- [ ] Erreur personnalisée, événement pour chaque changement d'état, `nonReentrant` et rôle si nécessaire.
- [ ] Tests unitaires, fuzzing si pertinent, couverture à 100 %.
- [ ] solhint et Slither verts.
- [ ] ABI exportées et commitées.
- [ ] `CONTRACT_ERRORS`, `ALREADY_DONE_ERRORS`, `PERMANENT_ERRORS` à jour.
- [ ] Indexeur adapté pour tout nouvel événement.
- [ ] Validation Zod alignée.
- [ ] `npm run test:chain` vert sur la blockchain locale reconstruite.
- [ ] `contrats.json` complété, documentation régénérée.
- [ ] Plan de migration de l'ancien contrat décrit dans la pull request.
