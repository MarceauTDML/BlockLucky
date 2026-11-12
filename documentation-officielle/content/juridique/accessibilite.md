# Accessibilité numérique

La Ville d'EtherBay est un organisme public : ses services en ligne sont soumis à une obligation d'accessibilité. Cette page rappelle le cadre, puis donne l'état réel des trois interfaces de BlockLucky tel qu'il ressort du code. Aucun audit d'accessibilité n'a été réalisé : il n'existe donc ni taux de conformité ni déclaration d'accessibilité. Les mesures techniques sont détaillées dans [Accessibilité et responsive](../web/accessibilite.md) pour le web et [Accessibilité et vie privée](../office-tourisme/accessibilite.md) pour le site de l'Office de Tourisme.

## Cadre

| Texte | Contenu | Effet pour la Ville |
|---|---|---|
| Article 47 de la loi n° 2005-102 du 11 février 2005 | Obligation d'accessibilité des services de communication au public en ligne des organismes publics | S'applique aux sites et applications de la commune |
| Référentiel général d'amélioration de l'accessibilité (RGAA), version 4.1 | 106 critères, alignés sur le niveau AA des WCAG 2.1 | Méthode d'évaluation de référence |
| Directive (UE) 2016/2102 | Accessibilité des sites et applications mobiles des organismes du secteur public | Origine européenne de l'obligation, applications mobiles incluses |
| Directive (UE) 2019/882 (European Accessibility Act) | Accessibilité de certains produits et services du secteur privé, applicable depuis juin 2025 | À examiner pour les commerçants partenaires, pas pour la Ville |

Obligations qui en découlent pour un organisme public, à confirmer par un juriste :

1. publier une **déclaration d'accessibilité** pour chaque site et application, indiquant le niveau de conformité (totalement, partiellement ou non conforme), les contenus non accessibles et un moyen de contact ;
2. publier un **schéma pluriannuel** de mise en accessibilité et ses plans d'action annuels ;
3. afficher la mention de conformité sur la page d'accueil ;
4. offrir un **moyen de signaler** un défaut d'accessibilité et d'obtenir le contenu sous une autre forme.

Le non-respect de ces obligations expose à des sanctions administratives ; leur montant et les modalités de contrôle sont à vérifier sur Légifrance.

## État par interface

### Frontend web

| Domaine | Mesures présentes dans le code |
|---|---|
| Navigation | Lien d'évitement « Aller au contenu » dans [`frontend-web/src/components/layout/AppShell.tsx`](src:frontend-web/src/components/layout/AppShell.tsx) et [`frontend-web/src/components/layout/PublicShell.tsx`](src:frontend-web/src/components/layout/PublicShell.tsx) |
| Langue | Attribut `lang="fr"` sur `<html>`, mis à jour selon la langue choisie par le script d'initialisation du thème |
| Sémantique | Une centaine d'attributs `aria-*` dans les composants, régions d'annonce (`aria-live`, `role="status"`, `role="alert"`) pour les messages et les résultats en direct |
| Mouvement | Règle `prefers-reduced-motion` dans [`frontend-web/src/app/globals.css`](src:frontend-web/src/app/globals.css) |
| Focus | Styles `focus-visible` |
| Thème | Clair et sombre, choix de l'utilisateur ou préférence du système |
| Bandeau de consentement | Région `role="region"` reliée à son titre par `aria-labelledby`, non modale, boutons de refus et d'acceptation de même style, bouton de fermeture étiqueté quand il est rouvert ([`ConsentBanner.tsx`](src:frontend-web/src/components/layout/ConsentBanner.tsx)) |
| Sons du tirage | Bouton `SoundToggle` étiqueté « Couper les sons » ou « Activer les sons » ; aucun son n'est joué avant une première interaction de l'utilisateur avec la page |

Il n'y a ni test automatisé d'accessibilité (axe, pa11y, Lighthouse) dans la CI, ni évaluation des contrastes documentée, ni test avec un lecteur d'écran consigné.

### Application mobile

La refonte de l'application a ajouté des propriétés d'accessibilité React Native (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`) aux composants de base de [`mobile-app/src/components/ui`](src:mobile-app/src/components/ui) (`AppButton`, `AppInput`, `ListRow`, `Card`, `ResultDialog`, barre d'onglets) et à la plupart des écrans. Les onglets sont annoncés comme tels avec leur état sélectionné, et quelques zones dynamiques (messages d'erreur, bandeau de notification, tirage en direct) utilisent `accessibilityLiveRegion`. Ces mesures n'ont été ni auditées ni testées avec VoiceOver ou TalkBack.

Il reste des écarts visibles dans le code : la roue du tirage tourne sans tenir compte du réglage « réduire les animations » du système (`AccessibilityInfo.isReduceMotionEnabled` n'est jamais lu), et la vérification d'âge suppose de photographier ou de choisir une image, sans autre voie pour un citoyen qui ne peut pas le faire seul.

### Site de l'Office de Tourisme

| Domaine | Mesures présentes dans le code |
|---|---|
| Navigation | Lien d'évitement sur les 14 pages HTML |
| Mouvement | `prefers-reduced-motion` dans [`frontend-office-tourisme/assets/css/base.css`](src:frontend-office-tourisme/assets/css/base.css) |
| Bandeau cookies | Boîte de dialogue `role="dialog"`, `aria-modal`, titre associé, focus placé sur un bouton à l'ouverture |
| Déclaration | La page de mentions légales indique viser la conformité RGAA et donne un contact (contact@tourisme-etherbay.fr) |

La mention « vise la conformité RGAA » n'est pas une déclaration d'accessibilité : elle ne donne ni niveau de conformité, ni liste des contenus non accessibles, ni date d'évaluation.

## Synthèse

| Exigence | Web | Mobile | Office de Tourisme |
|---|---|---|---|
| Mesures techniques de base | Présentes | Partielles, non vérifiées | Présentes |
| Audit RGAA | Non réalisé | Non réalisé | Non réalisé |
| Déclaration d'accessibilité | Absente | Absente | Mention d'intention seulement |
| Moyen de signalement | Absent | Absent | Adresse de contact |
| Schéma pluriannuel | Absent (relève de la Ville) | | |
| Tests automatisés | Absents | Absents | Absents |

## Recommandations

| Priorité | Action |
|---|---|
| 1 | Réaliser un audit RGAA sur un échantillon de pages de chaque interface (accueil, connexion, achat, tirage, profil, données personnelles) |
| 2 | Vérifier l'application mobile avec VoiceOver et TalkBack, compléter les intitulés manquants, et respecter `AccessibilityInfo.isReduceMotionEnabled` pour la roue du tirage |
| 3 | Intégrer un contrôle automatisé (par exemple axe avec Playwright) dans le job `web` de la CI ; il ne détecte qu'une partie des défauts mais évite les régressions |
| 4 | Publier une déclaration d'accessibilité par interface, avec un contact, une fois l'audit fait |
| 5 | Prévoir une alternative au tirage en direct animé (texte du résultat, annonce par région `aria-live`) |

Ces actions figurent aussi dans [Points à valider](points-a-valider.md) pour la partie juridique.
