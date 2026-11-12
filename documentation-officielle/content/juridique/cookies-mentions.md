# Cookies, mentions et CGU

Cette page fait l'inventaire des traceurs, des bandeaux de consentement et des pages d'information légale des trois interfaces : le frontend web, l'application mobile et le site de l'Office de Tourisme. Pour chaque élément, elle indique ce qui existe dans le code et ce qui manque. Elle ne constitue pas un avis juridique ; les compléments à apporter sont repris dans [Points à valider](points-a-valider.md).

## Règles applicables en bref

| Règle | Source | Portée |
|---|---|---|
| Consentement préalable à tout dépôt ou lecture d'information sur le terminal, sauf exceptions (traceurs strictement nécessaires, certaines mesures d'audience exemptées) | Article 82 de la loi Informatique et Libertés, transposant la directive ePrivacy ; lignes directrices et recommandation de la CNIL sur les cookies | Cookies **et** `localStorage` : la règle vise toute technologie de stockage sur le terminal |
| Refus aussi simple que l'acceptation | Recommandation de la CNIL | Bandeaux |
| Mentions légales identifiant l'éditeur, le directeur de la publication et l'hébergeur | Loi pour la confiance dans l'économie numérique (LCEN) | Tous les sites |
| Information des personnes sur le traitement de leurs données | Articles 13 et 14 du RGPD | Politique de confidentialité |

Les articles et le périmètre exact de l'exemption de consentement pour la mesure d'audience sont à confirmer par un juriste.

## Frontend web

### Traceurs

Le web ne dépose **aucun cookie**. Il utilise le `localStorage` sous les clés déclarées dans [`frontend-web/src/lib/storage.ts`](src:frontend-web/src/lib/storage.ts) :

| Clé | Contenu | Nécessaire au service ? |
|---|---|---|
| `bl.auth.token`, `bl.auth.user` | Jeton de session et profil | Oui |
| `bl.onboarding.done` | Écrans d'accueil déjà vus | Oui (confort demandé par l'utilisateur) |
| `bl.pref.theme`, `bl.pref.language` | Thème et langue | Oui (préférence explicite) |
| `bl.referral.code` | Code de parrainage reçu par lien | Oui pour le parrainage |
| `bl.partner.selected`, `bl.marketplace.lastClaim` | État de l'espace partenaire et de la boutique | Oui |
| `bl.tracking.optout` | Opposition à la mesure d'audience | Oui |
| `bl.utm.source` | Source de la visite (paramètre `utm_source`) | **Non** : sert à la mesure d'audience |

### Consentement

Il n'y a pas de bandeau sur le web. La mesure d'audience fonctionne par défaut, sur la base de l'intérêt légitime, avec un droit d'opposition : la page Confidentialité propose un bouton « M'opposer à la mesure d'audience » qui écrit `bl.tracking.optout`. `trackEvent` de [`frontend-web/src/lib/analytics.ts`](src:frontend-web/src/lib/analytics.ts) ne fait plus aucun appel tant que ce marqueur est présent. Le fonctionnement est détaillé dans [Analytique et consentement](../web/analytique-consentement.md).

> [!WARNING]
> La mesure envoie l'identifiant du compte quand l'utilisateur est connecté, et l'enregistrement de `bl.utm.source` a lieu sans consentement. Une mesure d'audience peut être exemptée de consentement sous des conditions strictes, notamment de finalité limitée et de données non recoupées avec d'autres traitements. L'éligibilité de ce dispositif à l'exemption est à vérifier ; à défaut, un bandeau de consentement serait nécessaire avant toute mesure.

### Pages légales

| Chemin | Fichier | Titre affiché | Contenu |
|---|---|---|---|
| `/mentions-legales` | [`frontend-web/src/app/mentions-legales/page.tsx`](src:frontend-web/src/app/mentions-legales/page.tsx) | « Conditions de participation » | Organisateur, éligibilité (majeurs uniquement), nature des unités (ethers fictifs sans valeur), jeu responsable avec le numéro de Joueurs Info Service, avantages partenaires |
| `/confidentialite` | [`frontend-web/src/app/confidentialite/page.tsx`](src:frontend-web/src/app/confidentialite/page.tsx) | « Politique de confidentialité » | Responsable de traitement, données collectées, blockchain et minimisation, droits, mesure d'audience avec bouton d'opposition, durée de conservation |

Les deux pages portent la mention « Version de travail du pilote, novembre 2026 » et sont bilingues (français, anglais). Elles sont liées depuis le pied de page public ([`frontend-web/src/components/layout/PublicShell.tsx`](src:frontend-web/src/components/layout/PublicShell.tsx)) et depuis l'écran de connexion, qui indique : « En continuant, vous acceptez les conditions de participation et la politique de confidentialité ». La majorité est confirmée par une case à cocher distincte. Cette déclaration ne suffit plus pour jouer : la vérification d'âge par pièce d'identité, envoyée depuis `/profil/identite` ou depuis l'application mobile, est exigée avant tout achat.

Ce qui manque :

| Élément | Situation |
|---|---|
| Mentions légales au sens de la LCEN | La page `/mentions-legales` contient en réalité les conditions de participation. Aucune page n'identifie l'éditeur (adresse, contact), le directeur de la publication ni l'hébergeur. |
| Règlement de jeu complet | Durée, dotation, modalités du tirage et du remboursement, résolution des litiges : à rédiger |
| Conditions générales d'utilisation distinctes | Absentes ; les conditions de participation en tiennent lieu |
| Exactitude de la politique de confidentialité | Elle parle d'« événements de parcours anonymisés » alors qu'ils sont rattachés au compte ; elle ne mentionne ni le cadeau de ticket, ni les données Redis, ni l'immutabilité des transactions, ni la vérification d'âge par pièce d'identité, ni la connexion par Google ou Apple |
| Déclaration d'accessibilité | Absente (voir [Accessibilité numérique](accessibilite.md)) |

## Application mobile

L'application ne dépose pas de cookie et n'envoie pas d'événement de mesure d'audience. Elle conserve le jeton et le profil dans le stockage sécurisé du système (voir [Navigateur et mobile](../securite/navigateur-mobile.md#application-mobile)). Elle propose l'export et la suppression des données dans [`mobile-app/src/screens/settings/GDPRScreen.tsx`](src:mobile-app/src/screens/settings/GDPRScreen.tsx).

Elle ne contient en revanche **aucun écran** de conditions de participation ni de politique de confidentialité, ni de lien vers les pages du web. L'inscription par mot de passe impose pourtant de cocher « J'accepte les conditions d'utilisation et la politique de confidentialité » (`acceptTerms`, vérifié par le backend), sans que ces textes soient consultables depuis l'écran. Les connexions Google et Apple ne demandent aucune acceptation. L'écran de vérification d'âge présente un encart sur la protection des données de la pièce, et l'application demande l'accès à l'appareil photo et aux photos avec un texte d'explication déclaré dans [`mobile-app/app.json`](src:mobile-app/app.json). Les magasins d'applications exigent une URL de politique de confidentialité et des déclarations sur les données collectées ; ces éléments sont à préparer avant publication (voir [Builds et publication](../mobile/builds-publication.md)).

## Site de l'Office de Tourisme

### Bandeau cookies

Le bandeau est construit par [`frontend-office-tourisme/assets/js/modules/cookies.js`](src:frontend-office-tourisme/assets/js/modules/cookies.js), appelé à chaque page par `initCookies` de [`frontend-office-tourisme/assets/js/main.js`](src:frontend-office-tourisme/assets/js/main.js).

| Élément | Comportement |
|---|---|
| Affichage | Boîte de dialogue au premier passage, tant qu'aucun choix n'est enregistré |
| Boutons | « Personnaliser », « Tout rejeter » et « Accepter tout », côte à côte dès le premier écran : le refus demande un seul clic, comme l'acceptation. Les trois boutons ont des styles différents (`btn--dark`, `btn--outline`, `btn--wide`) ; la mise en avant de l'acceptation est à vérifier au regard des recommandations de la CNIL |
| Personnalisation | Case « Mesure d'audience anonyme », non cochée par défaut ; « Cookies essentiels (favoris, panier) » cochée et désactivée |
| Enregistrement | Clé `etherbay.cookie-consent` du `localStorage`, avec le choix et sa date |
| Retour sur le choix | Bouton flottant « Gérer mes cookies », présent sur toutes les pages |

Le choix est enregistré mais **aucune mesure d'audience n'est implémentée** : accepter ou refuser ne change rien au fonctionnement du site. Le texte du bandeau parle de « cookies » alors que le site n'utilise que le `localStorage`. Le bandeau est donc prêt pour une future mesure d'audience, mais n'en conditionne aucune aujourd'hui.

### Données stockées

| Donnée | Stockage |
|---|---|
| Favoris, panier | `localStorage` |
| Commandes de démonstration, coordonnées saisies à la commande | `localStorage` |
| Inscription à la newsletter | `localStorage` |
| Choix du bandeau | `localStorage` |

Aucune de ces données n'est transmise à un serveur. Aucun service tiers n'est appelé : les polices et la bibliothèque de QR code sont hébergées sur le site, et la CSP (`connect-src 'self'`) interdit les appels vers d'autres domaines.

### Mentions légales

La page [`frontend-office-tourisme/mentions-legales.html`](src:frontend-office-tourisme/mentions-legales.html) regroupe :

| Section | Contenu |
|---|---|
| Éditeur du site | Office de Tourisme de la Ville d'EtherBay (ville fictive), adresse, cadre du projet pédagogique |
| Crédits | Photographies Pixabay sous la licence de contenu Pixabay ; lieux et commerces fictifs |
| Conditions générales d'utilisation | Informations indicatives, données conservées dans le navigateur |
| Conditions générales de vente | Billetterie de démonstration : aucun paiement, aucune coordonnée bancaire, billets fictifs |
| Accessibilité | Objectif de conformité RGAA, contact |
| Tourisme éco-responsable | Engagements de sobriété |
| Données personnelles | Newsletter stockée localement, contact du DPO `dpo@destination-etherbay.fr` |

Manquent : le directeur de la publication, l'hébergeur et ses coordonnées. Le contact DPO de ce site (`dpo@destination-etherbay.fr`) diffère de celui du projet (`dpo@etherbay.fr`) ; l'un des deux est à harmoniser.

## Synthèse

| Exigence | Web | Mobile | Office de Tourisme |
|---|---|---|---|
| Absence de cookie tiers | Oui | Oui | Oui |
| Bandeau ou opposition | Opposition sur la page Confidentialité | Sans objet (pas de mesure) | Bandeau conforme dans sa forme, sans mesure derrière |
| Mentions légales LCEN | Absentes | Absentes | Partielles |
| Conditions d'utilisation | Conditions de participation (version de travail) | Absentes | Présentes |
| Politique de confidentialité | Présente, à corriger | Absente | Section courte |
