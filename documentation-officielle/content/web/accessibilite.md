# Accessibilité et responsive

Le frontend web vise le niveau AA du RGAA et des WCAG 2.1, exigé pour un service public communal. Aucun audit externe n'a été réalisé : cette page décrit ce qui est implémenté dans le code, et liste les écarts connus. Le cadre juridique (obligation, déclaration d'accessibilité) est traité dans [Accessibilité numérique](../juridique/accessibilite.md).

## Structure des pages

| Mesure | Implémentation |
|---|---|
| Langue du document | `<html lang="fr">`, passé à `en` quand l'utilisateur choisit l'anglais (voir [Internationalisation](i18n.md)) |
| Lien d'évitement | « Aller au contenu » vers `#contenu`, premier élément focusable de `AppShell` et `PublicShell`, visible au focus |
| Zone principale | `<main id="contenu">` dans les coquilles, la connexion et la vérification |
| Navigation | `<nav aria-label="Navigation principale">` (barre latérale et barre basse), « Navigation publique » sur les pages publiques, « Informations légales » pour les liens vers les documents légaux |
| Page courante | `aria-current="page"` sur l'entrée active, calculée par le préfixe le plus long |
| Titres | Un `h1` par page via `PageHeader`, `h2` pour les cartes et les feuilles |
| Titre de l'onglet | Gabarit `%s · BlockLucky EtherBay` défini dans le layout racine |

## Clavier et focus

- Tous les contrôles sont des `button`, `a` ou champs natifs. Aucun `div` cliquable ne remplace un bouton.
- Le contour de focus est global : `:focus-visible` dessine 2 px en couleur `--violet`, décalés de 2 px ([`globals.css`](src:frontend-web/src/app/globals.css)). Les champs de saisie le remplacent par une bordure encre et un halo jaune de 4 px.
- Les boutons qui ne contiennent qu'une icône (cloche, déconnexion, fermeture des feuilles) portent un `aria-label` ; les icônes elles-mêmes sont en `aria-hidden`.
- Les feuilles modales ([`Sheet.tsx`](src:frontend-web/src/components/ui/Sheet.tsx)) ont `role="dialog"`, `aria-modal="true"` et `aria-labelledby` sur leur titre. À l'ouverture, le focus va au premier élément focusable ; Tab et Maj+Tab restent piégés dans la feuille ; Échap ferme si la feuille est fermable ; le défilement de la page est bloqué ; à la fermeture, le focus revient à l'élément qui l'avait ouverte.
- La carte à gratter ([`ScratchCanvas.tsx`](src:frontend-web/src/components/marketplace/ScratchCanvas.tsx)) se gratte à la souris, au doigt ou au stylet (événements `pointer`) et propose un bouton « Révéler sans gratter » pour le clavier et les lecteurs d'écran. La couche à gratter est peinte en jaune `--sun` (lu dans les styles calculés, `#FFDA38` par défaut) avec son libellé en encre `#1D2637`. Le code masqué est annoncé « Code masqué » puis révélé dans une zone `aria-live`.
- Le bandeau de consentement (`ConsentBanner`) est une région titrée (`role="region"`, `aria-labelledby`) ; ses boutons « Tout refuser » et « Tout accepter » ont la même présentation. Dans `ConsentControls`, le choix actif est exposé par `aria-pressed` et l'état courant est annoncé en `role="status"`. Le bandeau n'est pas une feuille modale : il ne piège pas le focus.
- Le bouton de son (`SoundToggle`) ne contient qu'une icône ; il porte un `aria-label` et un `title` qui changent avec l'état (« Couper les sons » ou « Activer les sons »).

> [!NOTE]
> `SegmentedTabs` (`role="tablist"`) et `ChoicePills` (`role="radiogroup"`) se parcourent avec Tab, chaque option étant un bouton. Ils ne gèrent pas les flèches du clavier ni `aria-controls`, attendus par les motifs ARIA correspondants. Ce sont des améliorations à prévoir, pas des blocages.

## Lecteurs d'écran

| Élément | Restitution |
|---|---|
| Boutons en chargement | `aria-busy="true"` et bouton désactivé ; le `Spinner` porte `role="status"` et le libellé « Chargement » |
| Chargements | `Loader` dans une zone `aria-live="polite"` avec un message explicite |
| Erreurs | `Alert` de ton `error` en `role="alert"`, les autres en `role="status"` ; `Input` relie son message par `aria-describedby` et pose `aria-invalid` |
| Reçu d'achat, carte du gagnant, roue | Zones `aria-live="polite"` : l'arrivée de la confirmation ou du résultat est annoncée |
| Discussion en direct | `role="log"` et `aria-live="polite"` ; libellé caché pour le champ de saisie |
| Compte à rebours | `aria-live="off"` pour ne pas annoncer chaque seconde |
| Jauge de participation | `role="progressbar"` avec `aria-valuemin`, `aria-valuemax`, `aria-valuenow` et un libellé |
| Graphiques du dashboard | `BarList` masque le dessin (`aria-hidden`) et fournit un tableau `sr-only` avec `<caption>` ; `RingMeter` est un `role="img"` avec un `aria-label` donnant le pourcentage |
| Images | QR codes et visuels POAP ont un `alt` traduit ; icônes SVG, dessin de la roue, pastilles et séparateurs décoratifs sont en `aria-hidden` ; le logo est dans un lien libellé « BlockLucky, accueil » |
| Classement | Rang annoncé par `aria-label` |

Le test « fournit un tableau équivalent pour les lecteurs d'écran » de [`components.test.tsx`](src:frontend-web/__tests__/components.test.tsx) vérifie le tableau de `BarList`, et « expose la progression aux technologies d'assistance » vérifie la jauge.

## Mouvement

Une règle globale de `globals.css` neutralise toutes les animations et transitions quand le système demande moins de mouvement :

```text
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

La roue du tirage, les squelettes et l'ouverture des feuilles deviennent donc instantanés.

Les sons du tirage (roue sur `/tirage`, compte à rebours des 8 dernières secondes sur `/accueil`) ne partent jamais d'eux-mêmes au chargement : [`useSound.ts`](src:frontend-web/src/hooks/useSound.ts) attend une première interaction (clic, toucher ou touche du clavier, ou `navigator.userActivation.hasBeenActive`). Ils se coupent avec `SoundToggle`, et ce choix est mémorisé (`bl.pref.sound`). Aucune information n'est transmise par le son seul : la roue et le compte à rebours restent visibles.

## Contrastes

Ratios calculés sur les valeurs de `globals.css` (formule WCAG de luminance relative). Le seuil AA est 4,5 pour le texte courant et 3 pour le grand texte (24 px, ou 18,66 px en gras) et les éléments graphiques.

| Combinaison | Clair | Sombre | Verdict pour du texte de 12 à 15 px |
|---|---|---|---|
| `--text` sur `--bg` | 14,16 | 16,54 | conforme |
| `--text-secondary` sur `--bg` | 4,66 | 7,90 | conforme, de peu en clair |
| `--on-sun` sur `--sun` (bouton principal, carte du tirage, pilule des points) | 11,08 | 11,08 | conforme |
| `--on-primary` sur `--primary` (bouton secondaire, choix actif) | 15,17 | 13,90 | conforme |
| `--on-sun-nav` sur `--sun-nav` (entrée de navigation active) | 13,53 | 10,16 | conforme |
| Pilule `sun-chip` (surtitres, badge d'avertissement) : `--on-sun` en clair, `--sun` en sombre | 14,08 | 9,07 | conforme |
| `--violet` sur `--lavender` (alerte d'information, bouton `soft`) | 4,76 | 6,73 | conforme |
| `--green` sur `--mint` (alerte de succès) | 5,21 | 6,63 | conforme |
| `--error` sur `--peach` (alerte d'erreur) | 4,50 | 6,47 | conforme, au seuil en clair |
| `--error` sur `--surface` (bouton `danger`) | 5,42 | 7,54 | conforme |
| `--text-muted` sur `--bg` | 2,88 | 4,99 | insuffisant en clair |
| `--text-muted` sur `--surface` | 3,09 | 4,36 | insuffisant |

Pour les éléments graphiques (seuil 3) :

| Combinaison | Clair | Sombre | Verdict |
|---|---|---|---|
| Contour de focus `--violet` sur `--bg` | 5,26 | 8,41 | conforme |
| Remplissage `--sun` de la jauge sur sa piste `--surface-elevated` | 1,22 | 10,24 | insuffisant en clair ; la valeur reste lisible dans la pilule du compteur |
| Pastille `--coral` des notifications sur `--surface` | 2,74 | 5,76 | insuffisant en clair ; décorative, le nombre de non lues est dans l'`aria-label` de la cloche |

Le texte d'un bouton désactivé (`--text-muted` sur `--surface-elevated`, 2,76 en clair) n'est pas soumis au seuil, les composants inactifs en étant exemptés par les WCAG.

> [!WARNING]
> Le texte atténué (`text-fg-muted`) est très utilisé en taille `caption` (12 px) pour les mentions, les horodatages et le pied de page de sécurité. Il ne respecte pas le ratio de 4,5:1 et constitue l'écart d'accessibilité le plus visible. Foncer `--text-muted` en thème clair (par exemple vers la valeur de `--text-secondary`) corrigerait l'essentiel ; la valeur vient de la palette mobile (`textMuted`), le changement est donc à reporter dans [`mobile-app/src/theme/colors.ts`](src:mobile-app/src/theme/colors.ts).

## Responsive

Le site est conçu d'abord pour le téléphone, puis élargi. Les points de rupture sont ceux de Tailwind par défaut.

| Largeur | Comportement |
|---|---|
| moins de 768 px | En-tête compact avec le logo, barre d'onglets fixe en bas, cartes en une colonne, feuilles modales en bas de l'écran avec une poignée |
| à partir de `md` (768 px) | Marges plus larges, titres en `text-hero`, feuilles centrées, grilles à deux colonnes sur certaines pages |
| moins de 1024 px | Barre d'onglets fixe en bas : jusqu'à cinq entrées ; au-delà, les quatre premières et un bouton « Plus » (`aria-expanded`, `aria-controls="menu-plus"`) qui ouvre un menu des entrées restantes, fermé par Échap, au clic en dehors, au clic sur un lien ou au changement de page |
| à partir de `lg` (1024 px) | Barre latérale fixe de 272 px (une carte arrondie décollée des bords) avec toutes les entrées (y compris celles marquées `desktopOnly`), barre basse masquée, grilles multi-colonnes, discussion du tirage collante |

D'autres mesures concernent le mobile :

- `viewport` avec `viewportFit: 'cover'`, et marges basses `env(safe-area-inset-bottom)` pour la barre d'onglets et les feuilles : rien n'est masqué par la barre système des iPhone.
- Hauteurs en `dvh` (`min-h-dvh`) pour tenir compte de la barre d'adresse mobile.
- Boutons de 52 px de haut (`min-h-[52px]`) en taille `md`, au-dessus des 44 px recommandés pour une cible tactile. Les boutons `sm` font 40 px, comme la cloche des notifications.
- Contenu principal limité à `max-w-6xl`, avec une marge basse de 144 px sur mobile pour ne pas passer sous la barre d'onglets et la mention de sécurité.
- `-webkit-text-size-adjust: 100%` empêche l'agrandissement automatique du texte en mode paysage sur iOS.
- Champs avec `inputMode` et `autoComplete` adaptés (`email`, `numeric`, `one-time-code`) pour afficher le bon clavier.

## Points à vérifier avant une mise en ligne

1. Corriger les contrastes listés plus haut.
2. Ajouter la navigation aux flèches dans `SegmentedTabs` et `ChoicePills`.
3. Traduire les quelques textes d'interface encore en français fixe (loader de session, libellé du spinner).
4. Faire un audit manuel avec un lecteur d'écran (NVDA, VoiceOver) et un contrôle automatique (axe) sur les parcours clés : connexion, achat, tirage, boutique.
5. Rédiger la déclaration d'accessibilité.
