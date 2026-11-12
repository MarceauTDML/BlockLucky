# Thème et composants

L'interface mobile suit la maquette Figma de l'application : fond gris très clair, cartes blanches très arrondies, jaune « soleil » `#FFDA38` pour les mises en avant, encre bleu nuit `#1D2637` pour le texte et les boutons sombres, et des teintes pastel (lavande, menthe, pêche) pour distinguer les familles d'information. Le thème est défini en TypeScript dans [`mobile-app/src/theme`](src:mobile-app/src/theme) et distribué par un contexte React. Les composants de base sont dans [`mobile-app/src/components/ui`](src:mobile-app/src/components/ui).

Le frontend web a repris cette charte : ses variables CSS recopient les valeurs de `colors.ts`, il charge la même police Inter et utilise une copie du jeu d'icônes (voir [Design system du web](../web/design-system.md)). Les deux applications ne partagent aucun fichier : un changement de jeton se reporte à la main des deux côtés.

## Fichiers du thème

| Fichier | Contenu |
|---|---|
| [`colors.ts`](src:mobile-app/src/theme/colors.ts) | Interface `ColorPalette`, famille `sunFamily` commune, palettes `lightColors` et `darkColors` |
| [`spacing.ts`](src:mobile-app/src/theme/spacing.ts) | Espacements adaptés à la largeur d'écran et rayons |
| [`typography.ts`](src:mobile-app/src/theme/typography.ts) | Familles Inter, tailles et interlignes adaptés à la largeur |
| [`ThemeProvider.tsx`](src:mobile-app/src/theme/ThemeProvider.tsx) | Contexte : mode, langue, palette, dimensions, `t(fr, en)` |
| [`useAppTheme.ts`](src:mobile-app/src/hooks/useAppTheme.ts) | Hook d'accès au contexte |

## Couleurs

Les jetons de la famille « soleil » sont identiques en thème clair et sombre :

| Clé | Valeur | Usage |
|---|---|---|
| `sun` | `#FFDA38` | Carte du grand tirage, bouton principal, pastilles |
| `sunSoft`, `sunPale`, `sunLight`, `sunChip` | `#FFF4B8`, `#FFF6CA`, `#FFE979`, `#FFF7D3` | Fonds de cartes et d'étiquettes |
| `sunTrack` | `#E4C64B` | Piste des jauges sur fond jaune |
| `onSun`, `onSunMuted` | `#1D2637`, `#4A5263` | Texte posé sur le jaune |
| `onInk` | `#FFFFFF` | Texte posé sur l'encre |
| `shadowSun` | `rgba(172, 141, 10, 0.12)` | Ombre des cartes jaunes |

Les autres jetons changent avec le thème :

| Clé | Clair | Sombre | Usage |
|---|---|---|---|
| `background` | `#F6F7FA` | `#0F1626` | Fond des écrans |
| `surface` | `#FFFFFF` | `#1A2333` | Cartes, barre d'onglets, fenêtres |
| `surfaceMuted`, `surfaceNeutral` | `#F5F6F9`, `#F0F2F6` | `#222C3E`, `#283246` | Zones en retrait, champs |
| `ink` | `#1D2637` | `#F3F5F9` | Texte principal, boutons sombres |
| `inkMuted` | `#657084` | `#A3ACBD` | Texte atténué, icônes inactives |
| `border`, `divider`, `separator` | `#E2E5EB`, `#E8EBEF`, `#DFE3EB` | `#2C3649` | Bordures et séparateurs |
| `sunNav` | `#FFF3B5` | `#3A3420` | Onglet actif |
| `lavender`, `lavenderStrong`, `lavenderSoft` | `#EEE9FF`, `#E8E2FF`, `#F2EEFC` | `#2A2546`, `#312A55`, `#2A2546` | Points, ticket à gratter violet |
| `violet` | `#7357B1` | `#B9A6F0` | Accent des EtherPoints |
| `mint`, `green` | `#E6EFEA`, `#356C58` | `#1E3329`, `#7FC4A6` | État positif, âge vérifié |
| `peach`, `terracotta` | `#FFE5D8`, `#A95837` | `#3D2A22`, `#F0A07F` | Erreurs, ticket à gratter « lucky » |
| `coral` | `#E87F69` | `#E87F69` | Accent ponctuel |
| `overlay`, `shadowModal` | `rgba(15, 23, 38, 0.5)`, `rgba(17, 24, 39, 0.18)` | `rgba(0, 0, 0, 0.6)`, `rgba(0, 0, 0, 0.45)` | Voile et ombre des fenêtres |

Les clés de l'ancienne palette (`primary`, `primaryLight`, `secondary`, `accent`, `text`, `textPrimary`, `textSecondary`, `textMuted`, `surfaceElevated`, `success`, `warning`, `error`, `gold`) restent dans `ColorPalette` comme alias des nouveaux jetons, par exemple `primary` vaut `ink` et `error` vaut `terracotta`. Elles évitent de casser le code qui les lit encore ; un nouveau composant doit utiliser les jetons ci-dessus.

Le splash a un fond `#F6F7FA` (le `background` clair) et l'icône adaptative Android un fond `#FFDA38`, définis dans [`app.json`](src:mobile-app/app.json).

## Typographie

`App.tsx` charge la police Inter avec `useFonts` de `@expo-google-fonts/inter` et n'affiche rien tant qu'elle n'est pas prête. `typography.ts` associe une famille à chaque graisse :

| Graisse | Famille |
|---|---|
| `regular` | `Inter_400Regular` |
| `medium` | `Inter_500Medium` |
| `semibold` | `Inter_600SemiBold` |
| `bold` | `Inter_700Bold` |
| italique grasse | `Inter_700Bold_Italic` |

`AppText` propose dix variantes, en points avant mise à l'échelle :

| Variante | Taille | Graisse |
|---|---|---|
| `display` | 43 | bold |
| `hero` | 28 | bold |
| `title` | 23 | bold |
| `section` | 21 | bold |
| `subtitle` | 16 | bold |
| `body` | 13 | regular |
| `small` | 12 | regular |
| `caption` | 11 | regular |
| `overline` | 10 | bold, majuscules |
| `label` | 9 | bold, majuscules |

Les écrans passent aussi souvent une taille explicite (`size`) et une graisse (`weight`). L'interligne par défaut vaut 1,3 fois la taille.

## Espacements et échelle adaptative

`spacing.ts` et `typography.ts` calculent un facteur d'échelle à partir de la largeur de la fenêtre, avec 402 points comme référence (la largeur des écrans de la maquette), borné entre 0,9 et 1,06 :

| Fichier | Valeurs à 402 points |
|---|---|
| `spacing.ts` | `xs` 4, `sm` 8, `md` 14, `lg` 20, `xl` 28, `xxl` 40, `screen` 20 (marge latérale), `screenText` 24 |
| `typography.ts` | tailles `xs` 11, `sm` 12, `md` 13, `lg` 16, `xl` 21, `xxl` 23, `hero` 29 ; fonction `rf` d'arrondi au pixel |

Les rayons ne dépendent pas de l'écran : `sm` 10, `md` 12, `lg` 16, `xl` 20, `xxl` 24, `hero` 28, `full` 9999.

Le facteur est calculé une seule fois, au chargement du module, avec `Dimensions.get('window')`. Il ne suit pas une rotation, un changement de taille de fenêtre sur tablette ou un pliable. `ThemeProvider` fournit en revanche `screenWidth`, `screenHeight` et `isCompactScreen` (largeur inférieure à 360 ou hauteur inférieure à 700) à jour grâce à `useWindowDimensions`.

## ThemeProvider

| Valeur du contexte | Rôle |
|---|---|
| `mode`, `toggleTheme`, `setThemeMode` | Thème `LIGHT` ou `DARK` |
| `language`, `setLanguage`, `t(fr, en)` | Langue `FR` ou `EN` et traduction en ligne |
| `colors` | `darkColors` si `mode === 'DARK'`, sinon `lightColors` |
| `spacing`, `borderRadius`, `typography` | Objets des fichiers du thème |
| `screenWidth`, `screenHeight`, `isCompactScreen` | Dimensions courantes |

Le mode et la langue sont de simples `useState` initialisés à `LIGHT` et `FR` :

- ils ne sont pas mémorisés sur l'appareil et reviennent à leur valeur initiale à chaque démarrage ;
- le thème du système n'est pas lu, alors que `app.json` déclare `"userInterfaceStyle": "automatic"` : un téléphone en mode sombre affiche quand même l'application en clair ;
- l'écran Affichage (`DisplaySettingsScreen`) envoie les changements au backend (`PUT /user/preferences`, par `usePreferenceSaver`) et revient à l'ancienne valeur si l'envoi échoue, mais le thème et la langue enregistrés ne sont jamais relus. Il ne propose que Clair et Sombre : la valeur `SYSTEM` acceptée par le backend n'est pas offerte.

`App.tsx` adapte la barre d'état : texte clair en thème sombre, texte foncé en thème clair.

La fonction `t(fr, en)` fonctionne comme sur le web (voir [Internationalisation](../web/i18n.md)). Les messages d'erreur de `useCitizenWallet` et ceux des fenêtres globales restent en français seulement, et les messages du backend s'affichent en français quand l'interface est en anglais.

## Composants de base

| Composant | Fichier | Props principales | Comportement |
|---|---|---|---|
| `AppText` | [`AppText.tsx`](src:mobile-app/src/components/ui/AppText.tsx) | `variant`, `size`, `weight`, `color`, `align`, `lineHeight` | Taille mise à l'échelle par `rf`, famille Inter selon la graisse, couleur `ink` par défaut |
| `AppButton` | [`AppButton.tsx`](src:mobile-app/src/components/ui/AppButton.tsx) | `title`, `onPress`, `variant` (`primary`, `dark`, `outline`, `soft`, `ghost`), `size` (`lg` 52, `md` 40, `sm` 32), `leftIcon`, `rightIcon`, `loading`, `disabled`, `accessibilityHint` | Rôle `button`, libellé égal au titre, états `disabled` et `busy` annoncés ; `secondary` et `danger` restent acceptés comme alias de `dark` et `outline` |
| `AppInput` | [`AppInput.tsx`](src:mobile-app/src/components/ui/AppInput.tsx) | `label`, `icon`, `errorText`, `helperText`, `secureToggle` et les props de `TextInput` | Champ arrondi avec icône ; `secureToggle` ajoute un bouton accessible pour afficher ou masquer le mot de passe |
| `Card` | [`Card.tsx`](src:mobile-app/src/components/ui/Card.tsx) | `tone` (surface, sun, lavender, mint, peach…), `radius`, `padding`, `elevated`, `onPress`, `accessibilityLabel` | Carte de la maquette, cliquable si `onPress` est fourni |
| `Pill` | [`Pill.tsx`](src:mobile-app/src/components/ui/Pill.tsx) | `label`, `tone`, `dot`, `uppercase` | Étiquette arrondie |
| `ListRow` | [`ListRow.tsx`](src:mobile-app/src/components/ui/ListRow.tsx) | `title`, `subtitle`, `icon`, `iconTone`, `value`, `right`, `onPress`, `destructive`, `divider` | Ligne de liste des réglages et de l'historique |
| `Screen` | [`Screen.tsx`](src:mobile-app/src/components/ui/Screen.tsx) | `scroll`, `footer`, `showSecurityFooter`, `refreshing`, `onRefresh`, `edges` | `SafeAreaView`, `KeyboardAvoidingView`, défilement et « tirer pour rafraîchir », pied fixe facultatif |
| `ScreenHeader` | [`ScreenHeader.tsx`](src:mobile-app/src/components/ui/ScreenHeader.tsx) | `title`, `subtitle`, `onBack`, `right` | En-tête d'écran avec `BackButton` si `onBack` est fourni |
| `SectionHeader` | [`SectionHeader.tsx`](src:mobile-app/src/components/ui/SectionHeader.tsx) | `title`, `subtitle`, `right` | Titre de section |
| `SecurityFooter` | [`SecurityFooter.tsx`](src:mobile-app/src/components/ui/SecurityFooter.tsx) | aucune | Mention « Application sécurisée · Aucun argent réel » |
| `StepList` | [`StepList.tsx`](src:mobile-app/src/components/ui/StepList.tsx) | `steps`, `variant` | Étapes numérotées (parrainage, fonctionnement) |
| `FilterChips` | [`FilterChips.tsx`](src:mobile-app/src/components/ui/FilterChips.tsx) | `options`, `value`, `onChange` | Filtres à choix unique |
| `ResultDialog` | [`ResultDialog.tsx`](src:mobile-app/src/components/ui/ResultDialog.tsx) | `visible`, `status` (`success`, `error`, `info`), `title`, `message`, `note`, `primaryLabel`, `secondaryLabel` | Fenêtre centrée des confirmations et erreurs, `accessibilityViewIsModal`, titre annoncé comme en-tête |
| `BottomSheet` | [`BottomSheet.tsx`](src:mobile-app/src/components/ui/BottomSheet.tsx) | `visible`, `title`, `onClose` | `Modal` glissant depuis le bas ; utilisée par le choix de la photo d'identité |
| `NotificationButton` | [`NotificationButton.tsx`](src:mobile-app/src/components/ui/NotificationButton.tsx) | `onPress`, `hasUnread` | Cloche avec pastille de notifications non lues |
| `HeaderActions` | [`HeaderActions.tsx`](src:mobile-app/src/components/ui/HeaderActions.tsx) | aucune | Cloche (vers `Notifications`) et roue dentée (vers `Settings`) des en-têtes de l'accueil, de « Mes tickets » et de `TabTitle` |
| `BrandLogo` | [`BrandLogo.tsx`](src:mobile-app/src/components/ui/BrandLogo.tsx) | `size` | Symbole et nom BlockLucky de l'en-tête de l'accueil |
| `ProgressBar` | [`ProgressBar.tsx`](src:mobile-app/src/components/ui/ProgressBar.tsx) | `percentage`, `markers`, `tone`, `height`, `accessibilityLabel` | Jauge de participation et repères des paliers |
| `Loader` | [`Loader.tsx`](src:mobile-app/src/components/ui/Loader.tsx) | `message`, `skeletonRows` | Indicateur de chargement ou lignes squelettes |
| `BackButton` | [`BackButton.tsx`](src:mobile-app/src/components/ui/BackButton.tsx) | `onPress`, `label` | Bouton rond avec flèche |

## Icônes

Les icônes viennent de la maquette. Les fichiers sources sont dans [`mobile-app/assets/icons`](src:mobile-app/assets/icons) ; leur contenu SVG est recopié dans [`iconData.ts`](src:mobile-app/src/components/ui/icons/iconData.ts), qui associe un nom (`tabHome`, `bell`, `google`, `apple`, `idCard`…) à un balisage, une largeur et une hauteur. [`Icon.tsx`](src:mobile-app/src/components/ui/icons/Icon.tsx) l'affiche avec `SvgXml` de `react-native-svg` :

| Prop | Rôle |
|---|---|
| `name` | Clé de `iconData` (type `IconName`) |
| `size` | Largeur ; la hauteur suit les proportions de l'icône |
| `color` | Couleur appliquée par `currentColor`, `ink` du thème par défaut |

L'icône est masquée aux lecteurs d'écran (`importantForAccessibility="no"`) : le libellé doit être porté par le bouton qui la contient. Ajouter une icône demande de déposer le SVG dans `assets/icons`, puis d'ajouter son entrée dans `iconData.ts` : le fichier SVG n'est pas lu à l'exécution.

## Composants métier

| Dossier | Composants |
|---|---|
| [`components/auth`](src:mobile-app/src/components/auth) | `AuthHero`, `SocialAuthButtons`, `PasswordRules`, `CheckboxRow`, `OrDivider`, `TextLink`, `FormMessage`, `DevOtpHint`, `HighlightCard`, `AgeNoticeCard`, `IdentitySideCard`, utilitaires `authErrors` |
| [`components/draw`](src:mobile-app/src/components/draw) | `DrawWheel` (roue à 10 secteurs), `CurrentTicketCard`, `ResultCards`, `RoomChat`, `WaitingRoomClosed`, `CrossFade`, `RollingValue`, `PulseDots`, hook `useNow`, formats `drawFormat` |
| [`components/lottery`](src:mobile-app/src/components/lottery) | `DeadlineCard`, `MilestonesPanel`, `DrawStatusBadge`, `DialogSummary`, `ScratchOfferCard`, hook `useCountdown`, formats `lotteryFormat` |
| [`components/marketplace`](src:mobile-app/src/components/marketplace) | `ScratchCanvas`, `ScratchOfferCard`, `CodeCard`, `RewardCard`, `PointsBalanceCard`, utilitaires `apiErrors` et `scratchOffers` |
| [`components/profile`](src:mobile-app/src/components/profile) | `IdentityCard`, `ReferralCodeCard`, `SummaryTiles`, `ListGroup`, `SwitchRow`, `TabTitle`, utilitaire `ageStatus` |
| [`components/settings`](src:mobile-app/src/components/settings) | `SettingsLinkCard` (carte de section de l'accueil des paramètres), utilitaires `displayName` (`fullName`, `nameInitials`), hook `usePreferenceSaver` (enregistrement d'une préférence avec retour arrière en cas d'échec) |
| [`components/web3`](src:mobile-app/src/components/web3) | `IntegratedWalletCard`, `IntegratedWalletButton`, `ExplorerLink`, plus utilisés par aucun écran |

`ScratchCanvas` découpe la zone à gratter en une grille de cellules. Chaque contact du doigt (`PanResponder`) efface les cellules proches, et le code est révélé quand 60 % de la surface est découverte. Pour les lecteurs d'écran, la zone est annoncée comme réglable avec le pourcentage découvert, et l'action d'accessibilité « Tout révéler » affiche le code sans geste de glissement.

Les composants du tirage et de la boutique sont décrits dans [Portefeuille et loterie](portefeuille-loterie.md).

## Accessibilité

La refonte a ajouté les props d'accessibilité de React Native aux composants principaux :

| Élément | Props |
|---|---|
| `AppButton` | `accessibilityRole="button"`, libellé, indication, états `disabled` et `busy` |
| Barre d'onglets | Rôles `tablist` et `tab`, état `selected` |
| `AppInput` | Bouton d'affichage du mot de passe avec rôle et libellé |
| `ResultDialog` | `accessibilityViewIsModal`, titre en rôle `header` |
| `FormMessage`, copie du code de parrainage, résultat du tirage, bandeau de notification | `accessibilityLiveRegion="polite"` |
| `ScratchCanvas` | Rôle `adjustable`, progression annoncée, action « Tout révéler » |

Restent à traiter : `AppText`, `Pill`, `StepList`, `Screen`, `Loader` et `BottomSheet` n'ont aucune prop d'accessibilité, la `BottomSheet` ne déplace pas le focus, et `accessibilityLiveRegion` n'a d'effet que sur Android. La roue du tirage tourne sans tenir compte du réglage « Réduire les animations » du système. La taille du texte suit le réglage d'accessibilité du système, puisque `allowFontScaling` n'est jamais désactivé ; les mises en page n'ont pas été vérifiées avec de très grandes tailles. Les obligations sont rappelées dans [Accessibilité numérique](../juridique/accessibilite.md).

## Ajouter un composant

1. Lire les couleurs et les espacements avec `useAppTheme()`, jamais en dur, pour suivre le thème sombre, et préférer les jetons de la maquette (`ink`, `sun`, `surface`…) aux anciens alias.
2. Utiliser `AppText` pour tout texte, afin de garder la police Inter et l'échelle typographique.
3. Passer chaque libellé par `t('...', '...')`.
4. Utiliser `Icon` pour les pictogrammes et porter le libellé sur l'élément interactif.
5. Ajouter `accessibilityRole` et `accessibilityLabel` dès la création.
