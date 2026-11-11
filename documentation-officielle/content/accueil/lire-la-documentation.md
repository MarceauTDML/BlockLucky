# Comment lire cette documentation

Cette page explique comment la documentation est organisée, quelles conventions elle suit, comment y chercher une information et comment signaler une erreur. Elle vaut aussi mode d'emploi pour qui veut la compléter : les règles d'écriture détaillées sont dans [Écrire la documentation](../contribuer/documentation.md).

## Organisation en 16 parties

Le sommaire de gauche suit le fichier `content/SUMMARY.md`. Il commence par trois pages d'accueil, puis 16 parties numérotées. Chaque partie répond à une question précise.

| Partie | Question à laquelle elle répond | Lecteurs principaux |
|---|---|---|
| 1. Présentation du projet | Pourquoi ce projet, pour qui, avec quel périmètre réel ? | Tous, jury en priorité |
| 2. Démarrage rapide | Comment lancer le projet en local en moins d'une heure ? | Nouveaux développeurs |
| 3. Architecture | Comment les briques s'articulent-elles et pourquoi ces choix ? | Développeurs, DSI |
| 4. Smart contracts | Que fait le contrat, comment le tester et le déployer ? | Développeurs Solidity, DSI, jury |
| 5. Intégration blockchain du backend | Comment le backend signe, indexe et automatise les actions on-chain ? | Développeurs backend |
| 6. Base de données | Quelles tables, quelles contraintes, comment migrer et reconstruire ? | Développeurs backend, exploitation |
| 7. Backend | Comment l'API est structurée, configurée, observée et testée ? | Développeurs backend |
| 8. Frontend web | Comment sont construits les espaces citoyen, partenaire et Mairie ? | Développeurs front |
| 9. Application mobile | Comment l'application Expo est organisée et publiée ? | Développeurs mobile |
| 10. Office de Tourisme | Que contient le site vitrine statique livré en bonus ? | Développeurs front |
| 11. Sécurité | Quelles menaces, quelles protections, quelles vérifications ? | DSI, développeurs |
| 12. Juridique et conformité | Quel cadre légal (jeux, MiCA, RGPD, accessibilité) et quels points restent ouverts ? | Mairie, DSI, jury |
| 13. Infrastructure et exploitation | Comment déployer, surveiller, sauvegarder et réagir aux incidents ? | Exploitation |
| 14. Contribuer | Comment travailler sur le dépôt sans casser l'existant ? | Développeurs |
| 15. Guides pratiques | Comment réaliser une tâche courante pas à pas ? | Développeurs |
| 16. Annexes | Glossaire, FAQ, dette technique, index des fichiers et des scripts | Tous |

Les parties 1 et 2 se lisent dans l'ordre. Les parties 3 à 13 sont des références : on y va pour une question précise. La partie 15 contient des recettes qui renvoient vers les références.

## Conventions

### Ce que la documentation garantit

Chaque affirmation a été vérifiée dans le code ou dans un fichier du dépôt au moment de la rédaction. Quand le code et une ancienne documentation divergent, c'est le code qui a raison, et l'écart est signalé. Les pages disent explicitement ce qui est réel, ce qui est simulé et ce qui n'est pas implémenté. Le récapitulatif est sur [Réel, simulé ou à venir](../presentation/reel-ou-simule.md).

### Liens vers le code

Un lien dont le texte est un chemin en police fixe, par exemple [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts), ouvre le fichier sur GitHub, branche `main`. Le chemin part toujours de la racine du dépôt. La construction du site échoue si un fichier cité n'existe plus : un lien vers le code n'est donc jamais mort au moment de la publication.

Les liens ne portent pas de numéro de ligne, car les lignes bougent à chaque modification. Pour retrouver une fonction, chercher son nom dans le fichier.

### Pages générées depuis le code

Plusieurs tableaux ne sont pas écrits à la main. Le script `scripts/build.mjs` les reconstruit à chaque construction en lisant directement les sources. Ils sont donc toujours alignés sur le code publié.

| Page | Source lue par le générateur |
|---|---|
| [Référence de l'API](../backend/reference-api.md) | Fichiers `*.routes.ts` montés dans [`backend/src/app.ts`](src:backend/src/app.ts) |
| [Variables d'environnement](../backend/variables-environnement.md) | Schéma Zod de [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) |
| [Dictionnaire de données](../base-de-donnees/dictionnaire.md) | [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) et contraintes CHECK des migrations |
| [Migrations](../base-de-donnees/migrations.md) | Dossiers de `backend/prisma/migrations/` |
| [Temps réel Socket.IO](../backend/socket-io.md) | [`backend/src/types/socket.types.ts`](src:backend/src/types/socket.types.ts) |
| [Référence de BlockLucky](../smart-contracts/reference-blocklucky.md) et [de BlockLuckyPOAP](../smart-contracts/reference-poap.md) | ABI de `backend/src/blockchain/abi/` et sources Solidity |
| [Versions de la stack](../architecture/versions.md) et [Scripts npm](../annexes/scripts-npm.md) | `package.json` de chaque projet |
| [Docker Compose](../infrastructure/docker-compose.md) | [`docker-compose.yml`](src:docker-compose.yml) |
| [Intégration continue](../infrastructure/ci.md) | [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) et `codeql.yml` |

Les descriptions qui accompagnent ces tableaux (rôle d'une variable, d'une table, d'un événement) viennent des fichiers JSON de `documentation-officielle/content/_data/`. Quand le code ajoute un élément sans description, la construction le signale. En mode strict (`npm run check`, exécuté par la CI), elle échoue.

### Encadrés

Cinq types d'encadrés signalent une information à ne pas manquer.

> [!NOTE]
> À savoir : un complément utile qui n'est pas indispensable.

> [!TIP]
> Astuce : un raccourci ou une bonne pratique.

> [!IMPORTANT]
> Important : une condition nécessaire au bon fonctionnement.

> [!WARNING]
> Attention : une action qui peut faire perdre du temps ou des données.

> [!CAUTION]
> Danger : une action irréversible ou une faille potentielle.

### Blocs de code et diagrammes

Les commandes sont données dans des blocs avec leur langage (`bash`, `powershell`, `typescript`...). Sauf mention contraire, une commande se lance depuis le dossier du projet concerné (`backend/`, `frontend-web/`...) et la racine du dépôt est le dossier `BlockLucky/`. Les commandes ont été vérifiées dans les scripts des `package.json`, les Dockerfile et la CI.

Les flux sont dessinés en Mermaid : diagrammes de séquence pour les échanges entre composants, diagrammes d'états pour le cycle d'un tour, schémas pour l'architecture.

### Vocabulaire

Quelques termes reviennent partout. Ils sont définis dans le [glossaire](../annexes/glossaire.md).

| Terme | Sens dans ce projet |
|---|---|
| Ethers fictifs | ETH d'un réseau de test (Hardhat local ou Sepolia), sans valeur monétaire |
| Portefeuille intégré | Compte Ethereum créé par le backend pour chaque citoyen, clé chiffrée en base |
| Dotation de bienvenue | Ethers fictifs versés une fois par le compte opérateur de la Mairie (`WELCOME_GRANT_WEI`) |
| Tour | Une session de loterie du contrat (`currentRoundId`), de l'ouverture au versement |
| Opérateur | Compte du backend (`RELAYER_PRIVATE_KEY`) qui détient les rôles opérateur, pause et frappe |
| EtherPoints | Points de fidélité tenus en base, échangeables chez les partenaires |
| Mode onchain ou simulé | Valeur de `BLOCKCHAIN_MODE` ; le mode simulé est réservé aux tests unitaires |

## Chercher une information

### La recherche intégrée

Le champ de recherche en haut de page interroge toutes les pages. Il s'ouvre au clavier avec `Ctrl K` (ou `Cmd K` sur macOS), ou avec la touche `/` quand le curseur n'est pas dans un champ de saisie. Les flèches haut et bas parcourent les résultats, `Entrée` ouvre le résultat sélectionné et `Échap` ferme la liste.

L'index de recherche est construit avec le site : chaque section de niveau 2 ou 3 est une entrée, avec le titre de la page et de la section. Le texte des blocs de code n'est pas indexé. Pour retrouver une commande ou un nom de variable, chercher plutôt le terme en français qui l'accompagne, ou utiliser les pages générées (variables, scripts npm, API).

### Le sommaire de la page

La colonne de droite liste les titres de la page en cours. Chaque titre possède une ancre : l'identifiant est le texte du titre en minuscules, sans accents, chaque suite de caractères non alphanumériques remplacée par un tiret. « Cycle d'un tour » devient `#cycle-d-un-tour`. Ces ancres sont stables et peuvent être partagées.

### Chercher directement dans le code

Pour une question à laquelle la documentation ne répond pas, la page [Index des fichiers clés](../annexes/fichiers-cles.md) indique où se trouve chaque responsabilité dans le dépôt.

## Signaler une erreur

Chaque page se termine par le lien « Modifier cette page sur GitHub ». Il ouvre la source Markdown de la page dans `documentation-officielle/content/` sur le dépôt `MarceauTDML/BlockLucky`. Deux options :

1. proposer la correction directement par une pull request, en suivant le [workflow Git](../contribuer/workflow-git.md) ;
2. ouvrir un ticket sur le dépôt en citant la page, la phrase concernée et ce que dit le code (avec le chemin du fichier).

Avant de proposer une correction, construire le site localement pour vérifier les liens :

```bash
cd documentation-officielle
npm ci
npm run build
npm run check
```

`npm run build` régénère le dossier `site/`. `npm run check` reconstruit dans un dossier temporaire en mode strict, compare le résultat au dossier `site/` versionné et vérifie chaque lien et chaque ancre. `npm run serve` sert ensuite `site/` sur `http://localhost:4040`.

> [!CAUTION]
> Une vulnérabilité de sécurité ne se signale jamais dans un ticket public. Suivre la procédure de [Signaler une vulnérabilité](../securite/signalement.md).

## Ce que la documentation ne remplace pas

- La documentation Swagger servie par le backend sur `/api/docs` reste la référence interactive pour tester un appel.
- Les livrables marketing et UX de l'équipe (proposition de valeur, recherche utilisateurs, stratégie de communication, budget) sont des documents PDF hors dépôt. Ils sont résumés et cités dans la [partie 1](../presentation/contexte.md), sans être recopiés.
- Les décisions d'architecture sont argumentées dans les [ADR](../architecture/adr/index.md) : la documentation de référence les applique sans les redémontrer.
