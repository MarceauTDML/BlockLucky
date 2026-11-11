# Registre des traitements

Ce registre, prévu par l'article 30 du RGPD, décrit les traitements de données personnelles tels qu'ils sont implémentés dans le dépôt. C'est un document de travail **à valider par le DPO** avant la mise en production. Chaque fiche renvoie au code qui réalise le traitement, pour que le registre puisse être tenu à jour à chaque évolution.

| Rubrique générale | Contenu |
|---|---|
| Responsable de traitement | Ville d'EtherBay, Direction des Systèmes d'Information, dsi@etherbay.fr |
| Délégué à la protection des données | dpo@etherbay.fr |
| Mesures de sécurité communes | Partie [Sécurité](../securite/menaces.md) |
| Droits des personnes | Page [RGPD](rgpd.md#droits-des-personnes) |

## 1. Comptes citoyens et participation à la loterie

| Rubrique | Contenu |
|---|---|
| Finalité | Inscription, connexion, participation à la Grande Loterie citoyenne, historique des tickets, versement des gains et remboursements |
| Base légale | Exécution du contrat (conditions de participation) |
| Personnes concernées | Citoyens majeurs, sur déclaration (`isAdultConfirmed`) ; bénéficiaires d'un ticket offert (voir fiche 2) |
| Données | Email ; adresse du portefeuille intégré et clé privée chiffrée (AES-256-GCM) ; hash de la dotation de bienvenue ; tranche d'âge ; rôle ; tickets, hash de transaction et adresse payeuse ; code de parrainage et parrain ; préférences (thème, langue, notifications) ; limite de jeu responsable |
| Code | [`backend/src/api/auth/auth.services.ts`](src:backend/src/api/auth/auth.services.ts), [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts), [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) |
| Destinataires | Services municipaux habilités (rôle ADMIN) ; sous-traitants techniques listés plus bas |
| Données publiques | Adresse du portefeuille et transactions, inscrites sur la blockchain publique (voir [Blockchain et données personnelles](blockchain-donnees.md)) |
| Conservation | Durée de la participation ; anonymisation sur demande (`/api/user/gdpr/delete-request`) qui supprime l'email, la clé chiffrée et remplace l'adresse dans la fiche du compte. Purge automatique des comptes inactifs **à mettre en place** |
| Transferts hors UE | Aucun pour les données de la base ; la blockchain publique est répliquée mondialement |

## 2. Cadeau de ticket

| Rubrique | Contenu |
|---|---|
| Finalité | Permettre à un citoyen d'offrir un ticket à une personne désignée par son email |
| Base légale | **À déterminer** : le bénéficiaire n'a pas de relation contractuelle préalable |
| Personnes concernées | Bénéficiaires, éventuellement sans compte |
| Données | Email du bénéficiaire ; compte créé à son nom avec portefeuille si l'email est inconnu ; lien de parrainage vers l'expéditeur ; message personnel (250 caractères) |
| Code | `giftOnchain` de [`backend/src/api/lottery/lottery.services.ts`](src:backend/src/api/lottery/lottery.services.ts) |
| Conservation | Comme la fiche 1 |
| Remarque | Le bénéficiaire n'a ni confirmé sa majorité ni accepté les conditions. Ce traitement est absent de l'ancien registre ; il est ajouté ici pour être examiné par le DPO. |

## 3. Programme de fidélité EtherPoints et récompenses partenaires

| Rubrique | Contenu |
|---|---|
| Finalité | Attribution et échange d'EtherPoints contre des offres de commerçants d'EtherBay |
| Base légale | Exécution du contrat |
| Données | Solde et journal des points (motif, montant, date) ; récompenses obtenues ; codes promo générés et leur utilisation en magasin ; quêtes sociales accomplies |
| Code | [`backend/src/services/ledger.service.ts`](src:backend/src/services/ledger.service.ts), [`backend/src/api/marketplace/marketplace.services.ts`](src:backend/src/api/marketplace/marketplace.services.ts) |
| Destinataires | Commerçant partenaire concerné, uniquement pour ses propres codes (contrôle `assertPartnerAccess`) |
| Conservation | Durée de la participation, puis conservation rattachée à l'identifiant du compte anonymisé |

## 4. Comptes partenaires

| Rubrique | Contenu |
|---|---|
| Finalité | Gestion des entreprises partenaires, de leurs offres et de leurs statistiques |
| Base légale | Exécution du contrat de partenariat (à formaliser) |
| Personnes concernées | Commerçants titulaires d'un compte PARTNER |
| Données | Email du compte ; nom et logo de l'entreprise ; offres, stocks et statistiques de consommation |
| Code | [`backend/src/api/partners/partners.services.ts`](src:backend/src/api/partners/partners.services.ts) |
| Destinataires | Le partenaire lui-même ; administrateurs de la Ville |
| Conservation | Durée du partenariat ; aucune règle implémentée |

## 5. Double authentification et sécurité des comptes

| Rubrique | Contenu |
|---|---|
| Finalité | Protéger l'accès aux comptes, détecter et limiter les abus |
| Base légale | Intérêt légitime (sécurité du service) |
| Données | Secret TOTP chiffré ; empreintes des codes de secours ; codes de connexion temporaires ; compteurs d'échecs ; identifiants de sessions révoquées ; adresse IP, utilisée en mémoire et dans Redis par la limitation de débit |
| Code | [`backend/src/services/otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts), [`backend/src/services/session.service.ts`](src:backend/src/services/session.service.ts), [`backend/src/middlewares/rateLimiter.middleware.ts`](src:backend/src/middlewares/rateLimiter.middleware.ts) |
| Conservation | Codes 10 minutes, compteurs 1 heure, révocations jusqu'à l'expiration du jeton, compteurs de débit 10 ou 15 minutes ; secret supprimé à la désactivation de la 2FA ou à l'anonymisation |

## 6. Mesure d'audience et acquisition

| Rubrique | Contenu |
|---|---|
| Finalité | Statistiques de fréquentation du parcours, efficacité des campagnes (source UTM) |
| Base légale | Intérêt légitime, avec opposition possible |
| Données | Type d'événement ; source UTM ; plateforme ; chemin de la page ; identifiant du compte s'il est connecté ; pour la connexion et l'inscription, fournisseur et tranche d'âge |
| Code | [`frontend-web/src/lib/analytics.ts`](src:frontend-web/src/lib/analytics.ts), [`backend/src/api/analytics/analytics.services.ts`](src:backend/src/api/analytics/analytics.services.ts) |
| Destinataires | Administrateurs (tableau de bord) |
| Opposition | Bouton de la page Confidentialité du web, mémorisé sur l'appareil ; sans effet sur les événements de connexion et d'inscription enregistrés par le serveur |
| Conservation | 13 mois maximum ; purge **à mettre en place** |
| Remarque | La politique de confidentialité parle d'« événements de parcours anonymisés ». Les événements d'un utilisateur connecté portent son identifiant : ils sont pseudonymes, pas anonymes. La formulation est à corriger. |

## 7. Journal des actions d'administration

| Rubrique | Contenu |
|---|---|
| Finalité | Traçabilité des actions de la Mairie |
| Base légale | Obligation légale et intérêt légitime (contrôle interne) |
| Données | Administrateur, action (`CIRCUIT_BREAKER_PAUSE`, `CIRCUIT_BREAKER_RESUME`, `TREASURY_WITHDRAWAL_MULTISIG`, `PARTNER_APPROVED`, `PARTNER_SUSPENDED`, `EXPORT_REPORT_CSV` ou `_PDF`), horodatage, paramètres |
| Code | `recordAdminAuditLog` de [`backend/src/api/admin/admin.repo.ts`](src:backend/src/api/admin/admin.repo.ts), stocké dans la table `Analytics` avec le préfixe `ADMIN_AUDIT:` |
| Destinataires | Administrateurs (`GET /api/admin/audit-logs`) |
| Conservation | 1 an ; purge **à mettre en place** |

## 8. Emails transactionnels

| Rubrique | Contenu |
|---|---|
| Finalité | Codes de connexion, alertes de sécurité, bienvenue, confirmation de suppression RGPD, codes promo obtenus |
| Base légale | Exécution du contrat et intérêt légitime (sécurité) |
| Données | Email, contenu du message (code, adresse de portefeuille, code de parrainage, jeton de suppression) |
| Code | [`backend/src/services/email.service.ts`](src:backend/src/services/email.service.ts), file BullMQ `emails` |
| Destinataires | Fournisseur SMTP |
| Conservation | Durée de vie des tâches dans la file ; journaux limités à l'adresse masquée |

## 9. Journaux techniques

| Rubrique | Contenu |
|---|---|
| Finalité | Exploitation, diagnostic, sécurité |
| Base légale | Intérêt légitime |
| Données | Méthode et chemin de la requête (sans la chaîne de requête), code de réponse, durée, identifiant de requête, identifiant du compte connecté ajouté par le contexte de journalisation, email masqué dans les journaux d'envoi |
| Code | [`backend/src/middlewares/request-context.middleware.ts`](src:backend/src/middlewares/request-context.middleware.ts), [`backend/src/utils/logger.util.ts`](src:backend/src/utils/logger.util.ts) |
| Conservation | Selon l'hébergement ; à fixer (la CNIL recommande en général entre six mois et un an pour les journaux de sécurité, à confirmer) |

## 10. Site de l'Office de Tourisme

| Rubrique | Contenu |
|---|---|
| Finalité | Information touristique, favoris, panier et billetterie de démonstration, inscription à la newsletter |
| Traitement serveur | Aucun : le site ne transmet aucune donnée à un serveur |
| Stockage | `localStorage` du navigateur uniquement (panier, favoris, commandes de démonstration, coordonnées saisies, inscription newsletter, choix du bandeau cookies) |
| Tiers | Aucun : polices et scripts hébergés sur le site |
| Remarque | Les journaux d'accès de nginx, s'ils sont conservés par l'hébergeur, contiennent l'adresse IP des visiteurs |

## Sous-traitants

| Sous-traitant | Usage | Localisation | Contrat article 28 |
|---|---|---|---|
| Hébergeur de l'API et de la base | Hébergement | À désigner, UE exigée | À signer |
| Fournisseur SMTP | Envoi des emails | À désigner, UE exigée | À signer |
| Stockage objet S3 | Exports et visuels | UE exigée (`eu-west-3` par défaut) | À signer |
| Fournisseur RPC Ethereum | Lecture et écriture sur la chaîne | À désigner | À signer |

## Tenir le registre à jour

Toute nouvelle collecte de donnée (nouvelle colonne, nouvel événement analytique, nouveau sous-traitant) doit donner lieu à une mise à jour de ce registre dans la même pull request. La relecture du [modèle de données](../base-de-donnees/modele.md) et du [dictionnaire de données](../base-de-donnees/dictionnaire.md) permet de vérifier qu'aucune donnée n'a été oubliée.
