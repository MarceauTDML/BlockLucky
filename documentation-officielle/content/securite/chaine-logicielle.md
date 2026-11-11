# Chaîne logicielle

La chaîne logicielle couvre tout ce qui entre dans le produit sans être écrit par l'équipe : dépendances npm, images Docker, actions GitHub, compilateur Solidity. Elle couvre aussi les contrôles automatiques qui empêchent un secret ou une vulnérabilité connue d'atteindre la branche `main`. Les contrôles sont définis dans [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml), [`.github/workflows/codeql.yml`](src:.github/workflows/codeql.yml) et [`.github/dependabot.yml`](src:.github/dependabot.yml). Le fonctionnement général de la CI est décrit dans [Intégration continue](../infrastructure/ci.md) et la politique de mise à jour dans [Dépendances](../contribuer/dependances.md).

## Vue d'ensemble

| Contrôle | Outil | Déclenchement | Bloquant |
|---|---|---|---|
| Secrets dans l'historique Git | gitleaks 8.30.1 | Chaque pull request et push sur `main` | Oui |
| Analyse statique JavaScript et TypeScript | CodeQL, requêtes `security-extended` | Pull request, push sur `main`, chaque lundi à 03 h 17 UTC | Les alertes remontent dans l'onglet Security de GitHub |
| Vulnérabilités des dépendances | `npm audit --omit=dev` | Job de chaque projet modifié | Oui |
| Vulnérabilités des images | Trivy 0.76.2 | Job `docker` | Oui, sur CRITICAL et HIGH corrigeables |
| Analyse statique Solidity | Slither 0.11.6 | Job `contracts` | Oui, dès le niveau Medium |
| Règles Solidity | solhint, zéro avertissement | Job `contracts` | Oui |
| Couverture du contrat | `npm run coverage:check`, 100 % des lignes | Job `contracts` | Oui |
| Secrets et source maps dans le bundle web | `grep` et `find` sur `.next/static` | Job `web` | Oui |
| Mises à jour | Dependabot | Hebdomadaire ou mensuel | Pull requests à relire |

## gitleaks

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
  with:
    fetch-depth: 0
    persist-credentials: false
- name: Historique Git complet
  run: >-
    docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1
    git /repo --no-banner --redact --config /repo/.gitleaks.toml
```

`fetch-depth: 0` récupère tout l'historique : un secret ajouté puis supprimé dans un commit ultérieur est quand même détecté. `--redact` masque la valeur trouvée dans le journal de la CI. [`.gitleaks.toml`](src:.gitleaks.toml) étend les règles par défaut et n'autorise que deux valeurs publiques, la clé de chiffrement de développement et la clé n°0 de Hardhat, toutes deux refusées par le backend en production.

Le job ne dépend pas du filtre de chemins : il s'exécute sur toute pull request.

## CodeQL

Le workflow `CodeQL` analyse le langage `javascript-typescript` avec la suite `security-extended`, qui ajoute aux requêtes par défaut des règles de sécurité de précision moyenne. Sont exclus : `node_modules`, les dossiers `__tests__` et la bibliothèque tierce `frontend-office-tourisme/assets/js/vendor`. Le job reçoit uniquement les permissions `contents: read`, `security-events: write` et `actions: read`.

Le code Solidity n'est pas couvert par CodeQL ; il l'est par Slither.

## npm audit

| Projet | Commande | Seuil |
|---|---|---|
| `backend` | `npm audit --omit=dev --audit-level=high` | Hautes et critiques |
| `frontend-web` | idem | Hautes et critiques |
| `mobile-app` | idem | Hautes et critiques |
| `smart-contract` | `npm audit --omit=dev --audit-level=critical` | Critiques seulement |

`--omit=dev` limite l'audit aux dépendances de production. Le seuil plus permissif du projet `smart-contract` est justifié dans l'[ADR 0004](../architecture/adr/0004-smart-contract-portefeuille-integre.md) : les alertes hautes viennent de dépendances transitives de `@chainlink/contracts` (sources OpenZeppelin 4.x non importées, outillage JavaScript), qui n'entrent ni dans le bytecode déployé ni dans le backend.

Toutes les installations de la CI utilisent `npm ci`, qui respecte strictement le `package-lock.json` et vérifie les empreintes d'intégrité. La version de Node.js vient de [`.nvmrc`](src:.nvmrc) (22).

## Trivy

Après la construction des images, le job `docker` analyse `blocklucky-backend`, `blocklucky-web` et `blocklucky-tourisme` :

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.76.2 image \
  --quiet --exit-code 1 --ignore-unfixed --severity CRITICAL,HIGH "$image:${{ github.sha }}"
```

`--ignore-unfixed` ignore les vulnérabilités sans correctif publié : le job échoue seulement quand une mise à jour existe. L'image de la blockchain locale n'est pas analysée, car elle ne sert qu'au développement et aux tests. Les images elles-mêmes sont construites à partir de bases `-slim` ou `-alpine`, exécutées sous un utilisateur non root ; voir [Images Docker](../infrastructure/images.md).

## Slither

[`smart-contract/scripts/slither.sh`](src:smart-contract/scripts/slither.sh) lance l'image `ghcr.io/crytic/slither:0.11.6`, installe `solc` 0.8.34 et analyse `BlockLucky.sol` puis `BlockLuckyPOAP.sol` avec `--fail-medium`. [`smart-contract/slither.config.json`](src:smart-contract/slither.config.json) exclut `node_modules`, les contrats de test et les constats informatifs ou d'optimisation.

Les constats examinés et acceptés sont consignés dans [`smart-contract/slither.db.json`](src:smart-contract/slither.db.json) :

| Détecteur | Niveau | Fonction | Raison de l'acceptation |
|---|---|---|---|
| `reentrancy-no-eth` | Medium | `_requestRandomness` | L'appel externe va au coordinateur VRF, adresse de confiance ; les fonctions appelantes sont protégées par `nonReentrant` |
| `reentrancy-benign` | Low | `_requestRandomness` | Même cause |
| `reentrancy-events` | Low | `_requestRandomness` | Événement émis après l'appel au coordinateur |
| `timestamp` (5 constats) | Low | `isExpiredWithoutDraw`, `isDrawReady`, `performUpkeep`, `_buyTickets`, `retryDraw` | La durée d'un tour se compte en heures ; la marge de manipulation de l'horodatage par un validateur, de quelques secondes, est sans effet |

Les raisons ci-dessus résument l'analyse ; la base de triage elle-même ne contient que l'identifiant, le détecteur et la description de chaque constat. Un nouveau constat de niveau Medium ou supérieur fait échouer la CI tant qu'il n'est ni corrigé ni ajouté à cette base. La sécurité du contrat est traitée en détail dans [Sécurité du contrat](../smart-contracts/securite.md) et ses tests dans [Tests, fuzzing et couverture](../smart-contracts/tests.md).

## Dependabot

| Écosystème | Dossier | Fréquence | Particularités |
|---|---|---|---|
| npm | `/backend`, `/smart-contract`, `/frontend-web` | Hebdomadaire, le lundi | Mineures et correctifs groupés, 5 pull requests ouvertes au plus |
| npm | `/mobile-app` | Hebdomadaire, le lundi | Montées majeures d'`expo*` et `react-native*` ignorées, car elles suivent le cycle du SDK Expo |
| npm | `/documentation-officielle` | Mensuelle | Tout groupé |
| docker | Dockerfiles des quatre images | Hebdomadaire | |
| docker-compose | `/` | Hebdomadaire | |
| github-actions | `/` | Hebdomadaire | Tout groupé |

Toutes les règles npm portent `cooldown.default-days: 5` : Dependabot attend cinq jours après la publication d'une version avant de la proposer. Ce délai laisse à l'écosystème le temps de repérer une version malveillante ou défectueuse, un mode d'attaque fréquent sur npm.

## Sécurité des workflows

| Mesure | Mise en œuvre |
|---|---|
| Actions épinglées | Chaque `uses:` désigne un SHA de commit complet (par exemple `actions/checkout@11d5960a326750d5838078e36cf38b85af677262`), pas une étiquette modifiable. Dependabot met ces SHA à jour. |
| Jeton en lecture seule | `permissions: contents: read` au niveau du workflow ; seuls `changes` (`pull-requests: read`) et CodeQL (`security-events: write`) reçoivent davantage. |
| Identifiants non conservés | `persist-credentials: false` sur chaque `actions/checkout` : le jeton n'est pas laissé dans `.git/config` pour les étapes suivantes. |
| Exécutions concurrentes | `concurrency` annule l'exécution précédente sur la même branche. |
| Durées bornées | Chaque job a un `timeout-minutes`. |
| Revue | [`.github/CODEOWNERS`](src:.github/CODEOWNERS) désigne un propriétaire pour chaque dossier ; le modèle [`.github/pull_request_template.md`](src:.github/pull_request_template.md) demande un plan de retour arrière. |

## Limites connues

| Limite | Détail |
|---|---|
| Images d'outils épinglées par étiquette | gitleaks, Trivy et Slither sont lancés par `docker run` avec une étiquette de version (`v8.30.1`, `0.76.2`, `0.11.6`), pas par empreinte `@sha256`. Une étiquette republiée changerait l'outil exécuté. |
| Pas de SBOM ni de signature | Aucune nomenclature logicielle n'est produite et les images construites ne sont ni signées ni poussées dans un registre. |
| Pas de DAST ni de test d'intrusion | Aucun scan dynamique de l'application déployée. |
| Protection de branche | Elle se configure dans GitHub, hors du dépôt ; son état n'est pas vérifiable ici. |
| Pas de crochet local anti-secrets | gitleaks ne tourne qu'en CI, pas avant le commit sur le poste du développeur. |
