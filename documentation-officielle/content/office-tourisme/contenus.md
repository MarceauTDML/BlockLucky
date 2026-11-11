# Contenus

Tout le contenu dynamique du site (lieux, événements, articles, offres de billetterie, menus) est codé en dur dans quatre fichiers JavaScript de [`assets/js/data/`](src:frontend-office-tourisme/assets/js/data/). Il n'y a ni base de données, ni CMS, ni appel réseau. Modifier un contenu revient à modifier un tableau JavaScript, puis à recharger la page.

Toutes ces données sont fictives : la page [`mentions-legales.html`](src:frontend-office-tourisme/mentions-legales.html) précise que les commerces, lieux et événements n'existent pas et que les photos ne montrent pas EtherBay.

## Vue d'ensemble

| Fichier | Exports | Volume |
| --- | --- | --- |
| [`site.js`](src:frontend-office-tourisme/assets/js/data/site.js) | `SITE`, `PRE_HEADER`, `MAIN_NAV`, `FOOTER_TOP`, `FOOTER_LINKS`, `FOOTER_BOTTOM`, `OPENING_HOURS`, `SOCIALS`, `LABELS` | Identité de l'Office, menus, horaires, réseaux, labels |
| [`places.js`](src:frontend-office-tourisme/assets/js/data/places.js) | `RESTAURANTS`, `HEBERGEMENTS`, `LIEUX`, `ALL_PLACES`, `findPlace` | 14 restaurants, 10 hébergements, 8 lieux |
| [`events.js`](src:frontend-office-tourisme/assets/js/data/events.js) | `EVENT_CATEGORIES`, `EVENTS`, `findEvent` | 7 catégories, 14 événements |
| [`content.js`](src:frontend-office-tourisme/assets/js/data/content.js) | `HERO`, `NOUVEAUTE`, `INCONTOURNABLES`, `DECOUVRIR_THEMES`, `BONS_PLANS_FOOD`, `BONS_PLANS_DODO`, `ARTICLES`, `TICKET_GROUPS`, `BILLETTERIE`, `findArticle`, `findTicket`, `findTicketForEvent` | Accueil, thématiques, bons plans, 6 articles, 11 offres de billetterie |

Les fonctions `find*` sont de simples `Array.prototype.find` sur l'identifiant.

## Identité de l'Office

L'objet `SITE` regroupe les valeurs réutilisées dans tout le site :

| Clé | Valeur | Utilisation |
| --- | --- | --- |
| `name`, `fullName`, `tagline` | « Destination EtherBay », « Destination EtherBay - Office de Tourisme », « Office de Tourisme » | Titres, logo, textes légaux |
| `hashtag` | `#visitetherbay` | Section de partage de l'accueil |
| `lotteryAppUrl` | `http://localhost:3000` | Boutons « Accéder à la loterie » de la fiche et de l'article |
| `address`, `phone`, `phoneNote` | `1, quai du Phare, 29900 EtherBay`, numéro fictif | Pied de page |
| `email`, `dpoEmail` | `contact@tourisme-etherbay.fr`, `dpo@destination-etherbay.fr` | Contact, mention RGPD de la newsletter |

`OPENING_HOURS` contient une fermeture exceptionnelle cohérente avec le scénario : « Le samedi 19 décembre à partir de 16h (tirage public de la Grande Loterie citoyenne) ».

## Lieux

Les trois tableaux de [`places.js`](src:frontend-office-tourisme/assets/js/data/places.js) passent par la fonction `place`, qui ajoute `city: 'EtherBay'`, `zip: '29900'` et `visual` égal à l'identifiant, sauf si l'entrée les fournit.

| Champ | Type | Rôle |
| --- | --- | --- |
| `id` | chaîne | Identifiant unique sur les trois tableaux, utilisé dans `fiche.html?id=`, les favoris (`place:<id>`) et le nom de la photo |
| `name`, `type`, `district`, `address` | chaînes | Textes de la carte et de la fiche. `type` et `district` alimentent aussi les filtres |
| `universe` | `manger`, `dormir`, `sortir` ou `decouvrir` | Lien de retour du fil d'Ariane et suggestions « Vous aimerez aussi » |
| `access`, `days`, `hours`, `public`, `labels` | tableaux de chaînes | Valeurs des filtres de Manger et Dormir, ligne « Services » et « Labels » de la fiche |
| `price` | chaîne | Ligne « Tarifs » de la fiche |
| `bestSeller`, `tested`, `eco` | booléens facultatifs | Filtres rapides « Best-sellers », « Testé et approuvé », « Tourisme éco-responsable » |
| `partnerOffer` | chaîne facultative | Encadré « Offre EtherPoints » de la fiche |
| `description` | chaîne | Paragraphe de la fiche |

Les lieux de `LIEUX` avec `universe: 'sortir'` (Cinéma Le Phare, Opéra, Salle de la Criée) apparaissent en bas de la page Sortir. Tous les `LIEUX` apparaissent sur la page Découvrir.

### Partenaires EtherPoints

Trois lieux portent le libellé « Partenaire EtherPoints » dans `labels`. Deux ont une offre (`partnerOffer`) recopiée du seed du backend ([`backend/prisma/seed.ts`](src:backend/prisma/seed.ts)) :

| Lieu | Offre affichée | Offre du seed |
| --- | --- | --- |
| La Boulangerie du Port d'EtherBay | -15 % sur les viennoiseries et pains spéciaux contre 100 EtherPoints | « -15% sur les viennoiseries et pains spéciaux », 100 points |
| Cinéma Le Phare EtherBay | 1 place achetée = 1 place offerte contre 150 EtherPoints | « 1 Place de Cinéma achetée = 1 Place offerte », 150 points |
| Le Hash Café | aucune | aucun partenaire de ce nom |

La deuxième offre de la boulangerie dans le seed (galette des rois, 200 points) n'est pas reprise sur le site. Le guide [Ajouter un commerçant partenaire](../guides/ajouter-partenaire.md) décrit comment faire apparaître un nouveau partenaire à la fois dans le backend et sur le site.

## Événements

| Champ | Type | Rôle |
| --- | --- | --- |
| `id` | chaîne | `fiche.html?event=<id>`, favoris `event:<id>`, photo |
| `title`, `place`, `description` | chaînes | Textes de la carte et de la fiche, recherche de la page Sortir |
| `category` | une valeur de `EVENT_CATEGORIES` | Filtre par catégorie de Sortir et ordre des suggestions |
| `start`, `end` | dates ISO `AAAA-MM-JJ` | Filtres « Aujourd'hui », « Demain », « Ce week-end », bornes des dates de visite en billetterie, fichier `.ics` |
| `price` | chaîne | Prix affiché sur la carte quand aucune offre de billetterie n'existe |
| `lottery` | booléen facultatif | Remplace le bouton de la fiche par le lien vers l'application de loterie |
| `visual` | chaîne | Photo de l'événement |

Les dates sont comparées sans heure (`isOnDay` de [`modules/utils.js`](src:frontend-office-tourisme/assets/js/modules/utils.js)) : un événement du 3 au 21 novembre est « aujourd'hui » chaque jour de cet intervalle, bornes comprises.

> [!IMPORTANT]
> Les contenus sont datés : les événements courent de septembre 2026 à janvier 2027, les articles sont publiés en octobre et novembre 2026. Après le 3 janvier 2027, plus aucun événement n'est en cours : l'agenda de l'accueil retombe sur la liste complète, les filtres de date de la page Sortir ne trouvent plus rien et les billets d'événements passent à « Complet ». Pour une démonstration ultérieure, décaler les dates `start` et `end` dans `events.js`.

## Articles

Chaque entrée de `ARTICLES` contient `id`, `date`, `title`, `visual`, `excerpt` (aperçu des cartes) et `body` (tableau de paragraphes). Un article peut avoir un bouton d'action `cta` :

```javascript
cta: { label: 'Accéder à la loterie', external: 'lottery' }
```

Avec `external: 'lottery'`, le bouton pointe vers `SITE.lotteryAppUrl` et s'ouvre dans un nouvel onglet. Sinon, il pointe vers `cta.href`. Seul l'article `loterie-mode-emploi` utilise ce champ aujourd'hui.

## Contenus de l'accueil

| Export | Rôle |
| --- | --- |
| `HERO` | Titre et bouton du hero (« Que faire à EtherBay en novembre ? »), photo `hero-port` |
| `NOUVEAUTE` | Bandeau de la Grande Loterie citoyenne : deux paragraphes et lien vers la fiche `loterie-citoyenne` |
| `INCONTOURNABLES` | 6 tuiles du carrousel « Les incontournables » |
| `DECOUVRIR_THEMES` | 12 tuiles de thématiques de la page Découvrir |
| `BONS_PLANS_FOOD`, `BONS_PLANS_DODO` | Tuiles des bons plans. Le champ `filtre` devient `?filtre=<valeur>#resultats` |

Le texte du hero, des sections Groupes, Greeters et Espace partenaires, et des quatre raccourcis « Planifiez votre séjour » est écrit directement dans [`index.html`](src:frontend-office-tourisme/index.html).

## Offres de billetterie

`TICKET_GROUPS` définit trois groupes (`pass`, `visites`, `evenements`). Chaque offre de `BILLETTERIE` a :

| Champ | Rôle |
| --- | --- |
| `id`, `group`, `title`, `description`, `visual` | Carte de la billetterie |
| `amount` | Prix unitaire en euros (nombre) |
| `event` | Identifiant d'événement : la date de visite est bornée par les dates de l'événement, et la fiche de l'événement propose « Réserver » |
| `validUntil` | Pour les offres sans événement (pass, croisière) : dernière date de visite possible |

Le calcul des dates disponibles est détaillé dans [Billetterie et commande](billetterie.md#dates-de-visite).

## Procédures

### Ajouter un restaurant

1. Ajouter une entrée `place({ ... })` dans `RESTAURANTS`, avec un `id` en minuscules et tirets, unique sur les trois tableaux.
2. Déposer la photo `assets/img/photos/<id>.jpg`, 1400 pixels de large, JPEG progressif (voir [Charte graphique et médias](charte.md#photos)).
3. Recharger `manger.html` : les options de filtres et leurs compteurs se recalculent seuls.

```javascript
place({ id: 'cafe-du-mole', name: 'Le Café du Môle', type: 'Bars et cafés', universe: 'manger', district: 'Le Môle', address: '3, jetée du Môle', access: ['Parking'], days: ['Samedi', 'Dimanche'], hours: ['Midi'], public: ['Tout public'], labels: [], price: 'Café à 2 €', description: 'Exemple de nouvelle adresse.' }),
```

### Ajouter un événement payant

1. Ajouter l'événement dans `EVENTS` avec une `category` existante de `EVENT_CATEGORIES`.
2. Ajouter une offre dans `BILLETTERIE` avec `event: '<id de l'événement>'` et le groupe `evenements`.
3. Déposer la photo `<visual>.jpg`.

La fiche de l'événement affiche alors « Réserver · <prix> » au lieu de « Ajouter à mon agenda ».

### Ajouter un article

Ajouter une entrée en tête de `ARTICLES`. L'accueil et le carrousel « À lire aussi » affichent les articles dans l'ordre du tableau : ils ne sont pas triés par date.

### Vérifier

Les liens écrits dans les fichiers de données (`href` des tuiles, `filtre` des bons plans) ne sont pas contrôlés par la CI : seuls les liens présents dans le HTML le sont. Après une modification, ouvrir les pages concernées et suivre les liens ajoutés. Une photo manquante produit une image cassée sans erreur bloquante.
