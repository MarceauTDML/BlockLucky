# Licences

Cette page recense la licence du code de BlockLucky lui-même, puis celles des dépendances principales, des polices, de la bibliothèque embarquée et des photographies. Les versions et licences des dépendances ont été relevées dans les fichiers `package.json` des paquets installés (`node_modules`). La liste n'est pas exhaustive pour les dépendances transitives ; un inventaire complet demande un outil dédié (voir [Produire un inventaire complet](#produire-un-inventaire-complet)). Elle ne constitue pas un avis juridique.

## Licence du dépôt

Le code écrit pour BlockLucky est diffusé sous **licence MIT**, par le fichier [`LICENSE`](src:LICENSE) placé à la racine du dépôt (« Copyright (c) 2026 the BlockLucky team (Epitech Digital School) »). Ce fichier ajoute une note sur les composants tiers : les dépendances gardent leur propre licence, en particulier `@chainlink/contracts`, distribué sous Business Source License 1.1 (BUSL-1.1), alors que les fichiers de contrat importés par BlockLucky portent un en-tête MIT ; la lecture de ces conditions est suivie par JUR-8 dans [Points à valider](points-a-valider.md). Les polices, icônes et images fournies par des tiers restent soumises à leur licence.

| Emplacement | Mention | Commentaire |
|---|---|---|
| [`LICENSE`](src:LICENSE) | Texte de la licence MIT, suivi de la note sur les composants tiers | S'applique à tout le dépôt |
| [`backend/package.json`](src:backend/package.json), [`frontend-web/package.json`](src:frontend-web/package.json), [`mobile-app/package.json`](src:mobile-app/package.json), [`smart-contract/package.json`](src:smart-contract/package.json), [`frontend-office-tourisme/package.json`](src:frontend-office-tourisme/package.json), [`documentation-officielle/package.json`](src:documentation-officielle/package.json) | `"license": "MIT"` | Harmonisé ; le backend portait auparavant `ISC`, valeur par défaut de `npm init`. `"private": true` empêche toujours la publication sur npm |
| [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol), [`smart-contract/contracts/BlockLuckyPOAP.sol`](src:smart-contract/contracts/BlockLuckyPOAP.sol) et les deux contrats de test | `// SPDX-License-Identifier: MIT` | Le code source vérifié sur Etherscan sera affiché sous cette mention |

Les mentions légales du web et de l'application rappellent cette licence (section « Contact et propriété intellectuelle » de [`frontend-web/src/content/legal.ts`](src:frontend-web/src/content/legal.ts)). La titularité des droits sur un projet pédagogique, entre auteurs, école et Ville, reste à confirmer (JUR-11).

## Smart contracts

| Paquet | Version | Licence du paquet | Fichiers effectivement compilés |
|---|---|---|---|
| `@openzeppelin/contracts` | 5.6.1 | MIT | `AccessControl`, `Pausable`, `ReentrancyGuard`, `ERC721`, `Strings` et leurs dépendances, tous MIT |
| `@chainlink/contracts` | 1.5.0 | **BUSL-1.1** | `VRFConsumerBaseV2Plus`, `VRFV2PlusClient`, `AutomationCompatibleInterface`, `ConfirmedOwner` et les interfaces associées, ainsi que `VRFCoordinatorV2_5Mock` pour les tests : chacun porte l'en-tête `SPDX-License-Identifier: MIT` |
| `forge-std` (développement) | 1.17.0 | Apache-2.0 ou MIT | Tests Solidity |
| `hardhat` (développement) | 3.21.2 | MIT | Outillage |
| `solhint` (développement) | 6.2.5 | MIT | Outillage |

> [!NOTE]
> Le paquet `@chainlink/contracts` est publié sous la Business Source License 1.1, qui restreint certains usages en production. Les fichiers que BlockLucky compile portent néanmoins tous un en-tête MIT, relevé dans les sources embarquées par le compilateur (`artifacts/build-info`). Le bytecode déployé ne contient donc que du code sous licence MIT. Cette lecture fichier par fichier est à confirmer par un juriste avant une exploitation commerciale.

## Backend

| Paquet | Version | Licence |
|---|---|---|
| `express` | 5.3.0 | MIT |
| `@prisma/client`, `@prisma/adapter-pg` | 7.10.1 | Apache-2.0 |
| `pg` | 8.23.1 | MIT |
| `ethers` | 6.17.0 | MIT |
| `ioredis` | 6.0.0 | MIT |
| `redis` | 6.3.1 | MIT |
| `bullmq` | 6.7.2 | MIT |
| `socket.io` | 4.8.4 | MIT |
| `zod` | 4.6.7 | MIT |
| `jsonwebtoken` | 9.0.3 | MIT |
| `bcryptjs` | 3.0.3 | BSD-3-Clause |
| `helmet` | 8.3.0 | MIT |
| `cors` | 2.8.6 | MIT |
| `express-rate-limit` | 8.7.4 | MIT |
| `rate-limit-redis` | 6.0.2 | MIT |
| `nodemailer` | 10.4.0 | MIT-0 |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | 3.1165.0 | Apache-2.0 |
| `prom-client` | 15.1.3 | Apache-2.0 |
| `winston` | 3.19.0 | MIT |
| `qrcode` | 1.5.4 | MIT |
| `otplib` | 13.6.0 | MIT (installé mais non importé par le code) |
| `swagger-jsdoc` | 6.3.0 | MIT |
| `swagger-ui-express` | 5.0.1 | MIT |
| `dotenv` | 18.0.9 | BSD-2-Clause |

## Frontend web

| Paquet | Version | Licence |
|---|---|---|
| `next` | 16.4.5 | MIT |
| `react`, `react-dom` | 19.3.1 | MIT |
| `@reduxjs/toolkit` | 2.14.0 | MIT |
| `react-redux` | 9.3.1 | MIT |
| `socket.io-client` | 4.8.4 | MIT |

Ressources embarquées :

| Ressource | Licence |
|---|---|
| Police Inter (400, 500, 600, 700, 700 italique) dans `frontend-web/src/app/fonts`, recopiée depuis `@expo-google-fonts/inter` | SIL Open Font License 1.1, [`frontend-web/src/app/fonts/LICENSE-inter.txt`](src:frontend-web/src/app/fonts/LICENSE-inter.txt) |
| Icônes SVG et logo de [`iconData.ts`](src:frontend-web/src/components/ui/iconData.ts) et [`icon.svg`](src:frontend-web/src/app/icon.svg) | Copie des icônes de la maquette de l'application mobile (`mobile-app/assets/icons`), même origine |

## Application mobile

| Paquet | Version | Licence |
|---|---|---|
| `expo` et modules `expo-*`, dont `expo-audio` 58.0.12 pour les sons du tirage | 58.x | MIT |
| `react-native` | 0.88.1 | MIT |
| `react` | 19.3.0 | MIT |
| `@react-navigation/*` | 7.x | MIT |
| `@reduxjs/toolkit` | 2.13.0 | MIT |
| `axios` | 1.21.0 | MIT |
| `lottie-react-native` | 7.5.0 | Apache-2.0 |
| `react-native-svg`, `react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context` | voir `package.json` | MIT |
| `socket.io-client` | 4.8.4 | MIT |

Ressources embarquées :

| Ressource | Licence |
|---|---|
| Polices `Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-Bold.ttf` dans `mobile-app/assets/fonts` | SIL Open Font License 1.1 (police Inter). **Le fichier de licence n'est pas joint** dans ce dossier, alors que l'OFL impose de le distribuer avec la police. |
| Animations Lottie `confetti.json`, `loading-spinner.json`, `roulette-spin.json` | Origine non documentée dans le dépôt |
| Icônes et écran de démarrage (`mobile-app/assets/images`) | Origine non documentée |
| Sons `chrono.mp3` et `roue-tirage.mp3` dans `mobile-app/assets/sounds`, copiés dans `frontend-web/public/sounds` | Fournis par l'équipe BlockLucky, couverts par la licence du dépôt |

## Site de l'Office de Tourisme

| Ressource | Licence | Fichier de licence |
|---|---|---|
| Police Inter (graisses 300 à 600) | SIL Open Font License 1.1 | [`frontend-office-tourisme/assets/fonts/LICENSE-inter.txt`](src:frontend-office-tourisme/assets/fonts/LICENSE-inter.txt) |
| Police Jost (graisses 500 à 700) | SIL Open Font License 1.1 | [`frontend-office-tourisme/assets/fonts/LICENSE-jost.txt`](src:frontend-office-tourisme/assets/fonts/LICENSE-jost.txt) |
| Bibliothèque `qrcode-generator` 2.0.4 (Kazuhiko Arase), copiée dans `assets/js/vendor/qrcode.mjs` | MIT | [`frontend-office-tourisme/assets/js/vendor/LICENSE-qrcode-generator.txt`](src:frontend-office-tourisme/assets/js/vendor/LICENSE-qrcode-generator.txt) |
| 63 photographies de `assets/img/photos` | Licence de contenu Pixabay (usage libre, attribution non obligatoire) | Mention dans [`frontend-office-tourisme/mentions-legales.html`](src:frontend-office-tourisme/mentions-legales.html) |

Le fichier de licence de `qrcode-generator` rappelle aussi que « QR Code » est une marque déposée de DENSO WAVE. La licence de contenu Pixabay comporte des usages interdits (notamment la revente des images non modifiées et l'utilisation de personnes identifiables d'une manière qui laisserait croire à leur soutien) ; leur liste exacte est à relire sur le site de Pixabay. Les photos illustrent ici des lieux fictifs. La page source de chaque photo n'est pas consignée dans le dépôt, ce qui empêche de prouver a posteriori la licence d'une image précise.

## Documentation officielle

| Ressource | Version | Licence |
|---|---|---|
| `marked` | 18.2.0 | MIT |
| `highlight.js` | 11.12.0 | BSD-3-Clause |
| `mermaid` | 12.3.0 | MIT |
| `yaml` | 2.8.1 | ISC |
| Police Inter (thème) | | SIL Open Font License 1.1, [`documentation-officielle/theme/assets/fonts/LICENSE-inter.txt`](src:documentation-officielle/theme/assets/fonts/LICENSE-inter.txt) |

## Compatibilité

Les licences relevées sont toutes permissives (MIT, MIT-0, ISC, BSD, Apache-2.0) ou propres aux polices (OFL). Aucune licence à réciprocité forte (GPL, AGPL) n'a été repérée parmi les dépendances directes. Les obligations à respecter lors d'une distribution sont :

| Licence | Obligation principale |
|---|---|
| MIT, ISC, BSD | Conserver la mention de droit d'auteur et le texte de la licence |
| Apache-2.0 | Idem, plus le fichier `NOTICE` s'il existe et la mention des modifications |
| OFL 1.1 | Distribuer le texte de la licence avec la police ; ne pas vendre la police seule |
| MIT-0 | Aucune |

Les images Docker et les bundles produits par Next.js et Expo incluent ces dépendances : leurs mentions doivent rester accessibles (fichiers de licence conservés dans `node_modules` des images, ou page de mentions dans l'application).

## Produire un inventaire complet

Pour un inventaire exhaustif, dépendances transitives comprises, lancer depuis chaque sous-projet un outil comme `license-checker` :

```bash
npx --yes license-checker --production --summary
```

Cet outil n'est pas une dépendance du dépôt ; `npx` le télécharge à la volée. Un rapport par projet, joint à chaque version, permettrait de suivre l'apparition d'une licence incompatible. Voir aussi [Dépendances](../contribuer/dependances.md).
