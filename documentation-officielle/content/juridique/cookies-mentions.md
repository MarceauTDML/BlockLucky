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
| `bl.pref.theme`, `bl.pref.language`, `bl.pref.sound` | Thème, langue, sons du tirage activés ou coupés | Oui (préférence explicite) |
| `bl.referral.code` | Code de parrainage reçu par lien | Oui pour le parrainage |
| `bl.partner.selected`, `bl.marketplace.lastClaim` | État de l'espace partenaire et de la boutique | Oui |
| `bl.consent.choice` | Choix de mesure d'audience (`granted` ou `denied`), sa date et la version du dispositif | Oui (mémorise le choix) |
| `bl.tracking.optout` | Ancien marqueur d'opposition, encore lu comme un refus, effacé au premier choix enregistré | Oui |
| `bl.utm.source` | Source de la visite (paramètre `utm_source`) | **Non** : écrit seulement après accord |

### Consentement

Un bandeau s'affiche au premier passage, sur toutes les pages, tant qu'aucun choix valide n'est enregistré. Il est rendu par `ConsentBanner` de [`frontend-web/src/components/layout/ConsentBanner.tsx`](src:frontend-web/src/components/layout/ConsentBanner.tsx), monté dans [`frontend-web/src/app/providers.tsx`](src:frontend-web/src/app/providers.tsx), et s'appuie sur [`frontend-web/src/lib/consent.ts`](src:frontend-web/src/lib/consent.ts).

| Élément | Comportement |
|---|---|
| Boutons | « Tout refuser » et « Tout accepter », de même style et côte à côte : le refus demande un seul clic, comme l'acceptation ; lien vers la politique relative aux traceurs |
| Enregistrement | `bl.consent.choice` contient `{ audience, date, version }`, avec `CONSENT_VERSION` à 1 |
| Durée du choix | 182 jours (`CONSENT_VALIDITY_MS`), soit environ 6 mois ; un choix expiré ou d'une autre version est ignoré et le bandeau revient |
| Avant tout choix | Mesure désactivée : `trackEvent` de [`frontend-web/src/lib/analytics.ts`](src:frontend-web/src/lib/analytics.ts) n'envoie rien, `getUtmSource` renvoie `web_direct` et le paramètre `utm_source` n'est gardé qu'en mémoire, pour être enregistré si l'accord est donné dans la même visite |
| Au démarrage | `discardAudienceDataWithoutConsent` efface `bl.utm.source` si aucun accord valide n'existe |
| Refus | Efface `bl.utm.source` ; la navigation et la participation restent possibles |
| Retour sur le choix | Bouton « Gérer mes traceurs » dans le pied de page public et dans la ligne légale de l'espace connecté, et commandes `ConsentControls` sur `/traceurs` et `/confidentialite` |

Une fois acceptée, la mesure envoie l'identifiant du compte quand l'utilisateur est connecté. Le fonctionnement est détaillé dans [Analytique et consentement](../web/analytique-consentement.md).

> [!NOTE]
> Le choix n'est enregistré que sur l'appareil : le serveur ne conserve aucune preuve du consentement. La durée de 6 mois et l'égalité des deux boutons suivent les recommandations de la CNIL ; leur validation reste à faire par le DPO.

### Pages légales

Les textes sont rassemblés dans [`frontend-web/src/content/legal.ts`](src:frontend-web/src/content/legal.ts), en français et en anglais, avec la mention « Version du 12 novembre 2026 » (`LEGAL_VERSION`). Le même fichier est recopié à l'identique dans l'application mobile. Chaque page est rendue par `LegalDocumentPage` de [`frontend-web/src/components/layout/LegalPage.tsx`](src:frontend-web/src/components/layout/LegalPage.tsx).

| Chemin | Fichier | Titre affiché | Contenu |
|---|---|---|---|
| `/cgu` | [`frontend-web/src/app/cgu/page.tsx`](src:frontend-web/src/app/cgu/page.tsx) | « Conditions générales d'utilisation » | Éditeur et acceptation, compte réservé aux 18 ans et plus, vérification de l'âge, portefeuille intégré, un ticket par tirage et offres partenaires, usage du chat, assistance, données et fermeture du compte |
| `/reglement` | [`frontend-web/src/app/reglement/page.tsx`](src:frontend-web/src/app/reglement/page.tsx) | « Règlement de participation » | Organisateur, gratuité, obtention du ticket, clôture et résultat, cagnotte fictive, annulation et remboursement, réclamation, jeu responsable avec Joueurs Info Service ; voir [Règlement de participation](reglement-participation.md) |
| `/mentions-legales` | [`frontend-web/src/app/mentions-legales/page.tsx`](src:frontend-web/src/app/mentions-legales/page.tsx) | « Mentions légales » | Identification seulement : éditeur (Ville d'EtherBay, collectivité fictive, adresse et téléphone du scénario), direction de la publication, hébergeur (Microsoft Ireland Operations Limited, région Azure Danemark Est), contacts, licence MIT du code |
| `/confidentialite` | [`frontend-web/src/app/confidentialite/page.tsx`](src:frontend-web/src/app/confidentialite/page.tsx) | « Politique de confidentialité » | Responsable et DPO, données par finalité avec leur base, caractère obligatoire, destinataires (dont Google), données visibles sur la blockchain, durées, export et fermeture, droits, décisions automatisées ; bloc « Mon choix de mesure d'audience » |
| `/traceurs` | [`frontend-web/src/app/traceurs/page.tsx`](src:frontend-web/src/app/traceurs/page.tsx) | « Politique relative aux traceurs » | Stockage local, choix sur le web, application mobile, effacement ; bloc « Gérer mes traceurs » |
| `/transparence` | [`frontend-web/src/app/transparence/page.tsx`](src:frontend-web/src/app/transparence/page.tsx) | « Charte de transparence du tirage » | Règles du tour, sélection du ticket gagnant, preuves selon l'environnement, incidents ; lien vers le règlement |

La politique de confidentialité réécrite corrige les écarts relevés auparavant : les événements de mesure y sont présentés comme reliés au compte et soumis au consentement, et le cadeau de ticket, la vérification d'âge par pièce d'identité, la connexion Google et la permanence des transactions publiques y figurent. La charte (`TransparencyCharter` de [`frontend-web/src/components/lottery/TransparencyCharter.tsx`](src:frontend-web/src/components/lottery/TransparencyCharter.tsx)) signale l'environnement courant d'après `GET /lottery/status` : démonstration Hardhat (chain ID 31337, coordinateur VRF simulé, tirage non certifié par Chainlink), Sepolia ou mode simulé. Le texte servi par le backend (`getTransparencyCharter` de [`lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts)) ne parle plus de tirage « certifié » ni de remboursement de « 100 % des fonds » et précise que les frais réseau consommés ne sont pas remboursés.

Les six documents sont liés depuis le pied de page public ([`frontend-web/src/components/layout/PublicShell.tsx`](src:frontend-web/src/components/layout/PublicShell.tsx)) et depuis une ligne légale en bas de l'espace connecté ([`frontend-web/src/components/layout/AppShell.tsx`](src:frontend-web/src/components/layout/AppShell.tsx)), dans l'ordre de `LEGAL_DOC_ORDER`, suivis du bouton « Gérer mes traceurs ».

Sur `/connexion`, une case obligatoire « J'accepte les conditions générales d'utilisation et le règlement de participation », avec des liens vers `/cgu` et `/reglement`, s'ajoute à la case de majorité ; le formulaire envoie alors `acceptTerms: true` à `POST /auth/login`, qui accepte ce champ de façon facultative. Une phrase indique ensuite « En créant un compte, vous reconnaissez avoir lu la politique de confidentialité », avec un lien vers `/confidentialite`. Ces déclarations ne suffisent pas pour jouer : la vérification d'âge par pièce d'identité, envoyée depuis `/profil/identite` ou depuis l'application mobile, est exigée avant tout achat.

Ce qui reste à faire :

| Élément | Situation |
|---|---|
| Valeur juridique des textes | Rédigés pour le scénario pédagogique, avec un éditeur et des coordonnées fictifs ; relecture par un juriste à prévoir |
| Preuve de l'acceptation | `acceptTerms` est vérifié par le schéma mais n'est pas enregistré en base, ni la version des textes acceptée |
| Déclaration d'accessibilité | Absente (voir [Accessibilité numérique](accessibilite.md)) |

## Application mobile

L'application ne dépose pas de cookie et n'envoie pas d'événement de mesure d'audience. Elle conserve le jeton, le profil et la préférence de sons (`blocklucky_sound_enabled`) dans le stockage sécurisé du système (voir [Navigateur et mobile](../securite/navigateur-mobile.md#application-mobile)). Elle propose la rectification du prénom et du nom, l'export et la suppression des données dans Paramètres, puis Données personnelles ([`mobile-app/src/screens/settings/PersonalDataScreen.tsx`](src:mobile-app/src/screens/settings/PersonalDataScreen.tsx)).

Les six documents légaux sont consultables dans l'application, sans renvoi vers le web. Leur texte vient de [`mobile-app/src/content/legal.ts`](src:mobile-app/src/content/legal.ts), identique à celui du web, et s'affiche dans l'écran `Legal` ([`mobile-app/src/screens/settings/LegalScreen.tsx`](src:mobile-app/src/screens/settings/LegalScreen.tsx)), déclaré à la racine de la navigation pour être ouvert avant comme après la connexion. L'écran affiche la version du texte et la liste des autres documents. Aide & Support ([`mobile-app/src/screens/settings/HelpSupportScreen.tsx`](src:mobile-app/src/screens/settings/HelpSupportScreen.tsx)) comporte une section « Informations légales » qui ouvre chacun d'eux.

L'inscription par mot de passe ([`mobile-app/src/screens/auth/SignUpScreen.tsx`](src:mobile-app/src/screens/auth/SignUpScreen.tsx)) impose deux cases : « J'accepte les conditions générales d'utilisation et le règlement de participation » (`acceptTerms`) et « Je certifie avoir 18 ans ou plus » (`isAdultConfirmed`), toutes deux exigées à `true` par `POST /auth/signup`. Les liens « les CGU » et « le règlement », puis la phrase « En créant un compte, vous reconnaissez avoir lu la politique de confidentialité », ouvrent l'écran `Legal`. La connexion Google ne demande aucune acceptation. L'écran de vérification d'âge présente un encart sur la protection des données de la pièce, et l'application demande l'accès à l'appareil photo et aux photos avec un texte d'explication déclaré dans [`mobile-app/app.json`](src:mobile-app/app.json). Les magasins d'applications exigent une URL de politique de confidentialité et des déclarations sur les données collectées ; ces éléments sont à préparer avant publication (voir [Builds et publication](../mobile/builds-publication.md)).

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
| Bandeau de consentement | Refus et acceptation en un clic, mesure bloquée avant accord | Sans objet (pas de mesure) | Bandeau conforme dans sa forme, sans mesure derrière |
| Mentions légales LCEN | `/mentions-legales` (éditeur fictif du scénario) | Écran `Legal` | Partielles |
| Conditions d'utilisation et règlement | `/cgu` et `/reglement`, acceptation obligatoire à la connexion | Écran `Legal`, acceptation obligatoire à l'inscription par mot de passe | Présentes |
| Politique de confidentialité | `/confidentialite`, réécrite | Écran `Legal` | Section courte |
| Politique relative aux traceurs | `/traceurs` | Écran `Legal` | Absente |
