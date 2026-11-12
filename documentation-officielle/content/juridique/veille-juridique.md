# Veille juridique

Cette page recense les textes susceptibles de s'appliquer à BlockLucky et leur effet sur le projet. Elle répond à la partie « Aspects éthiques et réglementaires » du kickoff.

| Élément | Valeur |
|---|---|
| Date de la veille | 11 novembre 2026 |
| Portée | Loterie BlockLucky de la Ville d'EtherBay, en démonstration sur un réseau de test avec des ethers fictifs |
| Statut | Analyse de l'équipe projet, **à faire valider par un juriste** avant toute exploitation publique |

> [!CAUTION]
> Cette page n'est pas un avis juridique. Les numéros d'articles cités sont ceux que l'équipe a relevés dans les sources indiquées en fin de page ; plusieurs sources secondaires divergent sur la numérotation et doivent être vérifiées sur Légifrance et EUR-Lex. Les questions ouvertes sont regroupées dans [Points à valider](points-a-valider.md).

## Synthèse

| Question | Réponse pour la démonstration | Ce qui changerait avec de vrais euros ou de vrais ethers |
|---|---|---|
| Est-ce une loterie prohibée ? | A priori non : sans sacrifice financier réel ni gain ayant une valeur, l'opération ne réunit pas les éléments de la définition légale de la loterie | Oui en principe : loterie prohibée sauf exceptions étroites, monopole de la Française des Jeux pour les loteries publiques |
| Faut-il une autorisation de l'Autorité nationale des jeux (ANJ) ? | Non | Oui, ou exploitation impossible hors des exceptions légales |
| Le portefeuille intégré est-il une activité réglementée ? | Non tant que les actifs n'ont pas de valeur marchande | Oui : la conservation de crypto-actifs pour le compte de tiers relève du règlement MiCA |
| Le RGPD s'applique-t-il ? | Oui : email, adresse de portefeuille, historique de participation, photos de pièce d'identité jusqu'à la décision de la Mairie | Idem, avec en plus des obligations de lutte contre le blanchiment |
| Les mineurs peuvent-ils jouer ? | Non : l'achat exige une pièce d'identité validée par la Mairie (`AGE_VERIFICATION_REQUIRED`) | Contrôle d'âge effectif obligatoire, probablement plus robuste qu'un examen sur photo |
| Le ticket à gratter est-il un jeu de hasard ? | Il attribue au hasard une offre de commerçant contre des EtherPoints : à faire qualifier | Loterie à mise si les points avaient une valeur |
| Des cookies sont-ils déposés ? | Aucun cookie ; le web et le site de l'Office de Tourisme utilisent le `localStorage`. Le web demande le consentement par un bandeau avant toute mesure d'audience | Preuve du consentement conservée côté serveur |
| L'accessibilité est-elle obligatoire ? | Oui pour un service public en ligne d'une commune | Idem |

## Jeux d'argent et loteries

### Textes

- Code de la sécurité intérieure (CSI), livre III, titre II, issu de l'ordonnance n° 2019-1015 du 2 octobre 2019 :
  - **article L320-1** : interdiction de principe des jeux d'argent et de hasard ;
  - **article L322-1** : les loteries de toute espèce sont prohibées ;
  - **article L322-2** : définition de la loterie, opération offerte au public qui fait naître l'espérance d'un gain dû, même partiellement, au hasard, et pour laquelle un sacrifice financier est exigé des participants.
- Exceptions prévues aux articles suivants du même chapitre :
  - loteries d'objets mobiliers destinées à des actes de bienfaisance, à l'encouragement des arts ou au financement d'activités sportives à but non lucratif, sur autorisation administrative ;
  - lotos traditionnels en cercle restreint, avec des mises et des lots de faible valeur.
- L'**Autorité nationale des jeux (ANJ)**, créée par la même ordonnance, régule les jeux d'argent et contrôle les droits exclusifs de la Française des Jeux sur les loteries.

La numérotation exacte des articles d'exception et l'autorité qui délivre l'autorisation sont à confirmer sur Légifrance : les sources secondaires consultées divergent.

### Application au projet

La définition légale repose sur quatre éléments cumulatifs.

| Élément | Situation de BlockLucky | Preuve dans le dépôt |
|---|---|---|
| Offre au public | Oui : tous les habitants d'EtherBay | |
| Espérance d'un gain | La cagnotte est en ethers de réseau de test, sans valeur marchande. Les EtherPoints s'obtiennent par la participation. Les offres des partenaires s'obtiennent soit par un échange direct, soit par un ticket à gratter qui tire l'offre au hasard. | Conditions de participation, voir [Cookies, mentions et CGU](cookies-mentions.md) |
| Hasard | Oui : tirage Chainlink VRF | [`smart-contract/contracts/BlockLucky.sol`](src:smart-contract/contracts/BlockLucky.sol) |
| Sacrifice financier | Non : les ethers utilisés sont une dotation gratuite de la Mairie ; le citoyen ne paie rien | `grantWelcomeEthers` de [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) |

Sans sacrifice financier ni gain de valeur, l'opération relèverait d'un dispositif pédagogique et non d'un jeu d'argent. Cette qualification doit être confirmée, notamment parce que la dotation est financée par la commune (voir [Points à valider](points-a-valider.md)).

### Conditions à maintenir

1. Ne jamais vendre d'ethers fictifs, ni échanger la cagnotte contre des euros, des biens ou des services.
2. Ne pas déployer le contrat sur le réseau Ethereum principal et ne pas l'alimenter en ethers réels. Le script [`smart-contract/scripts/deploy-sepolia.ts`](src:smart-contract/scripts/deploy-sepolia.ts) refuse tout réseau dont l'identifiant n'est pas celui de Sepolia.
3. Garder les avantages des commerces partenaires indépendants du tirage de la cagnotte.

> [!WARNING]
> Le ticket à gratter ne respecte plus la condition qui figurait dans la version précédente de cette veille. `POST /api/marketplace/scratch` débite 50 EtherPoints (offre « violet », `SCRATCH_COST_VIOLET`) ou 100 (offre « lucky », `SCRATCH_COST_LUCKY`), puis choisit l'offre par `crypto.randomInt` parmi les offres en stock ([`backend/src/api/marketplace/marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts)) : c'est un tirage au sort payé en points. Tant que les EtherPoints sont gratuits, non achetables et sans valeur monétaire, le sacrifice financier fait défaut ; mais les offres gagnées ont une valeur réelle chez les commerçants, et les points se gagnent aussi en achetant des tickets. La qualification est à faire valider (point JUR-4 de [Points à valider](points-a-valider.md)). L'achat est réservé aux comptes dont l'âge est vérifié.
4. L'afficher clairement dans l'interface (charte de transparence, bandeau de démonstration), dans les conditions générales d'utilisation et dans le règlement de participation.

### Si la Mairie voulait une vraie loterie

- **Loterie de fin d'année avec mise en euros.** Elle ne serait possible que par une association, avec des lots en nature et une autorisation administrative. Elle ne pourrait pas être gérée par la commune pour son propre compte.
- **Jeux à objets numériques monétisables (JONUM).** Ils sont expérimentés pendant trois ans depuis la loi n° 2024-449 du 21 mai 2024, dite SREN (articles 40 et 41), et un décret publié au Journal officiel du 6 février 2026. Le régime exige une déclaration préalable à l'ANJ, un compte joueur, l'exclusion des mineurs et des lots en objets numériques, non une cagnotte en crypto-monnaie. Une cagnotte en ether n'entre pas dans ce régime.

## Crypto-actifs

Le sujet est développé dans [Crypto-actifs et MiCA](crypto-actifs.md). En résumé :

- le **règlement (UE) 2023/1114 dit MiCA** soumet la conservation et l'administration de crypto-actifs pour le compte de clients à un agrément de prestataire (CASP), délivré en France par l'AMF ;
- le portefeuille de BlockLucky est custodial : la Ville conserve les clés chiffrées des citoyens ;
- avec des actifs de réseau de test sans valeur, ce n'est pas un crypto-actif au sens économique ; sur un réseau principal, il faudrait un agrément, un modèle non custodial ou un prestataire agréé ;
- un service manipulant de vrais crypto-actifs impose l'identification des clients (KYC) au titre de la lutte contre le blanchiment ;
- les ethers fictifs ne doivent jamais être présentés comme un investissement ou un placement.

## Données personnelles

| Texte | Effet sur le projet | Page |
|---|---|---|
| Règlement (UE) 2016/679 (RGPD) | Bases légales, droits des personnes, registre, sécurité, sous-traitants | [RGPD](rgpd.md), [Registre des traitements](registre-traitements.md) |
| Loi n° 78-17 du 6 janvier 1978 (Informatique et Libertés) | Transposition et compléments nationaux, dont les règles sur les traceurs | [Cookies, mentions et CGU](cookies-mentions.md) |
| Lignes directrices 02/2025 du Comité européen de la protection des données sur le traitement de données personnelles au moyen de technologies blockchain | Garder les données identifiantes hors chaîne, documenter l'impossibilité d'effacer ce qui est inscrit | [Blockchain et données personnelles](blockchain-donnees.md) |

Points propres à la blockchain :

| Sujet | Mesure |
|---|---|
| L'adresse de portefeuille est une donnée pseudonyme | Aucune autre donnée personnelle n'est écrite sur la chaîne, ni email ni nom |
| Droit à l'effacement contre immutabilité | L'effacement supprime l'email et la clé chiffrée en base ; les transactions restent sur la chaîne |
| Clé privée du citoyen | Chiffrée en AES-256-GCM, jamais renvoyée au client ni journalisée |
| Transferts hors UE | Les nœuds de la blockchain publique sont répartis dans le monde ; seules des données pseudonymes y sont publiées. Chainlink ne reçoit que des demandes d'aléa. |

## Commerce électronique et information du public

| Texte | Effet | Situation |
|---|---|---|
| Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN) | Mentions légales identifiant l'éditeur, le directeur de la publication et l'hébergeur | Publiées sur le web (`/mentions-legales`) et dans l'application mobile avec les valeurs du scénario fictif ; partielles sur le site de l'Office de Tourisme (voir [Cookies, mentions et CGU](cookies-mentions.md)) |
| Code de la consommation | Conditions générales de vente si un service est vendu à un consommateur | Sans objet : aucune vente ; la billetterie de l'Office de Tourisme est une démonstration |
| Règlement (UE) 2022/2065 sur les services numériques (DSA) | Point de contact et mécanisme de signalement pour les services d'hébergement de contenus | Le chat en direct diffuse des messages de participants sans modération ; l'applicabilité est à faire préciser |

## Accessibilité

| Texte | Effet |
|---|---|
| Article 47 de la loi n° 2005-102 du 11 février 2005 | Obligation d'accessibilité des services de communication au public en ligne des organismes publics, dont les communes |
| Référentiel général d'amélioration de l'accessibilité (RGAA) | Méthode de mise en conformité, déclaration d'accessibilité, schéma pluriannuel |
| Directive (UE) 2019/882 (European Accessibility Act) | Applicable à certains produits et services privés depuis juin 2025 ; à vérifier pour les commerçants partenaires |

L'état réel est décrit dans [Accessibilité numérique](accessibilite.md).

## Éthique et jeu responsable

- Public visé : les 18 à 35 ans d'EtherBay. Le jeu est réservé aux majeurs dont la pièce d'identité a été validée par la Mairie.
- Plafonds : un seul ticket par participant et par grand tirage, imposé par le schéma de `POST /api/lottery/buy`, par le service (409 « Vous avez déjà votre ticket pour ce grand tirage. ») et par le contrat (`maxTicketsPerPlayer`, 1 par défaut dans [`smart-contract/scripts/lib/deployment.ts`](src:smart-contract/scripts/lib/deployment.ts)). L'ancienne limite personnelle de jeu responsable (`PUT /api/user/responsible-limit`) a été retirée : la route n'existe plus, le profil renvoie toujours `responsibleGaming.maxTicketsPerRound: 1` et la page `/profil/securite` du web explique la règle d'un ticket par habitant.
- Transparence : code du contrat vérifiable sur Etherscan après déploiement sur Sepolia, preuve VRF consultable, commission de la Mairie plafonnée à 20 % dans le contrat (`MAX_FEE_BPS = 2000`), remboursement du prix du ticket si le tour est annulé, hors frais réseau déjà consommés.
- Le règlement de participation (`/reglement` et écran `Legal` du mobile) et la page `/profil/securite` rappellent le numéro de Joueurs Info Service (09 74 75 13 13).
- Les mécaniques d'engagement (compte à rebours, salle d'attente, cadeaux, parrainage, quêtes, tickets à gratter) doivent rester mesurées. Aucune incitation à racheter des ethers ne doit exister, puisqu'aucun achat n'est possible.

## Suivi de la veille

| Sujet à surveiller | Raison |
|---|---|
| Bilan de l'expérimentation JONUM | Peut ouvrir ou fermer une voie pour une variante à valeur réelle |
| Lignes directrices définitives du CEPD sur la blockchain | La version 02/2025 a été soumise à consultation publique |
| Normes techniques de MiCA sur la conservation | Exigences précises en cas d'exploitation réelle |
| Doctrine de l'ANJ sur les dispositifs gratuits | Confirme ou non la qualification hors loterie |

La veille est à reprendre à chaque évolution de la portée du projet, et au moins avant tout passage sur un réseau principal.

## Sources consultées

- Code de la sécurité intérieure, articles L320-1 et L322-1 et suivants (Légifrance)
- [Douane : organiser des loteries ou lotos](https://www.douane.gouv.fr/fiche/vous-souhaitez-organiser-des-loteries-ou-lotos)
- [Associathèque : loteries, tombolas et lotos](https://www.associatheque.fr/fr/organiser-une-manifestation/loterie-tombola-loto.html)
- [ANJ : lancement de l'expérimentation JONUM](https://anj.fr/launch-jonum-regulatory-framework-trial)
- [Squire Patton Boggs : le régime expérimental des JONUM](https://larevue.squirepattonboggs.com/le-regime-experimental-des-jonum-jeux-a-objet-numeriques-monetisables.html)
- Règlement (UE) 2023/1114 sur les marchés de crypto-actifs (MiCA)
- Règlement (UE) 2016/679 (RGPD)
- Lignes directrices 02/2025 du CEPD sur le traitement de données personnelles au moyen de technologies blockchain, citées dans la politique de confidentialité du web

Les textes ajoutés dans cette version (LCEN, DSA, loi de 2005, directive 2019/882) n'ont pas fait l'objet d'une lecture détaillée par l'équipe : leur applicabilité est à confirmer.
