# Pourquoi Ethereum, Hardhat et Chainlink

Cette page justifie les quatre choix structurants de la partie on-chain : la plateforme (Ethereum et ses réseaux de test), l'outillage (Hardhat 3), les briques de sécurité (OpenZeppelin) et la source de hasard (Chainlink VRF). Le raisonnement complet, y compris le portefeuille intégré, figure dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md).

## Contraintes de départ

Le kickoff de l'école fixe le cadre :

| Exigence du kickoff | Conséquence technique |
|---|---|
| « Créer un smart contract pour une loterie simple » | Un contrat déployable, pas une simulation côté serveur |
| Tickets achetés « avec des ethers fictifs » | Une chaîne compatible Ethereum, en local ou sur un réseau de test |
| Un gagnant choisi « au hasard » après un nombre de participants ou une durée | Deux conditions de clôture et une source d'aléa non manipulable |
| Critère de sélection : un smart contract « solide et sécurisé » | Bibliothèques auditées, tests automatisés, analyse statique |
| Ressources indiquées : Solidity, Hardhat, Remix | Solidity comme langage, Hardhat comme outil principal, compatibilité Remix conservée |
| Étapes : environnement, création, test, déploiement, soutenance | Scripts de déploiement reproductibles et démonstration possible hors ligne |

La première version du backend ne respectait pas ce cadre : les hash de transaction étaient fabriqués, l'aléa venait de `crypto.randomInt` et la cagnotte n'était jamais versée. Le mode `BLOCKCHAIN_MODE=simulated` en garde la trace, réservé aux tests unitaires et au développement sans nœud (voir [Mode onchain ou simulé](../integration-blockchain/modes.md)).

## Ethereum et Sepolia

Le contrat cible l'EVM, avec deux réseaux :

- **un nœud Hardhat local** (chain ID 31337), qui fournit des comptes approvisionnés en ethers fictifs, se lance dans Docker et redémarre vierge ;
- **Sepolia** (chain ID 11155111), le réseau de test public d'Ethereum, où l'ETH s'obtient gratuitement sur des faucets et où le coordinateur Chainlink VRF v2.5 est disponible.

Ces deux réseaux répondent littéralement à l'exigence des « ethers fictifs » : l'ether de test n'a aucune valeur marchande. C'est aussi ce qui rend le modèle de portefeuille intégré acceptable (voir [Crypto-actifs et MiCA](../juridique/crypto-actifs.md)).

L'écosystème EVM apporte le reste : Solidity, OpenZeppelin, Chainlink, ethers v6 côté backend, et la vérification du code source sur Etherscan, qui permet à n'importe quel citoyen de relire le contrat déployé.

## Hardhat 3 plutôt que Remix seul ou Foundry

### Ce que le kickoff compare

Le kickoff présente Remix et Hardhat côte à côte. Voici sa comparaison, résumée, et ce que le projet en retient.

| Caractéristique | Remix | Hardhat | Usage dans BlockLucky |
|---|---|---|---|
| Nature | IDE web | Outil en ligne de commande, installé par npm | Hardhat pour le dépôt et la CI |
| Compilation | Compilateur intégré avec interface graphique | Commande de compilation (`hardhat build` en version 3) | `npm run build` |
| Déploiement | Depuis l'interface | Par scripts, vers n'importe quel réseau | [`deploy-local.ts`](src:smart-contract/scripts/deploy-local.ts), [`deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) et les scripts d'abonnement VRF, d'upkeep et de vérification |
| Tests | Module de tests en Solidity | Tests en JavaScript ou TypeScript | 50 tests TypeScript, plus 4 tests de fuzzing Solidity que Hardhat 3 exécute aussi |
| Débogage | Débogueur de transactions | Débogage des transactions et des tests | Messages d'erreur personnalisés décodés par les tests |
| Réseau local | Machine virtuelle JavaScript dans le navigateur | `hardhat node` | Nœud Hardhat dans Docker, partagé avec le backend |
| Usage principal | Débutants, prototypage | Développement professionnel, tests avancés, déploiements complexes | Les deux : Hardhat pour livrer, Remix pour montrer |

### Pourquoi pas Remix seul

Remix ne permet ni tests automatisés en CI, ni mesure de couverture, ni déploiement scripté et reproductible. Or le projet a besoin d'adresses déterministes pour que le backend trouve les contrats sans configuration, d'un oracle VRF local qui tourne en continu et d'une CI qui bloque toute régression. Remix reste utile pour la soutenance : les deux contrats y compilent tels quels (voir [Utiliser Remix](remix.md)).

### Pourquoi pas Foundry

Foundry est une alternative sérieuse, rapide et centrée sur Solidity. Hardhat 3 a été préféré pour trois raisons vérifiables dans le dépôt :

1. **Il fait partie des ressources du kickoff**, contrairement à Foundry.
2. **Il exécute aussi les tests Solidity de style Foundry.** [`test/BlockLucky.t.sol`](src:smart-contract/test/BlockLucky.t.sol) hérite de `Test` de `forge-std` (déclaré en dépendance de développement) et Hardhat 3 le lance avec `npm test`, 256 exécutions par test de fuzzing. Le projet obtient le fuzzing sans deuxième chaîne d'outils.
3. **Il partage le langage du backend.** Les scripts de déploiement, l'oracle local et les tests Mocha sont en TypeScript avec ethers v6, comme le backend. Les types `RoundConfig` et `VrfConfig` de [`scripts/lib/deployment.ts`](src:smart-contract/scripts/lib/deployment.ts) reprennent les structures du contrat.

Hardhat 3 apporte enfin le keystore chiffré (`npx hardhat keystore set`), utilisé pour les secrets Sepolia, la vérification Etherscan (`@nomicfoundation/hardhat-verify`, appelé par `npm run verify:sepolia`) et le rapport de gaz (`--gas-stats`).

### Configuration retenue

Extrait de [`hardhat.config.ts`](src:smart-contract/hardhat.config.ts) :

```typescript
const compiler = {
  version: "0.8.34",
  settings: {
    evmVersion: "prague",
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
```

Les profils `default` et `production` utilisent le même compilateur. Le mock `VRFCoordinatorV2_5Mock` est compilé depuis npm grâce à `npmFilesToBuild`. Le réseau `localhost` lit `LOCAL_RPC_URL` (par défaut `http://127.0.0.1:8545`) ; le réseau `sepolia` lit `SEPOLIA_RPC_URL` et `SEPOLIA_PRIVATE_KEY` par `configVariable`, qui les cherche dans le keystore ou dans l'environnement.

## OpenZeppelin

Le contrat n'écrit aucune primitive de sécurité lui-même. Il importe celles d'OpenZeppelin Contracts 5.6.1, auditées et largement déployées :

| Module | Usage |
|---|---|
| `AccessControl` | Trois rôles distincts (`DEFAULT_ADMIN_ROLE`, `OPERATOR_ROLE`, `PAUSER_ROLE`) au lieu d'un unique propriétaire |
| `Pausable` | Disjoncteur sur l'achat et le tirage |
| `ReentrancyGuard` | Verrou `nonReentrant` sur toutes les fonctions qui déplacent des fonds ou demandent un tirage |
| `ERC721` | Base du badge POAP |
| `Strings` | Construction de `tokenURI` |

La version 5 apporte des erreurs personnalisées (`AccessControlUnauthorizedAccount`, `EnforcedPause`, `ERC721NonexistentToken`) que le backend décode comme les erreurs propres du contrat (voir [la passerelle du contrat](../integration-blockchain/passerelle.md)).

## Chainlink VRF plutôt que prevrandao

Tirer un gagnant suppose une source d'aléa que personne ne peut prévoir ni orienter. Trois options ont été étudiées.

| Option | Prévisible | Manipulable | Prouvable | Verdict |
|---|---|---|---|---|
| `block.prevrandao`, `blockhash` ou `block.timestamp` | Oui, par le validateur avant de publier le bloc | Oui : un validateur peut renoncer à proposer un bloc défavorable | Non | Écarté |
| Tirage par le backend (`crypto.randomInt`) | Non | Oui, par l'exploitant | Non | Écarté, c'était la version simulée |
| Chainlink VRF v2.5 | Non avant la réponse de l'oracle | Non : la preuve est vérifiée par le coordinateur on-chain | Oui | Retenu |

Avec `prevrandao`, la valeur est connue du validateur qui produit le bloc, et une transaction de tirage peut être rejouée ou abandonnée selon le résultat. Pour une loterie dont la cagnotte dépasse la récompense d'un bloc, l'incitation à tricher existe.

Chainlink VRF fournit un mot aléatoire accompagné d'une preuve cryptographique vérifiée par le contrat coordinateur avant l'appel de `rawFulfillRandomWords`. Ni la Mairie, ni le backend, ni l'opérateur du nœud Chainlink ne peuvent choisir la valeur. Le contrat demande un seul mot (`numWords: 1`) et en déduit le ticket gagnant. Le détail est sur la page [Tirage Chainlink VRF](chainlink-vrf.md).

Le choix de VRF a deux coûts, assumés :

- **un abonnement Chainlink à financer** en LINK de test ou en ETH Sepolia, et un contrat à ajouter comme consommateur ;
- **un tirage asynchrone** : le tour reste en état `Drawing` entre la demande et la réponse, ce qui impose de gérer l'oracle muet (`retryDraw`, `cancelRound`).

En local, le coordinateur est remplacé par `VRFCoordinatorV2_5Mock`, dont l'aléa est déterministe. Ce n'est acceptable que pour le développement (voir [Limites connues](limites.md)).

## Chainlink Automation

Le contrat implémente `AutomationCompatibleInterface` (`checkUpkeep` et `performUpkeep`). Le tirage peut donc être déclenché par Chainlink Automation sans dépendre du backend. Dans le projet, c'est le keeper du backend qui joue ce rôle ; le script `npm run automation:sepolia` inscrit l'upkeep, mais aucun n'est enregistré tant que le contrat n'est pas déployé sur Sepolia : voir [Chainlink Automation](automation.md).
