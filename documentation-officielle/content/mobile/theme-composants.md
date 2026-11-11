# Thème et composants

Le thème mobile est la source d'origine de la charte BlockLucky : le frontend web en a recopié les couleurs, les rayons et l'échelle typographique (voir [Design system du web](../web/design-system.md)). Il est défini en TypeScript dans [`mobile-app/src/theme`](src:mobile-app/src/theme) et distribué par un contexte React. Les composants de base sont dans [`mobile-app/src/components/ui`](src:mobile-app/src/components/ui).

## Fichiers du thème

| Fichier | Contenu |
|---|---|
| [`colors.ts`](src:mobile-app/src/theme/colors.ts) | Interface `ColorPalette`, palettes `lightColors` et `darkColors` |
| [`spacing.ts`](src:mobile-app/src/theme/spacing.ts) | Espacements adaptés à la largeur d'écran et rayons |
| [`typography.ts`](src:mobile-app/src/theme/typography.ts) | Familles, tailles et interlignes adaptés à la largeur |
| [`ThemeProvider.tsx`](src:mobile-app/src/theme/ThemeProvider.tsx) | Contexte : mode, langue, palette, dimensions, `t(fr, en)` |
| [`useAppTheme.ts`](src:mobile-app/src/hooks/useAppTheme.ts) | Hook d'accès au contexte |

## Couleurs

| Clé | Clair | Sombre | Usage |
|---|---|---|---|
| `background` | `#F7F6F2` | `#141413` | Fond des écrans |
| `surface` | `#FFFFFF` | `#1E1E1C` | Cartes, barre d'onglets, feuilles |
| `surfaceElevated` | `#EFECE6` | `#282826` | Onglet actif, zones en retrait, étiquettes |
| `primary` | `#253D2C` | `#4E7A5B` | Vert EtherBay : actions, montants |
| `primaryLight` | `#3B5E46` | `#6B9B79` | Variante claire |
| `secondary` | `#C86D51` | `#C86D51` | Terracotta : surtitres, points |
| `accent` | `#253D2C` | `#D4D2CC` | Accent |
| `text`, `textPrimary` | `#18181B` | `#F5F4F0` | Texte principal (deux clés de même valeur) |
| `textSecondary` | `#52525B` | `#A1A09A` | Texte atténué |
| `textMuted` | `#8E8E93` | `#6E6D68` | Mentions, placeholders |
| `border` | `#E4E2DD` | `#2E2E2B` | Bordures |
| `success` | `#2E6F40` | `#4E7A5B` | État positif |
| `warning` | `#B45309` | `#D97706` | Avertissement |
| `error` | `#B91C1C` | `#DC2626` | Erreur |
| `gold` | `#C86D51` | `#C86D51` | Alias de `secondary` |

Les valeurs sont identiques aux variables de `globals.css` du web. Les ratios de contraste, et les combinaisons sous le seuil AA, sont donc les mêmes (voir [Accessibilité et responsive du web](../web/accessibilite.md#contrastes)).

Le splash et l'icône adaptative Android utilisent un fond `#1A0B2E` (violet foncé) défini dans [`app.json`](src:mobile-app/app.json), qui n'appartient pas à la palette.

## Espacements et typographie adaptatifs

`spacing.ts` et `typography.ts` calculent un facteur d'échelle à partir de la largeur de la fenêtre, avec 390 points (un iPhone récent) comme référence :

| Fichier | Facteur | Bornes | Valeurs à 390 points |
|---|---|---|---|
| `spacing.ts` | `largeur / 390` | 0,85 à 1,12 | `xs` 4, `sm` 8, `md` 14, `lg` 20, `xl` 28, `xxl` 40 |
| `typography.ts` | `largeur / 390`, arrondi au pixel | 0,85 à 1,1 | tailles `xs` 12, `sm` 13, `md` 15, `lg` 17, `xl` 20, `xxl` 24, `hero` 30 |

Les rayons ne dépendent pas de l'écran : `sm` 6, `md` 10, `lg` 14, `xl` 18, `full` 9999.

Le facteur est calculé une seule fois, au chargement du module, avec `Dimensions.get('window')`. Il ne suit pas une rotation, un changement de taille de fenêtre sur tablette ou un pliable. `ThemeProvider` fournit en revanche `screenWidth`, `screenHeight` et `isCompactScreen` (largeur inférieure à 360 ou hauteur inférieure à 700) à jour grâce à `useWindowDimensions`.

Les trois familles `regular`, `medium` et `bold` valent `'System'`. Les fichiers Inter de `assets/fonts` ne sont chargés par aucun `useFonts` : l'application utilise San Francisco sur iOS et Roboto sur Android.

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
- `ProfileScreen` envoie les changements au backend (`PUT /user/preferences`), mais la valeur n'est jamais relue.

`App.tsx` adapte la barre d'état : texte clair en thème sombre, texte foncé en thème clair.

La fonction `t(fr, en)` fonctionne comme sur le web (voir [Internationalisation](../web/i18n.md)). Plusieurs textes du mobile ne passent pas par `t` : les messages d'erreur de `useCitizenWallet`, ceux des feuilles globales et les raisons des feuilles de points sont en français seulement. Beaucoup de textes évitent aussi l'apostrophe (« l offre », « d EtherBay ») pour ne pas échapper les guillemets simples, ce qui laisse des fautes visibles à l'écran.

## Composants de base

| Composant | Fichier | Props principales | Comportement |
|---|---|---|---|
| `AppText` | [`AppText.tsx`](src:mobile-app/src/components/ui/AppText.tsx) | `variant` (`hero`, `title`, `subtitle`, `body`, `caption`, `overline`), `weight` (`regular`, `medium`, `semibold`, `bold`), `color`, `align` | Taille et interligne du thème ; `overline` en majuscules espacées ; couleur `textPrimary` par défaut |
| `AppButton` | [`AppButton.tsx`](src:mobile-app/src/components/ui/AppButton.tsx) | `title`, `onPress`, `variant` (`primary`, `secondary`, `outline`, `danger`), `loading`, `disabled` | `TouchableOpacity` de 48 de haut (44 sur petit écran) ; `loading` affiche un `ActivityIndicator` et bloque l'appui ; `disabled` grise le bouton |
| `AppInput` | [`AppInput.tsx`](src:mobile-app/src/components/ui/AppInput.tsx) | `label`, `errorText` et toutes les props de `TextInput` | Libellé au-dessus, bordure rouge et message sous le champ en cas d'erreur |
| `BottomSheet` | [`BottomSheet.tsx`](src:mobile-app/src/components/ui/BottomSheet.tsx) | `visible`, `title`, `onClose`, `children` | `Modal` transparent animé par glissement, poignée, bouton « Fermer », marge basse égale à l'encart de sécurité ; le bouton retour d'Android ferme la feuille (`onRequestClose`) |
| `Loader` | [`Loader.tsx`](src:mobile-app/src/components/ui/Loader.tsx) | `message` | `ActivityIndicator` et texte « Chargement... » par défaut |
| `ProgressBar` | [`ProgressBar.tsx`](src:mobile-app/src/components/ui/ProgressBar.tsx) | pourcentage, valeurs, paliers | Jauge de participation et paliers débloqués |
| `BackButton` | [`BackButton.tsx`](src:mobile-app/src/components/ui/BackButton.tsx) | `onPress`, libellé | Bouton texte « Retour », affiché par les écrans empilés |

Il n'y a pas d'équivalent mobile de `Card`, `Alert`, `Badge`, `SegmentedTabs` ou `CheckboxCard` : chaque écran compose ces éléments avec des `View` et des styles locaux (`StyleSheet.create`) qui lisent `colors` et `borderRadius` du contexte.

## Composants métier

| Dossier | Composants |
|---|---|
| [`components/lottery`](src:mobile-app/src/components/lottery) | `ChatBox`, `CountdownTimer`, `LeaderboardList`, `POAPBadge` (visuel SVG distant avec repli), `RouletteAnimation`, `TicketCard`, `WinnerClaimCard` |
| [`components/marketplace`](src:mobile-app/src/components/marketplace) | `PointsBalanceCard`, `RewardCard`, `ScratchCanvas` |
| [`components/web3`](src:mobile-app/src/components/web3) | `IntegratedWalletCard`, `IntegratedWalletButton`, `ExplorerLink` |

`ScratchCanvas` ne dessine pas de vraie couche à gratter : chaque mouvement du doigt (`PanResponder`) ou chaque appui fait avancer la progression de 25 %, et le code est révélé à 100 %. Le texte affiché indique « Grattez ou touchez pour révéler », ce qui laisse une voie d'accès sans geste de glissement.

Les composants de portefeuille et de loterie sont décrits dans [Portefeuille et loterie](portefeuille-loterie.md).

## Accessibilité

Aucun composant ni écran n'utilise les props d'accessibilité de React Native (`accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `accessibilityLiveRegion`). Conséquences pour VoiceOver et TalkBack :

- les boutons construits avec `TouchableOpacity` sont annoncés par leur texte, mais sans rôle « bouton » explicite ni état « désactivé » ou « occupé » ;
- les onglets de `CustomTabBar` ne sont pas annoncés comme onglets et l'onglet sélectionné n'est pas signalé ;
- les changements d'état (reçu d'achat, gagnant, messages de discussion) ne sont pas annoncés ;
- la modale de majorité et les feuilles ne déplacent pas le focus du lecteur d'écran.

La taille du texte suit le réglage d'accessibilité du système, puisque `allowFontScaling` n'est jamais désactivé ; les mises en page n'ont pas été vérifiées avec de très grandes tailles. Rendre l'application accessible demande d'ajouter ces props aux composants de base en priorité (`AppButton`, `AppInput`, `BottomSheet`, `CustomTabBar`), puis aux zones dynamiques. Les obligations sont rappelées dans [Accessibilité numérique](../juridique/accessibilite.md).

## Ajouter un composant

1. Lire les couleurs et les espacements avec `useAppTheme()`, jamais en dur, pour suivre le thème sombre.
2. Utiliser `AppText` pour tout texte, afin de garder l'échelle typographique.
3. Passer chaque libellé par `t('...', '...')`.
4. Ajouter `accessibilityRole` et `accessibilityLabel` dès la création.
5. Reporter tout changement de couleur dans `frontend-web/src/app/globals.css` pour garder la parité avec le web.
