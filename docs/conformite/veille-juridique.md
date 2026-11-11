# Veille juridique et réglementaire

- Date de la veille : 2026-11-11
- Portée : loterie BlockLucky de la Ville d'EtherBay, en démonstration sur un testnet avec des ethers fictifs
- Statut : analyse d'équipe projet, **à faire valider par un juriste** avant toute exploitation publique

Ce document répond à la partie « Aspects éthiques et réglementaires » du kickoff (éthique, réglementation, gestion des risques). Il ne constitue pas un avis juridique.

## 1. Synthèse

| Question | Réponse pour BlockLucky en démonstration | Ce qui changerait avec de vrais euros ou de vrais ethers |
|---|---|---|
| Est-ce une loterie interdite ? | Non : sans sacrifice financier réel et sans gain ayant une valeur, l'opération sort de la définition légale de la loterie. | Oui : loterie prohibée en principe ; exceptions étroites (associations, objets mobiliers, autorisation) ; monopole de la FDJ pour les loteries publiques. |
| Faut-il une autorisation de l'ANJ ? | Non | Oui, ou exploitation impossible hors des exceptions légales |
| Le portefeuille intégré est-il une activité réglementée ? | Non : les ethers de Sepolia n'ont pas de valeur marchande revendiquée. | Oui : la conservation de crypto-actifs pour le compte de tiers relève de MiCA. |
| Le RGPD s'applique-t-il ? | Oui : email, adresse de portefeuille, historique de participation | Idem, avec en plus des obligations de lutte contre le blanchiment |
| Les mineurs peuvent-ils jouer ? | L'inscription exige une déclaration de majorité (`isAdultConfirmed`). | Contrôle d'âge renforcé obligatoire |

## 2. Jeux d'argent et loteries

### 2.1 Textes

- Code de la sécurité intérieure (CSI), livre III, titre II, issu de l'ordonnance n° 2019-1015 du 2 octobre 2019 :
  - **article L320-1** : interdiction de principe des jeux d'argent et de hasard ;
  - **article L322-1** : les loteries de toute espèce sont prohibées ;
  - **article L322-2** : définition de la loterie, à savoir une opération offerte au public qui fait naître l'espérance d'un gain dû, même partiellement, au hasard, et pour laquelle un sacrifice financier est exigé des participants.
- **Exceptions des articles suivants du chapitre** :
  - loteries d'objets mobiliers destinées à des actes de bienfaisance, à l'encouragement des arts ou au financement d'activités sportives à but non lucratif, sur autorisation administrative ;
  - lotos traditionnels en cercle restreint, avec des mises et des lots de faible valeur.

  La numérotation exacte des articles et l'autorité qui délivre l'autorisation sont à confirmer sur Légifrance : les sources secondaires consultées divergent.
- **Autorité nationale des jeux (ANJ)**, créée par la même ordonnance, qui régule les jeux d'argent et contrôle les droits exclusifs de la Française des Jeux sur les loteries.

### 2.2 Application au projet

La définition légale repose sur quatre éléments cumulatifs : une offre au public, l'espérance d'un gain, l'intervention du hasard et un sacrifice financier.

| Élément | Situation de BlockLucky |
|---|---|
| Offre au public | Oui : tous les habitants d'EtherBay |
| Espérance d'un gain | La cagnotte est en ethers fictifs de Sepolia, sans valeur marchande. Les EtherPoints et les offres des partenaires sont gagnés par la participation, pas par le hasard. |
| Hasard | Oui : tirage Chainlink VRF |
| Sacrifice financier | Non : les ethers utilisés sont une dotation gratuite de la Mairie ; le citoyen ne paie rien. |

Sans sacrifice financier et sans gain de valeur, l'opération relève d'un dispositif pédagogique et non d'un jeu d'argent.

Conditions à maintenir pour rester dans ce cadre :

1. Ne jamais vendre d'ethers fictifs, ni échanger la cagnotte contre des euros, des biens ou des services.
2. Ne pas déployer le contrat sur le réseau Ethereum principal, et ne pas l'alimenter en ethers réels.
3. Garder les avantages des commerces partenaires indépendants du tirage : ils sont obtenus avec des EtherPoints gagnés par la participation, sans hasard. La « carte à gratter » du catalogue est seulement une animation qui révèle la récompense choisie et payée en EtherPoints. Elle ne doit jamais devenir un tirage aléatoire, sinon elle recréerait une loterie à mise.
4. L'afficher clairement dans l'interface (charte de transparence, mode démonstration) et dans le règlement.

### 2.3 Si la Mairie voulait une vraie loterie

- **Loterie de fin d'année avec mise en euros.** Elle n'est possible que via une association, avec des lots en nature (pas de cagnotte en argent) et une autorisation administrative. Elle ne peut pas être gérée par la commune pour son propre compte.
- **Jeux à objets numériques monétisables (JONUM).** Ils sont expérimentés pendant trois ans depuis la loi n° 2024-449 du 21 mai 2024, dite SREN (articles 40 et 41), et le décret publié au Journal officiel du 6 février 2026. Ce régime exige :
  - une déclaration préalable à l'ANJ ;
  - un compte joueur ;
  - l'exclusion des mineurs ;
  - des lots en objets numériques, et non une cagnotte en crypto-monnaie.

  Une cagnotte en ether n'entre pas dans ce régime.

## 3. Crypto-actifs et portefeuille intégré

- **Règlement (UE) 2023/1114 dit MiCA.** La conservation et l'administration de crypto-actifs pour le compte de clients sont un service sur crypto-actifs soumis à agrément de prestataire (CASP) délivré par l'AMF en France.
- **Le portefeuille intégré de BlockLucky est custodial** : la Mairie conserve les clés chiffrées des citoyens. Avec des actifs de testnet sans valeur, ce n'est pas un crypto-actif au sens économique. Sur un réseau principal, il faudrait :
  - soit un agrément ;
  - soit passer à un modèle non custodial, où le citoyen détient sa clé (portefeuille externe ou export de clé) ;
  - soit déléguer la conservation à un prestataire agréé.
- **Lutte contre le blanchiment** : un service manipulant de vrais crypto-actifs impose l'identification des clients (KYC), qui n'est pas prévue ici.
- **Communication** : ne jamais présenter les ethers fictifs comme un investissement ou un placement.

## 4. Données personnelles (RGPD)

Le registre complet est tenu dans [le registre des traitements](../rgpd/registre-traitements.md). Points propres à la blockchain :

| Sujet | Mesure |
|---|---|
| L'adresse de portefeuille est une donnée pseudonyme. | Aucune autre donnée personnelle n'est écrite sur la chaîne : ni email, ni nom. Le lien entre adresse et citoyen reste dans la base du backend. |
| Droit à l'effacement contre immutabilité | L'effacement supprime le compte et la clé chiffrée en base. Les transactions restent sur la chaîne mais ne sont plus rattachables à une personne. Cette limite doit figurer dans le règlement et la politique de confidentialité présentés à l'inscription. |
| Clé privée du citoyen | Elle est chiffrée en AES-256-GCM, jamais renvoyée au client ni journalisée, et la clé de chiffrement est fournie par l'environnement. |
| Transferts hors UE | Les nœuds de la blockchain publique sont répartis dans le monde : seules des données pseudonymes y sont publiées. Chainlink reçoit uniquement des demandes d'aléa, sans donnée personnelle. |

## 5. Éthique et jeu responsable

- Public visé : les 18-35 ans d'EtherBay. L'accès est réservé aux majeurs, sur déclaration à l'inscription.
- Plafonds :
  - par participant et par tour dans le contrat (`maxTicketsPerPlayer`) ;
  - limite de jeu responsable côté backend.
- Transparence :
  - code source publié sur Etherscan ;
  - preuve VRF consultable ;
  - commission de la Mairie affichée et plafonnée à 20 % dans le contrat ;
  - remboursement intégral si le tour est annulé.
- Les mécaniques d'engagement (FOMO, compte à rebours, cadeaux viraux) doivent rester mesurées. Aucune incitation à racheter des ethers ne doit exister, puisqu'aucun achat n'est possible.

## 6. Points à faire valider par un juriste

1. La qualification « hors loterie » d'un dispositif sans mise réelle, mais dont la dotation est financée par la commune.
2. Les articles exacts du CSI applicables aux exceptions, et l'autorité compétente pour une éventuelle variante associative.
3. Le statut des EtherPoints échangeables contre des offres de commerçants : absence de hasard, et éventuel avantage en nature.
4. Le règlement de jeu à publier : conditions, durée, dotation, absence de valeur, modalités de remboursement, mentions RGPD.

## Sources consultées

- Code de la sécurité intérieure, articles L320-1 et L322-1 et suivants (Légifrance)
- [Douane : organiser des loteries ou lotos](https://www.douane.gouv.fr/fiche/vous-souhaitez-organiser-des-loteries-ou-lotos)
- [Associathèque : loteries, tombolas et lotos](https://www.associatheque.fr/fr/organiser-une-manifestation/loterie-tombola-loto.html)
- [ANJ : lancement de l'expérimentation JONUM](https://anj.fr/launch-jonum-regulatory-framework-trial)
- [Squire Patton Boggs : le régime expérimental des JONUM](https://larevue.squirepattonboggs.com/le-regime-experimental-des-jonum-jeux-a-objet-numeriques-monetisables.html)
- Règlement (UE) 2023/1114 sur les marchés de crypto-actifs (MiCA)
- Règlement (UE) 2016/679 (RGPD)
