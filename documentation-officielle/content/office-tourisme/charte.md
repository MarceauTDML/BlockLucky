# Charte graphique et médias

La mise en page reprend les codes d'un site d'office de tourisme de grande ville : pré-header de liens institutionnels, hero plein écran, titres en capitales, cartes photo, agenda en carrousel, pied de page avec horaires et labels. Les couleurs sont celles de l'identité EtherBay partagée avec le frontend web et l'application mobile (voir [Design system](../web/design-system.md) et [Thème et composants](../mobile/theme-composants.md)).

## Couleurs

Les couleurs sont déclarées une seule fois, en variables CSS, dans [`assets/css/tokens.css`](src:frontend-office-tourisme/assets/css/tokens.css). Les feuilles de style n'utilisent que les variables sémantiques de la seconde colonne, jamais les valeurs hexadécimales.

| Variable de base | Valeur | Variable sémantique | Usage |
| --- | --- | --- | --- |
| `--eb-green` | `#253D2C` | `--color-cta` | Boutons, marque, `theme-color` du navigateur, fond du favicon |
| `--eb-green-light` | `#3B5E46` | `--color-cta-hover` | Survol des boutons |
| `--eb-green-soft` | `#6B9B79` | - | Déclarée mais inutilisée à ce jour |
| `--eb-terracotta` | `#C86D51` | `--color-accent` | Titres d'accent, badges, grands textes |
| `--eb-terracotta-text` | `#A9553C` | `--color-accent-text` | Petits textes d'accent |
| `--eb-sand` | `#F7F6F2` | - | Fonds clairs, texte clair sur fond sombre |
| `--eb-stone` | `#EFECE6` | `--color-bg-alt` | Fonds de sections alternées |
| `--eb-border` | `#E4E2DD` | - | Bordures |
| `--eb-ink` | `#18181B` | `--color-text`, `--color-bar` | Texte principal, pré-header, barre basse du pied de page |
| `--eb-ink-soft` | `#52525B` | `--color-text-soft` | Texte secondaire |
| `--eb-muted` | `#6E6D68` | - | Déclarée mais inutilisée à ce jour |
| `--eb-white` | `#FFFFFF` | `--color-bg` | Fond principal |

### Contrastes

Ratios de contraste calculés selon la formule WCAG 2.1, à partir des valeurs de `tokens.css` :

| Texte | Fond | Ratio | Niveau AA |
| --- | --- | --- | --- |
| Encre `#18181B` | blanc | 17,7:1 | conforme |
| Vert `#253D2C` | blanc | 11,8:1 | conforme |
| Blanc | vert clair `#3B5E46` (survol) | 7,3:1 | conforme |
| Encre douce `#52525B` | blanc | 7,7:1 | conforme |
| Terracotta texte `#A9553C` | blanc | 5,2:1 | conforme |
| Terracotta texte `#A9553C` | sable `#F7F6F2` | 4,8:1 | conforme |
| Terracotta texte `#A9553C` | pierre `#EFECE6` | 4,4:1 | grands textes seulement |
| Terracotta `#C86D51` | blanc | 3,6:1 | grands textes seulement |

C'est la raison d'être de la variante `--eb-terracotta-text` : la terracotta de la marque n'atteint pas 4,5:1 sur blanc et reste réservée aux titres. Sur le fond pierre des sections alternées, même la variante texte passe sous 4,5:1 : un petit texte d'accent posé sur `--color-bg-alt` doit utiliser l'encre douce.

Le site n'a pas de thème sombre : aucune règle `prefers-color-scheme` dans les feuilles de style.

## Typographie

| Rôle | Police | Graisses embarquées | Variable | Pile de repli |
| --- | --- | --- | --- | --- |
| Titres, en capitales | Jost | 500, 600, 700 | `--font-display` | Futura, Century Gothic, Trebuchet MS, sans-serif |
| Texte courant | Inter | 300, 400, 500, 600 | `--font-body` | -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif |

Les échelles de taille sont fluides, avec `clamp()` : de `--fs-hero` (2,6 à 5,4 rem) à `--fs-xs` (0,8125 rem), le texte courant étant à `--fs-body` (1,125 rem, soit 18 px). Les espacements suivent la même logique : `--gutter` (20 à 40 px) et `--section-space` (64 à 120 px). Les conteneurs font 1180 px (`--container`) ou 1320 px (`--container-wide`).

### Polices auto-hébergées

Les sept fichiers WOFF2 sont dans [`assets/fonts/`](src:frontend-office-tourisme/assets/fonts/) et déclarés dans [`assets/css/fonts.css`](src:frontend-office-tourisme/assets/css/fonts.css), un `@font-face` par graisse. Extrait, sans la ligne `unicode-range` qui limite chaque fichier aux caractères latins :

```text
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../fonts/inter-latin-400-normal.woff2') format('woff2');
}
```

| Choix | Raison |
| --- | --- |
| Aucun appel à Google Fonts ni à un CDN | Aucune adresse IP de visiteur transmise à un tiers, donc aucun transfert hors de l'Union européenne à justifier, et compatibilité avec la politique `font-src 'self'` |
| Sous-ensemble latin (`unicode-range`) | Fichiers légers : l'ensemble du dossier pèse environ 150 Ko |
| `font-display: swap` | Le texte s'affiche tout de suite avec la police de repli, puis bascule |
| `<link rel="preload">` sur Inter 400 et Jost 600 | Les deux graisses de la première vue arrivent avant la feuille de style |

Les deux polices sont sous licence SIL Open Font License 1.1, dont le texte accompagne les fichiers ([`LICENSE-inter.txt`](src:frontend-office-tourisme/assets/fonts/LICENSE-inter.txt), [`LICENSE-jost.txt`](src:frontend-office-tourisme/assets/fonts/LICENSE-jost.txt)). Cette licence autorise l'embarquement et la redistribution, à condition de conserver ces fichiers.

## Identité visuelle

| Élément | Fichier | Description |
| --- | --- | --- |
| Logo | `brand()` dans [`modules/layout.js`](src:frontend-office-tourisme/assets/js/modules/layout.js) et `BRAND_WAVE` dans [`modules/icons.js`](src:frontend-office-tourisme/assets/js/modules/icons.js) | Mot « ETHER » + deux vagues SVG + « BAY », sous-titre « DESTINATION ». Entièrement en texte et SVG, sans image |
| Favicon | [`assets/img/favicon.svg`](src:frontend-office-tourisme/assets/img/favicon.svg) | Carré arrondi vert `#253D2C`, deux vagues sable et terracotta |
| Motif de plan | [`assets/img/map-pattern.svg`](src:frontend-office-tourisme/assets/img/map-pattern.svg) | Fond des sections « carte » (`.section--map`), du bloc newsletter (`.newsletter__box`) et de l'encart de localisation des fiches (`.fiche-map`) |
| Icônes | `ICONS` de `modules/icons.js` | SVG en trait, `stroke="currentColor"`, toutes `aria-hidden="true"` et `focusable="false"` |
| Labels | `LABELS` de [`data/site.js`](src:frontend-office-tourisme/assets/js/data/site.js) | Pastilles textuelles T&H, DID, ISO, VÉLO avec le nom complet en `title`. Ce sont des labels fictifs, sans logo officiel |

L'encart de localisation d'une fiche n'est pas une carte interactive : c'est le motif SVG, une épingle et l'adresse en texte. Aucun service de cartographie n'est appelé.

## Photos

Les 63 photos sont dans [`assets/img/photos/`](src:frontend-office-tourisme/assets/img/photos/), pour environ 10,5 Mo au total.

| Usage | Largeur | Exemples |
| --- | --- | --- |
| Hero et bandeaux pleine largeur | 1920 px | `hero-port.jpg`, `bandeau-loterie.jpg`, `bandeau-groupe.jpg`, `bandeau-greeters.jpg`, `bandeau-pros.jpg` |
| Cartes, fiches, articles | 1400 px de large, ou 1400 px de haut pour les deux photos en portrait (`article-lumieres.jpg`, `grand-hotel.jpg`) | `boulangerie-du-port.jpg`, `article-criee.jpg` |

Toutes sont des JPEG progressifs : le navigateur affiche une version floue dès les premiers octets. Selon le README du site, l'ensemble pesait 215 Mo avant redimensionnement et compression.

### Nommage

Une photo porte le nom du champ `visual` de la donnée qui l'utilise, qui vaut par défaut l'identifiant du lieu. `visualSrc(name)` de [`modules/utils.js`](src:frontend-office-tourisme/assets/js/modules/utils.js) construit le chemin :

```javascript
export const visualSrc = (name) => `assets/img/photos/${name}.jpg`;
```

Pour changer la photo d'un lieu, remplacer le fichier en gardant son nom. Pour partager une photo entre plusieurs contenus, renseigner le même `visual` : la tuile « Les partenaires EtherPoints » réutilise ainsi `loterie-citoyenne.jpg`.

Les images des cartes sont chargées en différé (`loading="lazy"`, `decoding="async"`). Elles ont un texte alternatif vide (`alt=""`) : elles sont décoratives, le nom du lieu ou de l'événement étant toujours écrit à côté.

### Licence

Les photos proviennent de Pixabay et sont utilisées selon la licence de contenu Pixabay : usage libre, y compris commercial, sans attribution obligatoire. Les crédits sont tout de même indiqués dans les mentions légales du site, avec la précision que les lieux photographiés ne se trouvent pas à EtherBay. Le dépôt ne conserve pas l'URL d'origine de chaque photo.

| Contrainte de la licence Pixabay | Respect dans le projet |
| --- | --- |
| Pas de revente des photos telles quelles | Les photos illustrent un site, elles ne sont pas distribuées seules |
| Pas d'usage trompeur laissant croire à l'approbation d'une personne ou d'une marque visible | Les commerces sont fictifs, les mentions légales le disent |
| Les marques, logos et personnes reconnaissables restent soumis à leurs propres droits | À vérifier photo par photo avant toute réutilisation hors du projet |

La page [Licences](../juridique/licences.md) récapitule les licences de tout le dépôt.

### Ajouter une photo

1. Choisir une photo sous licence libre compatible et noter sa source.
2. La redimensionner à 1400 px de large (1920 px pour un bandeau pleine largeur).
3. L'enregistrer en JPEG progressif sous le nom `<visual>.jpg`.
4. Viser le poids des photos actuelles : 170 Ko en moyenne, 390 Ko au plus (`musee-beaux-arts.jpg`).

L'image Docker copie tout le dossier `assets/` : aucune déclaration supplémentaire n'est nécessaire.
