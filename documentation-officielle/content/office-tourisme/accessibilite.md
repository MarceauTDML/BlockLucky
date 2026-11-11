# Accessibilité et vie privée

Le site d'un office de tourisme est un service public numérique : il doit être utilisable au clavier et avec un lecteur d'écran, et il ne doit pas suivre ses visiteurs sans leur accord. Cette page décrit ce que le code met réellement en place, et ce qui manque. Le cadre légal (RGAA, directive ePrivacy, RGPD) est traité dans [Accessibilité numérique](../juridique/accessibilite.md) et [Cookies, mentions et CGU](../juridique/cookies-mentions.md).

## Accessibilité

### Structure et navigation clavier

| Mesure | Mise en œuvre |
| --- | --- |
| Langue de la page | `<html lang="fr">` sur les 14 pages |
| Lien d'évitement | `<a class="skip-link" href="#contenu">Aller au contenu</a>`, premier élément focusable, visible au focus ([`base.css`](src:frontend-office-tourisme/assets/css/base.css)) |
| Focus visible | `:focus-visible` : contour terracotta de 3 px décalé de 3 px, sur tous les éléments |
| Régions nommées | Pré-header « Accès rapides », menu « Navigation principale », menu mobile « Navigation mobile », pied de page « Sites associés », fil d'Ariane, pagination, filtres |
| Page courante | `aria-current="page"` sur l'entrée du menu, `aria-current="step"` sur l'étape de commande, `aria-current="page"` sur le numéro de pagination |
| Titres | un `<h1>` par page, sections reliées à leur titre par `aria-labelledby` |
| Ancres sous l'en-tête collant | `.anchor-section` a un `scroll-margin-top` égal à la hauteur de l'en-tête plus 20 px ([`pages.css`](src:frontend-office-tourisme/assets/css/pages.css)) : le titre visé par une ancre n'est pas masqué |

### Composants interactifs

| Composant | Attributs et comportement | Fichier |
| --- | --- | --- |
| Menu mobile | `role="dialog"`, `aria-modal="true"`, bouton d'ouverture avec `aria-expanded` et `aria-controls`. À l'ouverture, le focus va sur « Fermer le menu » et le défilement de la page est bloqué ; Échap ferme ; à la fermeture, le focus revient sur le bouton d'ouverture | [`modules/layout.js`](src:frontend-office-tourisme/assets/js/modules/layout.js) |
| Favoris | bouton avec `aria-pressed` et libellé « Ajouter aux favoris » ou « Retirer des favoris » mis à jour à chaque clic, sur tous les cœurs du même contenu | [`modules/favorites.js`](src:frontend-office-tourisme/assets/js/modules/favorites.js) |
| Carrousels | boutons « Précédent » et « Suivant » nommés, désactivés aux extrémités ; le contenu reste défilable au doigt et au pavé tactile | [`modules/slider.js`](src:frontend-office-tourisme/assets/js/modules/slider.js) |
| Filtres rapides, catégories, agenda | boutons à bascule avec `aria-pressed` | [`pages/listing.js`](src:frontend-office-tourisme/assets/js/pages/listing.js), [`pages/sortir.js`](src:frontend-office-tourisme/assets/js/pages/sortir.js), [`pages/home.js`](src:frontend-office-tourisme/assets/js/pages/home.js) |
| Filtres multicritères | `<fieldset>` et `<legend>` par groupe, cases à cocher natives ; bouton « Filtrer les offres » avec `aria-expanded` sur mobile | `pages/listing.js` |
| Nombre de résultats | titre `aria-live="polite"` : « 12 offres trouvées » est annoncé après chaque filtre | `manger.html`, `dormir.html`, `sortir.html`, `favoris.html` |
| Notifications | `toast` crée une zone `role="status"` et `aria-live="polite"` (« Ajouté à vos favoris », « Billet ajouté au panier ») | [`modules/utils.js`](src:frontend-office-tourisme/assets/js/modules/utils.js) |
| Quantités | `role="group"` nommé « Quantité pour <offre> », boutons « Ajouter un billet » et « Retirer un billet », valeur dans un `<output aria-live="polite">` | [`pages/billetterie.js`](src:frontend-office-tourisme/assets/js/pages/billetterie.js), [`pages/commande.js`](src:frontend-office-tourisme/assets/js/pages/commande.js) |
| Formulaires | `<label>` explicites (masqués visuellement par `.sr-only` pour la newsletter), `autocomplete` renseigné, erreurs reliées par `aria-describedby`, champs fautifs en `aria-invalid="true"`, synthèse en `role="alert"`, focus sur le premier champ en erreur | `pages/commande.js`, [`modules/newsletter.js`](src:frontend-office-tourisme/assets/js/modules/newsletter.js) |
| Changement d'étape de commande | focus déplacé sur le titre de l'étape | `pages/commande.js` |
| Sélecteur de langue | `<label class="sr-only">`, message « traduction à venir » relié par `aria-describedby` | `modules/layout.js` |
| Icônes | SVG `aria-hidden="true"` et `focusable="false"` ; les boutons icônes ont un `aria-label` (« Panier », « Favoris », « Gérer mes cookies ») | [`modules/icons.js`](src:frontend-office-tourisme/assets/js/modules/icons.js) |
| QR codes | `role="img"`, `aria-label="QR code du billet <code>"` | `pages/commande.js` |

### Mouvement réduit

[`base.css`](src:frontend-office-tourisme/assets/css/base.css) respecte la préférence système `prefers-reduced-motion: reduce` :

```text
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

Les animations d'apparition (`.reveal`), les transitions du menu et du bandeau sont ainsi neutralisées. Les défilements déclenchés en JavaScript avec `behavior: 'smooth'` (boutons des carrousels, retour en haut, surbrillance d'une offre, changement de page des résultats) ne sont pas concernés par cette règle CSS et restent animés.

### Contrastes et images

Les ratios de contraste sont détaillés dans [Charte graphique et médias](charte.md#contrastes). Les photos ont un `alt=""` parce qu'elles accompagnent toujours un titre textuel. Aucune information n'est portée par l'image seule.

### Limites connues

Le pied de page affiche « Accessibilité : partiellement conforme » et la page des mentions légales indique que le site « vise la conformité RGAA ». Aucun audit RGAA n'a été mené. Points relevés à la lecture du code :

| Point | Détail |
| --- | --- |
| Pas de piège du focus | Le menu mobile et le bandeau cookies sont déclarés `aria-modal="true"`, mais la touche Tab peut sortir de la fenêtre et atteindre la page en dessous |
| Bandeau cookies sans Échap | Il ne se ferme qu'en choisissant une option, ce qui est voulu pour recueillir un choix, mais aucune touche ne le ferme |
| Zone vivante trop large | Le conteneur du tunnel de commande est entièrement en `aria-live="polite"` et redessiné à chaque action : un lecteur d'écran peut relire toute l'étape |
| Défilement animé en JavaScript | Voir la section précédente |
| Pas de thème sombre ni d'agrandissement testé | Les tailles sont en `rem` et fluides, mais le zoom à 200 % n'a pas fait l'objet d'une vérification consignée |
| Déclaration d'accessibilité | La rubrique des mentions légales n'a pas la forme réglementaire (état de conformité, dérogations, voie de recours) |

## Cookies et consentement

### Ce que fait le bandeau

[`modules/cookies.js`](src:frontend-office-tourisme/assets/js/modules/cookies.js) insère le bandeau à la fin du `<body>` et l'ouvre tant qu'aucun choix n'est enregistré :

| Bouton | Effet | Choix enregistré |
| --- | --- | --- |
| « Accepter tout » | Ferme le bandeau, notification « Préférences enregistrées » | `{ audience: true, date }` |
| « Tout rejeter » | Ferme le bandeau, notification « Cookies non essentiels refusés » | `{ audience: false, date }` |
| « Personnaliser » puis « Enregistrer » | Affiche deux cases : « Cookies essentiels » cochée et désactivée, « Mesure d'audience anonyme » à cocher | `{ audience: <case>, date }` |

Le refus se fait en un clic, au même niveau que l'acceptation, comme le recommande la CNIL. Un bouton flottant « Gérer mes cookies » rouvre le bandeau à tout moment, avec le choix précédent pré-coché. Le choix est daté au format ISO.

### Ce qui se passe réellement

Le site ne dépose **aucun cookie** : aucun appel à `document.cookie` dans le code, aucun script tiers. Les « cookies essentiels » du bandeau sont en réalité des entrées du `localStorage`. La « mesure d'audience anonyme » n'existe pas : le choix `audience` est enregistré mais aucun module ne le lit.

> [!WARNING]
> Le texte du bandeau annonce qu'« Accepter tout » autorise « la mesure d'audience anonyme de l'Office de Tourisme ». Ajouter un outil de mesure plus tard demande de le charger seulement si `storage.get('etherbay.cookie-consent')?.audience` vaut `true`, d'ajouter son domaine à la politique de sécurité de contenu (`script-src`, `connect-src`) et de mettre à jour les mentions légales.

## Données stockées dans le navigateur

Toutes les données que le visiteur produit restent dans le `localStorage` de son navigateur, sous des clés préfixées `etherbay.` :

| Clé | Contenu | Écrite par | Données personnelles |
| --- | --- | --- | --- |
| `etherbay.favorites` | Liste de références `place:<id>` et `event:<id>` | [`modules/favorites.js`](src:frontend-office-tourisme/assets/js/modules/favorites.js) | non |
| `etherbay.cart` | Panier : quantité et date par offre | [`modules/cart.js`](src:frontend-office-tourisme/assets/js/modules/cart.js) | non |
| `etherbay.checkout` | Brouillon du formulaire de coordonnées, vidé à la confirmation | [`pages/commande.js`](src:frontend-office-tourisme/assets/js/pages/commande.js) | oui : prénom, nom, email, téléphone, code postal |
| `etherbay.orders` | 20 dernières commandes avec billets | `modules/cart.js` | oui : prénom, nom, email |
| `etherbay.newsletter` | Adresses inscrites à la newsletter | [`modules/newsletter.js`](src:frontend-office-tourisme/assets/js/modules/newsletter.js), `pages/commande.js` | oui : emails |
| `etherbay.cookie-consent` | Choix du bandeau et sa date | `modules/cookies.js` | non |

Ces données ne sont transmises à aucun serveur, ce que rappellent le formulaire de commande (« elles restent enregistrées dans votre navigateur et ne sont envoyées à aucun serveur »), les CGU et la rubrique « Données personnelles » des mentions légales. Elles n'ont pas de durée de conservation et le site n'offre pas de bouton pour les effacer : seul l'effacement des données du site dans le navigateur les supprime.

Le stockage utilisé pour les favoris et le panier sert une fonction demandée par le visiteur. Il relève de l'exemption de consentement prévue pour les traceurs strictement nécessaires, ce qui explique que la case « essentiels » soit cochée d'office et grisée.

## Absence de tiers

| Ressource | Origine |
| --- | --- |
| Polices | auto-hébergées dans `assets/fonts/` |
| Scripts | modules du site et `vendor/qrcode.mjs`, servis par le même domaine |
| Images | `assets/img/`, plus des SVG en ligne et des `data:` |
| Cartes | aucune : motif SVG statique |
| Vidéos, réseaux sociaux | aucun : les liens sociaux mènent à `bientot.html` |

La politique de sécurité de contenu verrouille cette situation : le navigateur refuserait tout script, police, style ou connexion venant d'un autre domaine (voir [Servir et déployer](deploiement.md#politique-de-securite-de-contenu)). L'en-tête `Permissions-Policy` de l'image Docker désactive en plus la caméra, le micro, la géolocalisation, le paiement, l'USB et `interest-cohort`. `Referrer-Policy: strict-origin-when-cross-origin` limite l'adresse transmise quand le visiteur suit le lien vers la loterie.

## Signalement

La page des mentions légales invite à signaler toute difficulté d'accessibilité à `contact@tourisme-etherbay.fr`, adresse fictive. L'image Docker publie un fichier [`.well-known/security.txt`](src:frontend-office-tourisme/.well-known/security.txt) qui renvoie vers `securite@etherbay.fr` et la politique de sécurité du dépôt (voir [Signaler une vulnérabilité](../securite/signalement.md)).
