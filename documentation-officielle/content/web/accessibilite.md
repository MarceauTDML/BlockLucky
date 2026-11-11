# Accessibilité et responsive

Le frontend web vise le niveau AA du RGAA et des WCAG 2.1, exigé pour un service public communal. Aucun audit externe n'a été réalisé : cette page décrit ce qui est implémenté dans le code, et liste les écarts connus. Le cadre juridique (obligation, déclaration d'accessibilité) est traité dans [Accessibilité numérique](../juridique/accessibilite.md).

## Structure des pages

| Mesure | Implémentation |
|---|---|
| Langue du document | `<html lang="fr">`, passé à `en` quand l'utilisateur choisit l'anglais (voir [Internationalisation](i18n.md)) |
| Lien d'évitement | « Aller au contenu » vers `#contenu`, premier élément focusable de `AppShell` et `PublicShell`, visible au focus |
| Zone principale | `<main id="contenu">` dans les coquilles, la connexion et la vérification |
| Navigation | `<nav aria-label="Navigation principale">` (barre latérale et barre basse), « Navigation publique » sur les pages publiques |
| Page courante | `aria-current="page"` sur l'entrée active, calculée par le préfixe le plus long |
| Titres | Un `h1` par page via `PageHeader`, `h2` pour les cartes et les feuilles |
| Titre de l'onglet | Gabarit `%s · BlockLucky EtherBay` défini dans le layout racine |

## Clavier et focus

- Tous les contrôles sont des `button`, `a` ou champs natifs. Aucun `div` cliquable ne remplace un bouton.
- Le contour de focus est global : `:focus-visible` dessine 2 px en couleur `--secondary`, décalés de 2 px ([`globals.css`](src:frontend-web/src/app/globals.css)).
- Les feuilles modales ([`Sheet.tsx`](src:frontend-web/src/components/ui/Sheet.tsx)) ont `role="dialog"`, `aria-modal="true"` et `aria-labelledby` sur leur titre. À l'ouverture, le focus va au premier élément focusable ; Tab et Maj+Tab restent piégés dans la feuille ; Échap ferme si la feuille est fermable ; le défilement de la page est bloqué ; à la fermeture, le focus revient à l'élément qui l'avait ouverte.
- La carte à gratter ([`ScratchCanvas.tsx`](src:frontend-web/src/components/marketplace/ScratchCanvas.tsx)) se gratte à la souris, au doigt ou au stylet (événements `pointer`) et propose un bouton « Révéler sans gratter » pour le clavier et les lecteurs d'écran. Le code masqué est annoncé « Code masqué » puis révélé dans une zone `aria-live`.
- Le bouton d'opposition à la mesure d'audience expose son état par `aria-pressed`.

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
| Images | QR codes et visuels POAP ont un `alt` traduit ; pastilles et séparateurs décoratifs sont en `aria-hidden` |
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

## Contrastes

Ratios calculés sur les valeurs de `globals.css` (formule WCAG de luminance relative). Le seuil AA est 4,5 pour le texte courant et 3 pour le grand texte (24 px, ou 18,66 px en gras) et les éléments graphiques.

| Combinaison | Clair | Sombre | Verdict pour du texte de 12 à 15 px |
|---|---|---|---|
| `--text` sur `--bg` | 16,38 | 16,75 | conforme |
| `--text-secondary` sur `--bg` | 7,15 | 7,03 | conforme |
| `--primary` sur `--bg` | 10,89 | 3,74 | conforme en clair, insuffisant en sombre |
| `--on-primary` sur `--primary` (bouton principal) | 10,89 | 4,56 | conforme |
| `--secondary` sur `--bg` (surtitres, points) | 3,37 | 5,06 | insuffisant en clair |
| `--on-primary` sur `--secondary` (bouton secondaire) | 3,37 | 3,37 | insuffisant |
| `--text-muted` sur `--bg` | 3,02 | 3,56 | insuffisant |
| `--text-muted` sur `--surface` | 3,26 | 3,22 | insuffisant |
| `--warning` sur `--surface-elevated` (badge démonstration) | 4,26 | 4,64 | insuffisant en clair |
| `--error` sur `--surface-elevated` | 5,49 | 3,06 | insuffisant en sombre |

> [!WARNING]
> Le texte atténué (`text-fg-muted`) et le terracotta (`text-secondary`) sont très utilisés en taille `caption` (12 px). Ils ne respectent pas le ratio de 4,5:1 et constituent l'écart d'accessibilité le plus visible. Foncer `--text-muted` et `--secondary` en thème clair, et éclaircir `--primary` et `--error` en thème sombre, corrigerait l'essentiel. Les valeurs doivent ensuite être reportées dans le thème mobile.

## Responsive

Le site est conçu d'abord pour le téléphone, puis élargi. Les points de rupture sont ceux de Tailwind par défaut.

| Largeur | Comportement |
|---|---|
| moins de 768 px | En-tête compact avec le logo, barre d'onglets fixe en bas (5 entrées au plus), cartes en une colonne, feuilles modales en bas de l'écran avec une poignée |
| à partir de `md` (768 px) | Marges plus larges, titres en `text-hero`, feuilles centrées, grilles à deux colonnes sur certaines pages |
| à partir de `lg` (1024 px) | Barre latérale fixe de 256 px avec toutes les entrées (y compris celles marquées `desktopOnly`), barre basse masquée, grilles multi-colonnes, discussion du tirage collante |

D'autres mesures concernent le mobile :

- `viewport` avec `viewportFit: 'cover'`, et marges basses `env(safe-area-inset-bottom)` pour la barre d'onglets et les feuilles : rien n'est masqué par la barre système des iPhone.
- Hauteurs en `dvh` (`min-h-dvh`) pour tenir compte de la barre d'adresse mobile.
- Boutons de 48 px de haut (`min-h-12`) en taille `md`, au-dessus des 44 px recommandés pour une cible tactile. Les boutons `sm` font 36 px.
- Contenu principal limité à `max-w-6xl`, avec une marge basse de 112 px sur mobile pour ne pas passer sous la barre d'onglets.
- `-webkit-text-size-adjust: 100%` empêche l'agrandissement automatique du texte en mode paysage sur iOS.
- Champs avec `inputMode` et `autoComplete` adaptés (`email`, `numeric`, `one-time-code`) pour afficher le bon clavier.

## Points à vérifier avant une mise en ligne

1. Corriger les contrastes listés plus haut.
2. Ajouter la navigation aux flèches dans `SegmentedTabs` et `ChoicePills`.
3. Traduire les quelques textes d'interface encore en français fixe (loader de session, libellé du spinner).
4. Faire un audit manuel avec un lecteur d'écran (NVDA, VoiceOver) et un contrôle automatique (axe) sur les parcours clés : connexion, achat, tirage, boutique.
5. Rédiger la déclaration d'accessibilité.
