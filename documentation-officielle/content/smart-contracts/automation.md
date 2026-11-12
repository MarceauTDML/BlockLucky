# Chainlink Automation

Un tour ne se tire pas tout seul : une transaction doit appeler `requestDraw` quand les conditions sont réunies, ou `closeExpiredRound` quand le tour expire sans assez de participants. `BlockLucky` implémente l'interface `AutomationCompatibleInterface` de Chainlink pour que ce déclenchement puisse être confié à Chainlink Automation, un réseau de nœuds qui surveille les contrats et envoie les transactions de maintenance.

Dans le projet, cette interface est prête et le script [`register-automation-sepolia.ts`](src:smart-contract/scripts/register-automation-sepolia.ts) (`npm run automation:sepolia`) inscrit l'upkeep, mais **aucun upkeep Chainlink Automation n'est encore enregistré** : le contrat n'est pas déployé sur Sepolia, faute des clés et des fonds de test de l'équipe. Le déclenchement est assuré par le [keeper du backend](../integration-blockchain/keeper.md), qui appelle les mêmes prédicats. Cette page décrit l'interface, son comportement exact et la manière de basculer vers Chainlink Automation.

## Interface

```solidity
function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
    if (paused()) return (false, "");
    if (isDrawReady()) return (true, abi.encode(uint8(1)));
    if (isExpiredWithoutDraw()) return (true, abi.encode(uint8(2)));
    return (false, "");
}

function performUpkeep(bytes calldata) external override {
    if (!paused() && isDrawReady()) {
        requestDraw();
    } else if (isExpiredWithoutDraw()) {
        closeExpiredRound();
    } else {
        revert DrawNotReady(currentRoundId);
    }
}
```

### checkUpkeep

Fonction de lecture, appelée hors chaîne par les nœuds Automation à chaque bloc.

| Situation | `upkeepNeeded` | `performData` |
|---|---|---|
| Contrat en pause | `false` | vide |
| `isDrawReady()` vrai | `true` | `abi.encode(uint8(1))` |
| `isExpiredWithoutDraw()` vrai | `true` | `abi.encode(uint8(2))` |
| Sinon | `false` | vide |

Le paramètre `checkData` est ignoré. `performData` indique l'action attendue (1 pour un tirage, 2 pour une annulation), à titre informatif.

### performUpkeep

Fonction appelable par n'importe qui. Elle ne fait pas confiance à `performData`, qu'elle ignore : elle réévalue les conditions au moment de l'exécution. Une transaction envoyée sur la foi d'un `checkUpkeep` devenu obsolète, par exemple parce qu'un autre compte a tiré entre-temps, échoue proprement avec `DrawNotReady`.

`performUpkeep` n'a pas de contrôle d'accès, et c'est voulu : `requestDraw` et `closeExpiredRound` sont déjà publics. Restreindre `performUpkeep` au forwarder Chainlink n'apporterait aucune sécurité.

### Comportement en pause

Il existe une asymétrie à connaître :

- `checkUpkeep` renvoie `false` dès que le contrat est en pause, quelle que soit la situation ;
- `performUpkeep` en pause n'appelle pas `requestDraw`, mais appelle `closeExpiredRound` si le tour est expiré sans assez de participants, puisque cette fonction n'est pas bloquée par la pause.

En pratique, un upkeep Chainlink ne déclenchera rien en pause, car il ne lance `performUpkeep` que si `checkUpkeep` a renvoyé `true`. Un appel manuel à `performUpkeep` peut en revanche clore un tour expiré pendant la pause. Le test « ne fait rien quand aucune action n'est nécessaire ou en pause » vérifie le premier comportement sur un tour tirable : `checkUpkeep` renvoie `false` et `performUpkeep` revert avec `DrawNotReady`.

## Tests

Trois tests de [`test/BlockLucky.test.ts`](src:smart-contract/test/BlockLucky.test.ts) couvrent l'interface :

| Test | Vérifie |
|---|---|
| « signale un tirage à lancer puis l'exécute » | `checkUpkeep` vrai sur un tour tirable, `performUpkeep` émet `DrawRequested`, puis `checkUpkeep` redevient faux |
| « signale et clôture un tour expiré sans assez de participants » | `checkUpkeep` vrai sur un tour expiré vide, `performUpkeep` émet `RoundCancelled` |
| « ne fait rien quand aucune action n'est nécessaire ou en pause » | `checkUpkeep` faux en pause, `performUpkeep` revert `DrawNotReady` |

Coût mesuré par `npm run test:gas` : `checkUpkeep` de 24 327 à 31 687 gaz en simulation, `performUpkeep` de 142 501 gaz (annulation) à 214 837 gaz (tirage).

## Le keeper du backend à la place

Le backend embarque son propre automate, [`backend/src/blockchain/lottery.keeper.ts`](src:backend/src/blockchain/lottery.keeper.ts). Toutes les `KEEPER_INTERVAL_MS` millisecondes (10 000 par défaut), il :

1. prend un verrou Redis `chain:keeper-lock` pour qu'une seule instance agisse ;
2. ne fait rien si `paused()` est vrai ;
3. appelle `requestDraw` si `isDrawReady()` est vrai ;
4. sinon appelle `closeExpiredRound` si `isExpiredWithoutDraw()` est vrai ;
5. indexe immédiatement le reçu de la transaction.

Les erreurs `DrawNotReady` et `RoundNotCancellable`, attendues quand un autre compte a agi en premier, ne sont pas journalisées comme des avertissements.

Le keeper signe avec le compte opérateur, qui paie donc le gaz du tirage. Le contrat n'exige pourtant aucun rôle pour ces deux fonctions : si le backend tombe, un citoyen, la Mairie ou Chainlink Automation peut tirer à sa place.

| Critère | Keeper du backend | Chainlink Automation |
|---|---|---|
| Disponibilité | Celle du backend et de Redis | Réseau décentralisé de nœuds |
| Coût | Gaz payé par l'opérateur | Gaz et prime payés en LINK par l'upkeep |
| Mise en place | Aucune, actif en mode `onchain` | `npm run automation:sepolia`, avec du LINK de test |
| Indexation immédiate | Oui, le reçu est traité aussitôt | Non, l'indexeur lit l'événement au passage suivant |
| Fonctionne en local | Oui | Non, Automation n'existe pas sur le nœud Hardhat |

## Basculer vers Chainlink Automation

L'inscription est faite par [`scripts/register-automation-sepolia.ts`](src:smart-contract/scripts/register-automation-sepolia.ts), après le déploiement (voir [Déploiement sur Sepolia](sepolia.md)) :

```bash
npm run automation:sepolia
```

Le script :

1. vérifie que le réseau est Sepolia et lit `deployments/sepolia.json` ; il s'arrête si un upkeep y est déjà enregistré, sauf `AUTOMATION_FORCE=true` ;
2. lit la configuration du registrar Automation v2.1 (`getConfig`) et refuse un montant inférieur au minimum de LINK demandé ;
3. vérifie le solde LINK du déployeur, puis autorise le registrar à prélever le montant (`approve`) si l'autorisation en place ne suffit pas ;
4. appelle `registerUpkeep` avec un déclencheur conditionnel (logique personnalisée), l'adresse de `BlockLucky`, un `checkData` vide et la limite de gaz ;
5. lit l'identifiant de l'upkeep dans l'événement `RegistrationApproved` et l'ajoute à `deployments/sepolia.json` (section `automation` : registrar, registre, jeton LINK, identifiant, administrateur, gaz, LINK versés, date et transaction). Si Chainlink n'approuve pas l'inscription automatiquement, il s'arrête avec le hash de la demande en attente.

| Variable | Défaut | Effet |
|---|---|---|
| `AUTOMATION_LINK_AMOUNT` | `5` | LINK versés à l'upkeep |
| `AUTOMATION_GAS_LIMIT` | `500000` | Limite de gaz de `performUpkeep` ; le maximum mesuré est 214 837 gaz |
| `AUTOMATION_ADMIN_ADDRESS` | `admin` de `sepolia.json`, soit `MAIRIE_ADMIN_ADDRESS` | Administrateur de l'upkeep (recharge, pause, retrait) |
| `AUTOMATION_UPKEEP_NAME` | `BlockLucky EtherBay` | Nom affiché sur automation.chain.link |
| `SEPOLIA_AUTOMATION_REGISTRAR` | `0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976` | Registrar Automation v2.1 |
| `SEPOLIA_LINK_TOKEN` | `0x779877A7B0D9E8603169DdbD7836e478b4624789` | Jeton LINK de Sepolia |
| `AUTOMATION_FORCE` | vide | `true` pour inscrire un second upkeep |

Le suivi se fait sur `https://automation.chain.link/sepolia/<identifiant>`, adresse affichée par le script. Le keeper du backend peut rester actif : les deux coexistent, le premier qui agit l'emporte, l'autre reçoit `DrawNotReady` ou `RoundNotCancellable`, sans effet.

> [!NOTE]
> Un upkeep Automation et un abonnement VRF sont deux financements distincts. L'upkeep paie la transaction `performUpkeep` ; l'abonnement VRF paie la livraison de l'aléa qui suit.
