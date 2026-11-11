# Builds et publication

L'application mobile n'a jamais été publiée sur l'App Store ni sur Google Play. Le dépôt contient la configuration Expo ([`app.json`](src:mobile-app/app.json)) et des profils EAS Build ([`eas.json`](src:mobile-app/eas.json)), mais pas de projet EAS lié, pas d'identifiants de signature et aucune étape de build mobile dans la CI. Pendant le projet, l'application a été utilisée avec Expo Go ou un émulateur (voir [Tester sur un téléphone](telephone-physique.md)). Cette page décrit la configuration existante, ce qui manque pour produire un binaire et la procédure à suivre.

## Configuration Expo

Le projet utilise un fichier statique `app.json`. Il n'existe ni `app.config.js` ni `app.config.ts` : aucune valeur ne peut donc varier selon l'environnement au moment du build, en dehors des variables `EXPO_PUBLIC_*` intégrées au bundle JavaScript.

| Clé | Valeur | Rôle |
|---|---|---|
| `name` | `BlockLucky EtherBay` | Nom affiché sous l'icône |
| `slug` | `blocklucky-etherbay` | Identifiant du projet chez Expo |
| `version` | `1.0.0` | Version visible par l'utilisateur |
| `orientation` | `portrait` | Rotation bloquée |
| `icon` | `./assets/images/icon.png` | Icône |
| `userInterfaceStyle` | `automatic` | Autorise le mode sombre du système ; l'application ne le lit pas (voir [Thème et composants](theme-composants.md#themeprovider)) |
| `splash` | `splash.png`, `contain`, fond `#1A0B2E` | Écran de lancement |
| `ios.bundleIdentifier` | `fr.etherbay.blocklucky` | Identifiant iOS |
| `ios.supportsTablet` | `true` | Installable sur iPad |
| `ios.config.usesNonExemptEncryption` | `false` | Déclaration d'export : l'application n'utilise que le chiffrement standard du système |
| `android.package` | `fr.etherbay.blocklucky` | Identifiant Android |
| `android.adaptiveIcon` | `adaptive-icon.png`, fond `#1A0B2E` | Icône adaptative |
| `android.allowBackup` | `false` | Pas de sauvegarde des données de l'application par Android |
| `web` | `favicon.png`, bundler `metro` | Cible web d'Expo, non fonctionnelle faute de `react-native-web` |
| `plugins` | `expo-secure-store`, `expo-font`, `expo-status-bar` | Modules configurés au prebuild |

Plusieurs clés habituelles d'un projet publié manquent :

| Clé absente | Conséquence |
|---|---|
| `extra.eas.projectId`, `owner` | Le projet n'est rattaché à aucun compte Expo ; la première commande EAS demandera de le créer |
| `runtimeVersion`, `updates.url` | Les mises à jour à distance (EAS Update) ne sont pas configurées |
| `ios.buildNumber`, `android.versionCode` | Normal ici : `appVersionSource: "remote"` confie ces numéros à EAS |
| `scheme` | Pas de liens profonds (voir [Navigation et écrans](navigation-ecrans.md#ce-que-la-navigation-ne-fait-pas)) |
| Plugin `expo-notifications` | Pas de notifications push |

## Profils EAS

`eas.json` exige EAS CLI 12 ou plus et déclare trois profils de build :

| Profil | Réglages | Usage prévu |
|---|---|---|
| `development` | `developmentClient: true`, `distribution: internal`, `channel: development` | Client de développement installé sur les téléphones de l'équipe |
| `preview` | `distribution: internal`, `channel: preview` | Binaire de recette partagé par lien (APK Android, distribution ad hoc iOS) |
| `production` | `autoIncrement: true`, `channel: production` | Binaire pour les stores, numéro de build incrémenté à chaque build |

La section `submit.production` est vide : aucune information de compte App Store Connect ni de clé de service Google Play n'est fournie.

> [!WARNING]
> Deux réglages ne peuvent pas fonctionner avec les dépendances actuelles :
>
> - `developmentClient: true` suppose le paquet `expo-dev-client`, qui n'est pas installé. Un build `development` produirait une application sans le menu et le chargeur du client de développement.
> - Les canaux (`channel`) ne servent qu'avec EAS Update, qui suppose le paquet `expo-updates` et les clés `runtimeVersion` et `updates.url`. Aucun n'est présent : les canaux sont aujourd'hui sans effet.

## Variables d'environnement au build

`EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_WS_URL` sont lues au moment de la construction du bundle. Sans elles, l'application compilée pointe vers `http://localhost:2053`, c'est-à-dire vers le téléphone lui-même.

`eas.json` ne déclare aucune section `env`, et le fichier `.env` est exclu de Git par [`.gitignore`](src:mobile-app/.gitignore). Avant un build EAS, il faut donc fournir les URL de l'environnement visé, soit dans une section `env` de chaque profil, soit dans les variables d'environnement du projet EAS. Pour une version publique, ces URL doivent être en HTTPS : les applications iOS et Android récentes refusent par défaut le HTTP non chiffré hors développement, et `app.json` ne déclare aucune exception.

## Procédure pour un premier build

Ces étapes n'ont pas été exécutées dans le projet. Elles utilisent EAS CLI, qui n'est pas une dépendance du dépôt.

1. Créer ou choisir un compte Expo pour la Ville, puis lier le projet (`eas init`), ce qui ajoute `extra.eas.projectId` dans `app.json`.
2. Installer `expo-dev-client` si le profil `development` doit être utilisé, ou retirer `developmentClient` du profil.
3. Renseigner les URL de l'API dans `eas.json` ou dans les variables du projet EAS.
4. Remplacer les images de `assets/images` (icône, icône adaptative, splash) et la couleur `#1A0B2E` par celles de la charte.
5. Lancer un build de recette, par exemple `eas build --profile preview --platform android`, et l'installer sur un téléphone.
6. Pour iOS, fournir un compte Apple Developer : EAS génère alors les certificats et profils de provisionnement.
7. Pour les stores, compléter `submit.production`, puis `eas submit --profile production`.

Avant toute publication, les défauts de l'application doivent être corrigés, en particulier la restauration de session (voir [Authentification et stockage sécurisé](authentification.md)). La liste de contrôle générale est dans [Avant une mise en production](../contribuer/mise-en-production.md).

## Conformité des stores

Quelques points à préparer, propres à une application de loterie :

| Sujet | Situation |
|---|---|
| Jeux d'argent | Les tickets s'achètent en ethers fictifs sans valeur, mais les règles des stores sur les loteries et les crypto-actifs s'appliquent à la présentation ; voir [Crypto-actifs et MiCA](../juridique/crypto-actifs.md) |
| Majorité | Vérification déclarative à la connexion ; la classification d'âge des stores devra être cohérente |
| Données personnelles | Fiche de confidentialité à remplir (email, adresse de portefeuille, tranche d'âge, identifiant de compte) ; voir [RGPD](../juridique/rgpd.md) |
| Chiffrement | `usesNonExemptEncryption: false` déjà déclaré pour iOS |
| Suppression de compte | Exigée par les stores, disponible dans l'écran RGPD (anonymisation) |

## Tests

Le dossier [`mobile-app/__tests__`](src:mobile-app/__tests__) contient trois fichiers écrits pour Jest :

| Fichier | Contenu |
|---|---|
| `components/CountdownTimer.test.tsx` | `formatRemainingTime` : découpage et bornage à zéro |
| `screens/BuyTicketScreen.test.tsx` | `isValidEmail` et `isValidOtpCode` |
| `utils/formatters.test.ts` | `shortenWallet`, `formatPoints`, `formatEth`, `formatPercentage` |

Malgré leurs noms, ils ne testent que des fonctions de `src/utils` et ne rendent aucun composant. Ils ne sont jamais exécutés : `package.json` n'a pas de script `test` et Jest n'est pas installé. ESLint les ignore (`ignorePatterns` de [`.eslintrc.js`](src:mobile-app/.eslintrc.js)) et `tsconfig.json` ne les inclut pas.

Pour les activer, installer `jest` et `jest-expo` en dépendances de développement, ajouter un script `"test": "jest"` et la clé `"jest": { "preset": "jest-expo" }` dans `package.json`. React Native Testing Library sera nécessaire pour tester de vrais composants.

## Intégration continue

Le job « Application mobile (typecheck, lint) » de [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) s'exécute quand `mobile-app/**` change :

1. `npm ci` ;
2. `npm audit --omit=dev --audit-level=high` ;
3. `npm run typecheck` ;
4. `npm run lint` ;
5. `npx expo config --type public`, qui vérifie que la configuration Expo se résout sans erreur.

Aucun build natif ni EAS n'est lancé par la CI, et aucun test n'est exécuté. Le détail des jobs est dans [Intégration continue](../infrastructure/ci.md).

## Fichiers à ne pas versionner

Le dossier `.expo/` est créé par Expo CLI sur chaque poste. Deux de ses fichiers (`README.md` et `devices.json`) sont pourtant suivis par Git, car `.gitignore` ne liste pas ce dossier. Il faudrait l'ajouter à `.gitignore` et retirer ces fichiers du dépôt.
