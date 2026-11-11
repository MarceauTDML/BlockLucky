# Points à valider

Cette page rassemble les questions que l'équipe projet ne peut pas trancher seule. Elles sont adressées à un juriste, au délégué à la protection des données (DPO) de la Ville ou à la DSI, selon leur nature. Chaque point renvoie à la page qui l'explique et indique ce que le code fait aujourd'hui, pour que la réponse puisse être traduite directement en action. Aucune des analyses de cette documentation ne constitue un avis juridique.

## Comment utiliser cette liste

1. Le destinataire répond point par point, en précisant le texte applicable.
2. L'équipe met à jour la page concernée, le [registre des traitements](registre-traitements.md) ou le [registre des risques](registre-risques.md).
3. Si la réponse impose un changement de code, une tâche est ouverte et le point reste « en cours » jusqu'à sa livraison.

## Pour un juriste

### Jeux d'argent

| N° | Question | Situation actuelle | Page |
|---|---|---|---|
| JUR-1 | Un dispositif sans mise réelle, dont la dotation en ethers fictifs est financée par la commune, sort-il bien de la définition de la loterie de l'article L322-2 du code de la sécurité intérieure ? | Aucune vente, aucune conversion, réseau de test | [Veille juridique](veille-juridique.md#jeux-d-argent-et-loteries) |
| JUR-2 | Quels sont les articles exacts du CSI applicables aux exceptions, et quelle autorité serait compétente pour une variante associative ? | Numérotation divergente selon les sources secondaires | [Veille juridique](veille-juridique.md#textes) |
| JUR-3 | Les EtherPoints, échangeables contre des offres de commerçants, sont-ils un avantage en nature ou relèvent-ils d'un autre régime (fidélité, promotion) ? | Points gagnés par la participation, sans hasard | [Crypto-actifs et MiCA](crypto-actifs.md#etherpoints) |
| JUR-4 | La « carte à gratter » du catalogue, qui révèle une récompense déjà choisie et payée, peut-elle être perçue comme un jeu de hasard ? | Animation sans tirage aléatoire | [Veille juridique](veille-juridique.md#conditions-a-maintenir) |
| JUR-5 | Quel contenu minimal pour un règlement de jeu : durée, dotation, absence de valeur, remboursement, litiges ? Faut-il un dépôt ? | Page « Conditions de participation » en version de travail | [Cookies, mentions et CGU](cookies-mentions.md#pages-legales) |

### Crypto-actifs

| N° | Question | Situation actuelle | Page |
|---|---|---|---|
| JUR-6 | La conservation de clés pour des ethers de réseau de test, sans valeur, échappe-t-elle bien à l'agrément de prestataire de services sur crypto-actifs de MiCA ? | Portefeuille custodial | [Crypto-actifs et MiCA](crypto-actifs.md#le-reglement-mica) |
| JUR-7 | Le badge POAP non transférable relève-t-il de l'exclusion des jetons non fongibles uniques ? | Un badge par participant et par tour | [Crypto-actifs et MiCA](crypto-actifs.md#le-reglement-mica) |
| JUR-8 | Le paquet `@chainlink/contracts` est sous BUSL-1.1, mais chaque fichier compilé porte un en-tête MIT. Cette lecture fichier par fichier est-elle opposable ? | Bytecode issu de fichiers MIT | [Licences](licences.md#smart-contracts) |

### Information du public et propriété intellectuelle

| N° | Question | Situation actuelle | Page |
|---|---|---|---|
| JUR-9 | Quelles mentions légales (LCEN) pour le web, le mobile et le site de l'Office de Tourisme : éditeur, directeur de la publication, hébergeur ? | Absentes sur le web et le mobile, partielles sur le site de l'Office de Tourisme | [Cookies, mentions et CGU](cookies-mentions.md#synthese) |
| JUR-10 | Le chat en direct, qui diffuse des messages de participants sans modération, entre-t-il dans le champ du règlement sur les services numériques (point de contact, signalement) ? | Messages tronqués à 280 caractères, ni stockés ni modérés | [Veille juridique](veille-juridique.md#commerce-electronique-et-information-du-public) |
| JUR-11 | Qui détient les droits sur le code d'un projet pédagogique réalisé pour une ville fictive, et quelle licence publier ? | Aucun fichier `LICENSE` ; `ISC` dans un seul `package.json` ; contrats en MIT | [Licences](licences.md#licence-du-depot) |
| JUR-12 | L'engagement de ne pas poursuivre un chercheur de bonne foi, écrit dans `SECURITY.md`, engage-t-il valablement la Ville ? | Engagement publié | [Signaler une vulnérabilité](../securite/signalement.md#engagements) |
| JUR-13 | Quelles obligations d'accessibilité s'appliquent concrètement (déclaration, schéma pluriannuel, sanctions) ? | Aucune déclaration publiée | [Accessibilité numérique](accessibilite.md#cadre) |

## Pour le DPO

| N° | Question | Situation actuelle | Page |
|---|---|---|---|
| DPO-1 | Pour un service communal, la base légale du compte doit-elle être l'exécution du contrat ou la mission d'intérêt public ? | Exécution du contrat | [RGPD](rgpd.md#bases-legales) |
| DPO-2 | Quelle base légale pour la création d'un compte au nom du bénéficiaire d'un cadeau, qui n'a fait aucune démarche ni confirmé sa majorité ? Faut-il l'informer, et comment ? | Compte créé avec portefeuille, rattaché à l'expéditeur comme filleul, sans email d'information dans le mode sur chaîne | [Registre des traitements](registre-traitements.md#2-cadeau-de-ticket) |
| DPO-3 | La mesure d'audience, qui porte l'identifiant du compte connecté et la source UTM, peut-elle bénéficier de l'exemption de consentement ? À défaut, un bandeau est nécessaire sur le web. | Opposition sur la page Confidentialité ; événements de connexion non couverts | [Cookies, mentions et CGU](cookies-mentions.md#consentement) |
| DPO-4 | Quelles durées de conservation retenir pour les comptes inactifs, les événements d'audience, le journal d'administration et les journaux techniques ? | Durées annoncées, aucune purge implémentée | [RGPD](rgpd.md#durees-de-conservation) |
| DPO-5 | L'anonymisation actuelle suffit-elle, alors que `Ticket.payerWallet` et `transactionHash` conservent le lien vers l'ancienne adresse ? Faut-il effacer ces colonnes ? | Email et clé supprimés, tickets conservés | [Blockchain et données personnelles](blockchain-donnees.md#immutabilite-et-droit-a-l-effacement) |
| DPO-6 | La publication d'adresses pseudonymes sur une blockchain répliquée mondialement constitue-t-elle un transfert hors UE, et comment le documenter ? | Seules des adresses et des montants sont publiés | [Blockchain et données personnelles](blockchain-donnees.md#transferts-hors-de-l-union-europeenne) |
| DPO-7 | Une analyse d'impact (AIPD) est-elle nécessaire (technologie innovante, données publiques et immuables, public potentiellement large) ? | Non réalisée | [RGPD](rgpd.md#ce-qui-reste-a-faire) |
| DPO-8 | Le contenu de la politique de confidentialité doit-il être complété : cadeau de ticket, données Redis, caractère définitif des transactions, destruction des fonds à l'effacement ? La mention « événements anonymisés » doit-elle être corrigée ? | Version de travail | [Cookies, mentions et CGU](cookies-mentions.md#pages-legales) |
| DPO-9 | L'export doit-il inclure les préférences, la limite de jeu, les quêtes et le lien de parrainage ? | Absents de l'export | [RGPD](rgpd.md#acces-et-portabilite) |
| DPO-10 | Les deux adresses de contact `dpo@etherbay.fr` et `dpo@destination-etherbay.fr` désignent-elles la même personne ? | Adresses différentes selon le site | [Cookies, mentions et CGU](cookies-mentions.md#mentions-legales) |
| DPO-11 | Quelles clauses dans les contrats de sous-traitance (hébergeur, SMTP, S3, fournisseur RPC) ? | Prestataires non désignés | [Registre des traitements](registre-traitements.md#sous-traitants) |

## Pour la DSI

Ces points ne sont pas juridiques mais conditionnent la conformité ou la sécurité.

| N° | Décision attendue | Page |
|---|---|---|
| DSI-1 | Transférer la propriété VRF du contrat (`transferOwnership`) à un multisig de la Mairie après chaque déploiement | [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md#roles-sur-la-chaine) |
| DSI-2 | Séparer les comptes administrateur, trésorerie et opérateur, et adapter le reversement de commission en conséquence | [Clés et garde des portefeuilles](../securite/cles-portefeuilles.md#separation-recommandee) |
| DSI-3 | Écrire un outil de re-chiffrement avant toute rotation de `ENCRYPTION_KEY`, et organiser la sauvegarde de ce secret | [Cryptographie et secrets](../securite/cryptographie-secrets.md#rotation) |
| DSI-4 | Décider si la 2FA des administrateurs doit être un vrai second facteur (TOTP en plus du code email, ou WebAuthn) | [Authentification](../securite/authentification.md#limites-connues) |
| DSI-5 | Restreindre `cancelRound` à l'état `Open` lors du prochain redéploiement du contrat | [Modèle de menaces](../securite/menaces.md#front-running-et-ordre-des-transactions) |
| DSI-6 | Créer la page web de confirmation de suppression, ou retirer le lien de l'email | [RGPD](rgpd.md#effacement) |
| DSI-7 | Planifier un audit d'accessibilité et la mise en accessibilité de l'application mobile | [Accessibilité numérique](accessibilite.md#recommandations) |

## Suivi

| N° | Destinataire | Réponse | Date | Action |
|---|---|---|---|---|
| JUR-1 à JUR-13 | Juriste | En attente | | |
| DPO-1 à DPO-11 | DPO | En attente | | |
| DSI-1 à DSI-7 | DSI | En attente | | |

Ce tableau est à tenir à jour au fil des réponses. Une réponse qui modifie une qualification (par exemple JUR-1 ou JUR-6) impose de relire la [veille juridique](veille-juridique.md) et le [registre des risques](registre-risques.md).
