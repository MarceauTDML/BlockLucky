# Destination EtherBay - Office de Tourisme

Site vitrine de l'Office de Tourisme de la Ville d'EtherBay, la ville fictive du projet **BlockLucky** (Epitech Digital School). Il prolonge le jeu de rôle du projet : EtherBay est une ville de 120 000 habitants, réputée pour son dynamisme et son ouverture à l'innovation, qui organise sa Grande Loterie citoyenne de fin d'année.

La mise en page reprend le gabarit d'un office de tourisme de grande ville (pré-header, hero plein écran, incontournables, agenda des sorties, moteurs de recherche, magazine, newsletter, pied de page institutionnel). Les contenus, les commerces et les lieux sont propres à EtherBay, aux couleurs de l'application mobile et du frontend web.

Aucun backend : HTML, CSS et JavaScript (modules ES) uniquement.

## Lancer le site

Les modules ES exigent un serveur HTTP (l'ouverture directe en `file://` est bloquée par les navigateurs).

```bash
cd frontend-office-tourisme
npm run dev
```

Le site est servi sur http://localhost:4000. Tout autre serveur statique convient (extension Live Server, `python -m http.server`, GitHub Pages…).

## Pages

| Page | Contenu |
|---|---|
| `index.html` | Accueil : hero, nouveauté (Grande Loterie citoyenne), incontournables, agenda filtrable (aujourd'hui / demain / ce week-end), planifier son séjour, groupes, magazine, #partagez, Greeters, espace partenaires |
| `decouvrir.html` | Thématiques (culture, gastronomie, histoire, nature, innovation…) et lieux emblématiques |
| `sortir.html` | Agenda complet : filtres de date, catégories, recherche |
| `manger.html`, `dormir.html` | Listings avec bons plans, sélections rapides, filtres multicritères, recherche et pagination |
| `fiche.html?id=…` / `fiche.html?event=…` | Fiche détaillée d'un commerce, d'un lieu ou d'un événement |
| `article.html?id=…` | Article du magazine |
| `billetterie.html` | Pass, croisière, visites guidées et billets d'événements, classés par catégorie |
| `commande.html` | Tunnel de commande : panier avec date de visite, coordonnées, paiement de démonstration, confirmation avec billets à QR code imprimables |
| `bientot.html?reseau=…` | Page « Bientôt disponible » des réseaux sociaux |
| `favoris.html` | Favoris enregistrés dans le navigateur |
| `infos-pratiques.html` | Venir, se déplacer, groupes, professionnels, congrès, presse, Greeters, contact |
| `mentions-legales.html`, `404.html` | Pages légales et page d'erreur |

## Lien avec BlockLucky

- La **Grande Loterie citoyenne** est mise en avant sur l'accueil, l'agenda et le magazine. Le bouton « Accéder à la loterie » ouvre le frontend web (`SITE.lotteryAppUrl` dans `assets/js/data/site.js`, `http://localhost:3000` par défaut).
- Les commerces partenaires du backend (Boulangerie du Port d'EtherBay, Cinéma Le Phare EtherBay) affichent leur offre EtherPoints.
- La Maison de la Blockchain et le campus Epitech Digital School font partie de la ville.

## Architecture

```text
frontend-office-tourisme/
├── *.html                  Pages du site
├── assets/
│   ├── css/
│   │   ├── main.css        Point d'entrée (imports)
│   │   ├── tokens.css      Couleurs EtherBay, typographies, espacements
│   │   ├── base.css        Reset, typographie, conteneurs, sections
│   │   ├── layout.css      Pré-header, en-tête, menu mobile, newsletter, pied de page
│   │   ├── components.css  Boutons, cartes, sliders, filtres, cookies, toasts
│   │   └── pages.css       Styles propres aux pages
│   ├── js/
│   │   ├── main.js         Démarrage : layout commun puis module de la page
│   │   ├── data/           Données fictives (site, lieux, événements, contenus)
│   │   ├── modules/        Layout, cartes, favoris, panier, sliders, cookies, newsletter
│   │   └── pages/          Logique de chaque page
│   └── img/
│       ├── photos/         Photos Pixabay optimisées
│       ├── map-pattern.svg Motif de plan de ville
│       └── favicon.svg
└── serve.json              Configuration du serveur de développement
```

Le pré-header, l'en-tête et le pied de page sont générés une seule fois par `modules/layout.js`. Chaque page déclare `data-page` sur le `<body>` pour charger son module.

## Charte graphique

| Rôle | Couleur |
|---|---|
| Vert EtherBay (boutons, marque) | `#253D2C` |
| Terracotta (titres d'accent, badges) | `#C86D51` |
| Terracotta texte (petits textes, conforme AA) | `#A9553C` |
| Sable / pierre (fonds) | `#F7F6F2` / `#EFECE6` |
| Encre (pré-header, barre de pied de page) | `#18181B` |

Typographies : Jost (titres en capitales) et Inter (texte), chargées depuis Google Fonts avec repli sur les polices système.

## Photos

Les 63 photos de `assets/img/photos/` proviennent de Pixabay (licence de contenu Pixabay, usage libre sans attribution obligatoire). Elles ont été redimensionnées et compressées pour le web :

- 1920 px de large pour le hero et les bandeaux ;
- 1400 px pour les autres ;
- JPEG progressif.

L'ensemble passe ainsi de 215 Mo à environ 10 Mo.

Chaque commerce, lieu et événement a sa propre photo, nommée d'après son identifiant dans `assets/js/data/` (par exemple `boulangerie-du-port.jpg`). Pour en changer une, remplace le fichier en gardant le même nom.

## Billetterie et commande

- Depuis une fiche événement, « Réserver » ajoute directement le billet au panier et ouvre la commande. Les événements gratuits proposent à la place « Ajouter à mon agenda », qui télécharge un fichier `.ics`.
- Le parcours de commande ne demande et ne collecte aucune donnée bancaire. L'étape de paiement est clairement signalée comme une démonstration.
- Les commandes sont enregistrées dans le navigateur. On retrouve une confirmation par `commande.html?commande=<numéro>`.
- Les QR codes sont générés côté client avec [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (licence MIT, `assets/js/vendor/qrcode.mjs`).

## Accessibilité et vie privée

- Lien d'évitement, navigation clavier, menu mobile accessible (Échap, focus), libellés ARIA sur les favoris, sliders et filtres.
- Respect de `prefers-reduced-motion`.
- Bandeau cookies avec refus en un clic. Favoris, panier, préférences et inscription à la newsletter restent dans le `localStorage` du navigateur.
