# Volet marketing

Le kickoff demande une stratégie marketing et de communication qui couvre le marché (besoins et comportements), la promotion et les indicateurs. L'équipe y a répondu par deux livrables hors dépôt : « Stratégie marketing et communication » (dossier 04) et « Budget, acquisition et indicateurs » (dossier 05), tous deux datés du 6 novembre 2026. Cette page les résume et montre quels outils de promotion existent réellement dans le code.

> [!NOTE]
> Les montants, volumes et taux ci-dessous sont des hypothèses de travail de l'équipe (repérées H01 à H09 dans ses livrables), calculées à partir de prix publics relevés le 6 novembre 2026. Ce ne sont ni des engagements ni des mesures.

## Positionnement

La proposition de valeur de l'équipe tient en une idée : permettre aux habitants de participer à un événement local dont ils peuvent comprendre les règles et vérifier le déroulement. Pour la Mairie, le produit réunit un parcours de participation, un suivi de campagne et des éléments de preuve pour expliquer le résultat.

Les messages mettent en avant l'événement, son fonctionnement et l'apprentissage, jamais le gain. Le caractère fictif des ethers est rappelé à chaque étape : le livrable considère des demandes récurrentes sur le gain comme le signe d'un message mal compris, à corriger avant d'élargir la diffusion.

## Publics et messages

| Public | Message proposé | Canal à négocier |
|---|---|---|
| 18 à 35 ans (cible principale du kickoff) | Découvrez les règles et essayez avec des ethers fictifs | Réseaux locaux, structures fréquentées par les jeunes adultes |
| Autres adultes | Participez avec une explication et une aide disponibles | Site et points d'accueil municipaux, associations |
| Relais de proximité | Aidez vos publics à comprendre le projet et à trouver le parcours | Kit partagé, présentation courte |
| Décideurs municipaux | Suivez la participation et les preuves du dispositif | Compte rendu de pilotage, démonstration |

L'ouverture aux autres adultes répond à l'exigence d'inclusion de la Maire. Le choix d'un parcours mobile s'appuie sur le Baromètre du numérique 2025 (Arcep, Arcom, CGE, ANCT, Crédoc), cité par le livrable : 91 % des personnes interrogées ont un smartphone et 36 % déclarent des freins à l'usage du numérique, d'où une aide de proximité en complément.

## Plan de diffusion sur quatre semaines

La campagne est planifiée sur quatre semaines avant le jour du tirage (hypothèse H01). Les dates restent relatives : le kickoff ne fixe pas de calendrier.

| Période | Action | Condition de passage |
|---|---|---|
| J-28 à J-22 | Tester les règles, le parcours et l'aide avec un groupe pilote | Compréhension suffisante, incidents critiques traités |
| J-21 à J-15 | Publier la page municipale, fournir le kit aux relais | Accord de diffusion, liens testés |
| J-14 à J-8 | Élargir la diffusion, expliquer les preuves du tirage | Tableau de bord et support opérationnels |
| J-7 à J-1 | Rappeler la date, proposer une démonstration accompagnée | Disponibilité confirmée, messages à jour |
| Jour J | Clôturer selon les règles, expliquer le résultat | Contrôle de l'état de la loterie |
| J+1 à J+7 | Publier le bilan, recueillir les retours | Vérification des chiffres et de la confidentialité |

Le site municipal porte l'information de référence, les associations facilitent la découverte, les emails n'utilisent qu'une base autorisée et les réseaux sociaux orientent vers les règles. Une enveloppe publicitaire reste conditionnée au résultat du pilote.

## Budget

Le livrable budget propose une enveloppe de campagne de 3 295 à 7 723 euros hors taxes, provision de 10 à 15 % comprise.

| Poste | Fourchette |
|---|---|
| Diffusion sponsorisée, test de 150 à 300 euros inclus | 1 500 à 3 000 euros |
| 5 000 flyers A5 | 215 à 415 euros HT |
| Affiches et reprographie | 80 à 200 euros |
| Emailing sur un mois | 20 à 100 euros |
| Infrastructure sur un mois | 30 à 100 euros HT |
| Logistique des démonstrations | 150 à 400 euros |
| Appui juridique et technique ciblé | 1 000 à 2 500 euros |
| Sous-total | 2 995 à 6 715 euros |
| Total avec provision, arrondi | 3 295 à 7 723 euros |

En ajoutant la valorisation du travail de l'équipe (16 à 24 jours collectifs) et de la médiation de la ville (30 à 60 heures), le coût complet atteint 8 695 à 24 223 euros. À 10 000 participants, la campagne coûte 0,33 à 0,77 euro par personne. Les tickets en ethers fictifs ne financent rien : la recette réelle est nulle.

La ligne « infrastructure » correspond à un serveur virtuel d'un mois. Elle est cohérente avec la stack du dépôt, qui tient dans Docker Compose sur une seule machine ([Stack complète en conteneurs](../demarrage/stack-conteneurs.md)), mais la capacité reste à tester avec les [tests de charge](../infrastructure/tests-charge.md).

## Acquisition

Le livrable relie le nombre de participants aux visiteurs uniques éligibles par un taux de conversion supposé. Pour atteindre 10 000 participants à 25 % de conversion, il faut 40 000 visiteurs uniques. Une répartition de travail possible serait :

| Canal | Visites cibles |
|---|---|
| Site et supports municipaux | 14 000 |
| Associations | 10 000 |
| Partenaires | 10 000 |
| Campagnes autorisées | 4 000 |
| Accès directs | 2 000 |

Ces contributions doivent représenter des personnes distinctes après correction des recoupements. Les scénarios prudent, central et ambitieux sont détaillés dans [Objectifs et indicateurs](objectifs-indicateurs.md#engagement).

## Les outils de promotion dans le code

Le produit intègre plusieurs mécanismes qui servent directement la campagne.

| Mécanisme | Effet recherché | Implémentation |
|---|---|---|
| Suivi des sources d'acquisition | Attribuer chaque inscription à un canal | Paramètre `utm_source` capturé à l'arrivée par [`frontend-web/src/lib/analytics.ts`](src:frontend-web/src/lib/analytics.ts), transmis à la connexion, agrégé dans `GET /api/v1/analytics/dashboard` |
| Parrainage | Faire recruter les habitants par leurs proches | Code de parrainage unique, page `/invite/[code]`, 100 EtherPoints au parrain et 50 au filleul |
| Ticket cadeau | Faire découvrir le jeu sans démarche | `POST /api/v1/lottery/gift` : le destinataire reçoit un ticket et un compte est créé pour lui |
| Partage | Diffuser le lien | Liens de partage WhatsApp, X et SMS renvoyés par `GET /api/v1/user/referrals` |
| Classement des ambassadeurs | Valoriser les plus actifs | `GET /api/v1/lottery/leaderboard`, adresses anonymisées |
| Quêtes sociales | Inciter à suivre la Mairie et à partager | Quatre quêtes de 20 à 40 EtherPoints, validées sur déclaration |
| Commerces partenaires | Associer le commerce local | Offres contre EtherPoints, codes promo validés en caisse |
| Badge POAP | Laisser un souvenir de l'événement | Un badge ERC-721 non transférable par participant et par tour |
| Tirage en direct | Créer un rendez-vous collectif | Salle d'attente, chat et annonce du gagnant en temps réel |
| Site de l'Office de Tourisme | Inscrire l'événement dans l'offre de la ville | Site statique `frontend-office-tourisme/` |

> [!WARNING]
> Le livrable marketing précise qu'aucun accord commercial avec des partenaires n'est confirmé. Les deux commerces du seed (boulangerie et cinéma) sont fictifs. Les avantages commerciaux nécessitent une analyse juridique distincte avant intégration ([Points à valider](../juridique/points-a-valider.md)).

## Pilotage de la campagne

Le livrable privilégie trois signaux : les participations confirmées, la compréhension et les incidents résolus. Les vues et impressions ne servent qu'à suivre la diffusion.

| Signal observé | Lecture à vérifier | Action proposée |
|---|---|---|
| Beaucoup de visites, peu de confirmations | Blocage ou promesse mal comprise | Observer le parcours avant d'augmenter la diffusion |
| Peu de visites | Relais insuffisants ou message peu visible | Vérifier les publications, adapter les points de contact |
| Questions récurrentes sur le gain | Caractère fictif mal compris | Corriger le message avant de recruter davantage |
| Incidents de validation | Problème de réseau ou d'intégration | Suspendre la promotion, faire diagnostiquer |

Le premier signal se lit dans la table `Analytics` en comparant `landing_view` et `ticket_confirmed`. Le dernier se lit dans les journaux et les métriques du backend ([Observabilité](../backend/observabilite.md)) ; en cas d'incident on-chain, le [disjoncteur](../architecture/flux/disjoncteur.md) permet de suspendre les achats.

## Éthique de la communication

| Principe | Application |
|---|---|
| Pas d'incitation au jeu d'argent | Ethers fictifs, aucune valeur monétaire, aucune conversion |
| Public majeur | Pièce d'identité, envoyée depuis le web ou le mobile, validée par la Mairie avant tout achat, cadeau ou échange ; déclaration de majorité à la connexion web |
| Jeu responsable | Un seul ticket par participant et par grand tirage, imposé par le contrat et seul choix proposé par la billetterie |
| Données proportionnées | Mesure d'audience first-party sans cookie, refus possible sur `/confidentialite` ; emails uniquement vers une base autorisée |
| Transparence | Règles et preuves publiées, résultat vérifiable |

Le cadre juridique est développé dans [Veille juridique](../juridique/veille-juridique.md) et [Cookies, mentions et CGU](../juridique/cookies-mentions.md).
