# Analyse d'impact relative à la protection des données

Cette page est l'analyse d'impact relative à la protection des données (AIPD) de BlockLucky, prévue par l'article 35 du RGPD. Elle suit la méthode de la CNIL en quatre temps : description du traitement, nécessité et proportionnalité, appréciation des risques sur la vie privée, puis plan d'action. Elle s'appuie sur le code du dépôt et sur les pages [RGPD](rgpd.md), [Registre des traitements](registre-traitements.md), [Registre des risques](registre-risques.md) et la partie [Sécurité](../securite/menaces.md). C'est une version de travail, rédigée par l'équipe projet : **l'avis du DPO reste à recueillir** avant toute exploitation réelle. Elle ne constitue pas un avis juridique.

## Pourquoi une AIPD

Le traitement réunit plusieurs critères des lignes directrices du CEPD et de la liste de la CNIL :

| Critère | Situation dans BlockLucky |
|---|---|
| Usage innovant d'une technologie | Inscription des participations sur une blockchain, portefeuille intégré conservé par le service |
| Données à caractère hautement personnel | Photos du recto et du verso de la pièce d'identité, examinées par un agent |
| Données publiques et immuables | Adresses, montants et événements visibles par tous sur un réseau public de test, impossibles à effacer |
| Personnes potentiellement nombreuses | Objectif de 10 000 participants pour un service communal |
| Croisement de données | Mesure d'audience rattachée au compte, lien entre compte et adresse de portefeuille |

Deux critères suffisent en général à rendre l'analyse obligatoire. La question était ouverte sous le numéro DPO-7 dans [Points à valider](points-a-valider.md).

## 1. Description du traitement

### Responsable et périmètre

| Élément | Contenu |
|---|---|
| Responsable de traitement | Ville d'EtherBay (collectivité fictive du scénario pédagogique), Direction des Systèmes d'Information, 1 place de la Mairie, 00000 EtherBay |
| Délégué à la protection des données | dpo@etherbay.fr |
| Appui technique | Équipe BlockLucky (Epitech Digital School) |
| Interfaces | Frontend web ([`frontend-web`](src:frontend-web/package.json)), application mobile ([`mobile-app`](src:mobile-app/package.json)), API ([`backend`](src:backend/package.json)), contrat ([`smart-contract`](src:smart-contract/package.json)) |
| Hébergement de la démonstration | Microsoft Azure (Microsoft Ireland Operations Limited), machine virtuelle en région Danemark Est, domaine `etherbay.tech` |
| Hors périmètre | Site de l'Office de Tourisme, qui ne transmet aucune donnée à un serveur |

### Finalités

Tirage au sort citoyen gratuit en ETH de test, programme de fidélité EtherPoints avec des commerçants partenaires, cadeau et parrainage, vérification de l'âge, assistance, sécurité des comptes et mesure d'audience. Le détail par traitement figure dans le [registre des traitements](registre-traitements.md).

### Données et cycle de vie

| Étape | Données | Support | Durée |
|---|---|---|---|
| Inscription et connexion | Email, empreinte bcrypt du mot de passe (mobile), connexion Google éventuelle, code temporaire, tranche d'âge et majorité déclarées (web) | PostgreSQL, Redis | Codes 10 minutes ; compte pour la durée du pilote |
| Paramètres | Prénom et nom facultatifs, préférences d'affichage, catégories de notifications | PostgreSQL, Redis | Durée du compte |
| Vérification de l'âge | Photos recto et verso de la pièce, statut, dates, motif d'un refus, agent | Table `IdentityDocument` (images chiffrées AES-256-GCM), `User`, journal d'administration | Photos effacées à la décision ; statut pour la durée du compte |
| Portefeuille | Adresse, clé privée chiffrée, hash de la dotation | PostgreSQL ; adresse sur la chaîne | Clé détruite à l'effacement ; adresse publique sans limite |
| Participation | Un ticket par tour, hash de transaction, adresse payeuse, gain ou remboursement | PostgreSQL et chaîne | Durée du pilote ; sur la chaîne sans limite |
| Fidélité | Points, récompenses, codes promo | PostgreSQL | Durée du compte puis rattachement à l'identifiant anonymisé |
| Cadeau | Email du bénéficiaire, message, lien de parrainage | PostgreSQL | Comme le compte |
| Assistance | Objet, message, email, prénom et nom | Email vers `SUPPORT_EMAIL`, aucune copie en base | Selon la messagerie de la Mairie |
| Mesure d'audience web | Type d'événement, source UTM, page, identifiant du compte connecté | `localStorage` après consentement, table `Analytics` | Choix 6 mois sur l'appareil ; 13 mois au plus côté serveur (purge à implémenter) |
| Journaux | Journal d'administration, journaux techniques | Table `Analytics`, sortie du serveur | 1 an pour le journal d'administration ; journaux techniques à fixer |

### Supports

API Express, PostgreSQL, Redis, files BullMQ, serveur SMTP, nœud RPC Ethereum (Hardhat en local, Sepolia s'il est déployé), stockage local du navigateur et stockage sécurisé du téléphone. L'architecture est décrite dans [Vue d'ensemble](../architecture/vue-ensemble.md).

## 2. Nécessité et proportionnalité

### Principes

| Principe | Appréciation | Écart restant |
|---|---|---|
| Finalités déterminées | Chaque traitement a une finalité inscrite au registre | Aucun |
| Base légale | Exécution des conditions et du règlement ; intérêt légitime pour la sécurité ; consentement pour la mesure d'audience web depuis le bandeau | Base de la vérification d'âge et du compte créé pour le bénéficiaire d'un cadeau à valider (DPO-1, DPO-2, DPO-12) |
| Minimisation | Aucune donnée bancaire ; date de naissance et numéro de pièce non saisis ; email jamais publié sur la chaîne | La photo de la pièce montre toutes ses mentions ; une solution de vérification d'âge sans transmission d'identité serait moins intrusive (JUR-14) |
| Exactitude | Rectification du prénom, du nom et de l'email dans l'application mobile | Pas d'écran de rectification sur le web |
| Durées limitées | Codes, jetons et photos effacés automatiquement | Purges des comptes, de l'audience et des journaux non implémentées (DPO-4) |

### Droits des personnes

| Droit | Mise en œuvre |
|---|---|
| Information | Politique de confidentialité, politique relative aux traceurs, conditions et règlement, publiés sur le web et dans l'application (`/confidentialite`, `/traceurs`, écran Informations légales) |
| Consentement | Bandeau [`ConsentBanner.tsx`](src:frontend-web/src/components/layout/ConsentBanner.tsx) avec « Tout refuser » et « Tout accepter » au même niveau ; retrait par « Gérer mes traceurs » ; aucune origine de visite ni aucun événement de mesure avant accord ([`frontend-web/src/lib/consent.ts`](src:frontend-web/src/lib/consent.ts)) |
| Accès et portabilité | Export JSON en libre-service (`GET /api/user/gdpr/export`) ; export incomplet pour les données Redis (DPO-9) |
| Effacement | Demande puis confirmation par email valable 24 heures ; anonymisation de la fiche du compte ; traces pseudonymes conservées (DPO-5) |
| Opposition et limitation | Demande au DPO ; retrait du consentement en un clic pour la mesure web |
| Intervention humaine | Le tirage est automatisé ; examen humain sur demande à support@etherbay.fr ; la vérification d'âge est une décision humaine |

### Sous-traitants et transferts

Hébergeur (Microsoft Azure, Union européenne), fournisseur SMTP et fournisseur RPC à désigner par contrat (DPO-11). Google intervient seulement si la personne choisit cette connexion. Les adresses pseudonymes inscrites sur un réseau public sont répliquées dans le monde entier (DPO-6).

## 3. Risques

L'échelle suit la méthode de la CNIL : gravité et vraisemblance de 1 (négligeable) à 4 (maximale). La cotation tient compte des mesures déjà présentes dans le dépôt. Elle est une proposition à valider par le DPO.

### Accès illégitime à des données

| Élément | Analyse |
|---|---|
| Sources de risque | Attaquant externe, agent de la Mairie qui outrepasse ses droits, compte administrateur compromis, prestataire |
| Menaces | Fuite de la base ou d'une sauvegarde, vol de `ENCRYPTION_KEY`, consultation abusive des pièces d'identité, recoupement d'une adresse publique avec une personne, lecture d'un jeton dans un journal ou une URL |
| Données les plus sensibles | Photos de pièce d'identité en attente, clés privées chiffrées, email |
| Impacts | Usurpation d'identité à partir de la pièce, hameçonnage ciblé, perte des fonds de test, révélation de la participation d'une personne |
| Mesures existantes | Chiffrement AES-256-GCM des pièces et des clés, rôle ADMIN avec double authentification, journalisation de chaque consultation de pièce, effacement des photos à la décision, mots de passe hachés, limites de débit, révocation des sessions (voir [Cryptographie et secrets](../securite/cryptographie-secrets.md), [Autorisations](../securite/autorisations.md), [Protection des API](../securite/protection-api.md)) |
| Gravité | 3 (importante), en raison des pièces d'identité |
| Vraisemblance | 2 (limitée) |

### Modification non désirée de données

| Élément | Analyse |
|---|---|
| Sources de risque | Attaquant externe, opérateur disposant des rôles du contrat, propriétaire VRF du contrat |
| Menaces | Tirage manipulé par remplacement du coordinateur VRF, annulation ciblée d'un tour, altération d'une décision sur l'âge, double achat |
| Impacts | Perte de confiance dans le tirage, exclusion injustifiée d'un participant, gain attribué à tort |
| Mesures existantes | Chainlink VRF sur Sepolia, coordinateur simulé et signalé comme tel en local, événements publics du contrat, unicité d'un ticket par participant, idempotence côté serveur, décision d'âge journalisée, charte de transparence qui distingue les environnements |
| Gravité | 2 (limitée) : gains sans valeur monétaire |
| Vraisemblance | 2 (limitée) ; le transfert de propriété VRF est implémenté dans les scripts de déploiement mais pas encore exécuté sur Sepolia, où rien n'est déployé (SC8, DSI-1) |

### Disparition de données

| Élément | Analyse |
|---|---|
| Sources de risque | Panne, erreur d'exploitation, perte d'un secret |
| Menaces | Perte de la base ou de Redis, rotation ou perte de `ENCRYPTION_KEY` rendant les portefeuilles inutilisables, effacement irréversible demandé par erreur |
| Impacts | Perte de l'historique et des points, portefeuilles inaccessibles, gains en attente perdus |
| Mesures existantes | Sauvegardes prévues ([Sauvegardes et reprise](../infrastructure/sauvegardes.md)), la chaîne fait foi et permet de reconstruire les participations, confirmation par email de toute suppression, fonds fictifs |
| Gravité | 2 (limitée) |
| Vraisemblance | 2 (limitée) ; aucun outil de re-chiffrement (DSI-3) |

### Synthèse

| Risque | Gravité | Vraisemblance | Niveau |
|---|---|---|---|
| Accès illégitime | 3 | 2 | À réduire en priorité |
| Modification non désirée | 2 | 2 | Acceptable pour une démonstration, à réduire avant une exploitation |
| Disparition | 2 | 2 | Acceptable pour une démonstration |

## 4. Mesures prévues et plan d'action

| N° | Mesure | Risque réduit | Responsable | État |
|---|---|---|---|---|
| A1 | Bandeau de consentement web, blocage de l'origine de visite et des événements de mesure avant accord, retrait en un clic | Accès illégitime (audience) | Équipe front | Fait |
| A2 | Textes publics complets : CGU, règlement, mentions légales, confidentialité, traceurs, charte, sur le web et le mobile | Information des personnes | Équipe | Fait |
| A3 | Délai maximal de conservation d'une pièce d'identité jamais traitée, avec purge automatique | Accès illégitime | Équipe backend | À faire |
| A4 | Rôle dédié aux agents habilités à consulter les pièces, distinct d'ADMIN | Accès illégitime | DSI | À décider (DSI-8) |
| A5 | Purges planifiées des comptes inactifs, des événements d'audience de plus de 13 mois, du journal d'administration de plus d'un an et des jetons expirés | Accès illégitime | Équipe backend | À faire |
| A6 | Effacement des données Redis et de `Ticket.payerWallet` à l'anonymisation, après avis du DPO | Accès illégitime | Équipe backend | À décider (DPO-5) |
| A7 | Transfert de la propriété VRF à un multisig de la Mairie | Modification non désirée | DSI | Implémenté dans `deploy-sepolia.ts` (`transferOwnership` puis `acceptOwnership` par le multisig) ; à exécuter au déploiement Sepolia (DSI-1) |
| A8 | Outil de re-chiffrement et sauvegarde séparée de `ENCRYPTION_KEY` | Disparition | DSI | À faire (DSI-3) |
| A9 | Contrats de sous-traitance (hébergeur, SMTP, RPC) | Accès illégitime | Mairie | À faire (DPO-11) |
| A10 | Invitation suivie d'une acceptation pour le bénéficiaire d'un cadeau, au lieu de la création d'un compte à son insu | Information des personnes | Équipe backend | À décider (DPO-2) |
| A11 | Étude d'une vérification d'âge sans transmission de l'identité | Accès illégitime | Mairie | À étudier (JUR-14) |

Les mesures A3, A5 et A7 conditionnent un déploiement public sur Sepolia avec de vrais participants.

## 5. Avis du DPO

| Rubrique | Contenu |
|---|---|
| Avis du DPO | À recueillir |
| Date | |
| Décision du responsable de traitement | À rendre après l'avis |
| Consultation préalable de la CNIL | Nécessaire seulement si des risques élevés subsistent après les mesures prévues |
| Révision | À chaque nouvelle donnée collectée, avant un déploiement sur Sepolia et après tout incident |
