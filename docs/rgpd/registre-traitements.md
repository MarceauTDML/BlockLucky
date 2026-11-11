# Registre des traitements (article 30 RGPD)

Responsable de traitement : Ville d'EtherBay, Direction des Systèmes d'Information. Contact : dsi@etherbay.fr. Délégué à la protection des données : dpo@etherbay.fr.

Document de travail à valider par le DPO avant la mise en production. Il décrit les traitements tels qu'ils sont implémentés dans ce dépôt.

## 1. Gestion des comptes citoyens et de la loterie

| Rubrique | Contenu |
|---|---|
| Finalité | Inscription, connexion, participation à la Grande Loterie citoyenne, historique des tickets |
| Base légale | Exécution du contrat (conditions de participation) |
| Personnes | Citoyens majeurs (18 ans et plus, auto-déclaration) |
| Données | Email, adresse du portefeuille Ethereum intégré et sa clé privée chiffrée (AES-256-GCM), hash de la dotation de bienvenue, tranche d'âge, rôle, tickets et transactions associées, code de parrainage et parrain, préférences (thème, langue, notifications), limite de jeu responsable |
| Destinataires | Services municipaux habilités (rôle ADMIN), sous-traitants techniques ci-dessous |
| Conservation | Durée de la participation, puis anonymisation sur demande (`/api/user/gdpr/delete-request`), qui supprime l'email, le lien avec l'adresse du portefeuille et sa clé chiffrée. Les transactions déjà inscrites sur la blockchain publique ne peuvent pas être effacées : elles ne contiennent qu'une adresse pseudonyme, qui n'est plus rattachable au citoyen. Une purge automatique des comptes inactifs reste à mettre en place |
| Sécurité | Voir `docs/securite.md` |

## 2. Programme de fidélité EtherPoints et récompenses partenaires

| Rubrique | Contenu |
|---|---|
| Finalité | Attribution et échange d'EtherPoints contre des offres de commerçants d'EtherBay |
| Base légale | Exécution du contrat |
| Données | Solde et journal des points, récompenses obtenues, codes promo générés et leur utilisation |
| Destinataires | Commerçant partenaire concerné, uniquement pour ses propres codes |
| Conservation | Durée de la participation, puis anonymisation avec le compte |

## 3. Double authentification et sécurité des comptes

| Rubrique | Contenu |
|---|---|
| Finalité | Protéger l'accès aux comptes, détecter les abus |
| Base légale | Intérêt légitime (sécurité du service) |
| Données | Secret TOTP chiffré, empreintes des codes de secours, codes de connexion temporaires (10 minutes), compteurs d'échecs (1 heure), identifiants de sessions révoquées (jusqu'à leur expiration) |
| Conservation | Durées techniques indiquées ci-dessus, secret supprimé à la désactivation de la 2FA ou du compte |

## 4. Mesure d'audience et acquisition

| Rubrique | Contenu |
|---|---|
| Finalité | Statistiques de fréquentation et efficacité des campagnes (source UTM) |
| Base légale | Intérêt légitime, avec opposition possible depuis l'application (option de refus du suivi sur le web) |
| Données | Type d'événement, source UTM, plateforme, page, identifiant du compte s'il est connecté, tranche d'âge |
| Conservation | 13 mois maximum (purge automatique à mettre en place) |

## 5. Journal des actions d'administration

| Rubrique | Contenu |
|---|---|
| Finalité | Traçabilité des actions de la Mairie (tirage, trésorerie, partenaires, exports) |
| Base légale | Obligation légale et intérêt légitime (contrôle interne) |
| Données | Administrateur, action, horodatage, paramètres de l'action |
| Conservation | 1 an |

## 6. Emails transactionnels

| Rubrique | Contenu |
|---|---|
| Finalité | Codes de connexion, alertes de sécurité, bienvenue, confirmation RGPD, codes promo |
| Base légale | Exécution du contrat et intérêt légitime (sécurité) |
| Données | Email, contenu du message |

## Sous-traitants

| Sous-traitant | Usage | Localisation | Contrat article 28 |
|---|---|---|---|
| Hébergeur de l'API et de la base | À désigner | UE exigée | À signer |
| Fournisseur SMTP | Envoi des emails | UE exigée | À signer |
| Stockage objet S3 | Exports et visuels | UE exigée (`eu-west-3` par défaut) | À signer |
| Fournisseur RPC Ethereum | Lecture et écriture blockchain | À désigner | À signer |

## Droits des personnes

- Accès et portabilité : export JSON en libre-service (`GET /api/user/gdpr/export`).
- Effacement : demande en libre-service avec confirmation par email, anonymisation du compte et révocation de toutes ses sessions.
- Rectification : préférences modifiables dans le profil ; autres demandes via dpo@etherbay.fr, réponse sous un mois.

## Site de l'Office de Tourisme

Le site ne transmet aucune donnée à un serveur : panier, favoris, commandes de démonstration et inscription à la newsletter restent dans le `localStorage` du navigateur. Les polices sont hébergées sur le site (aucun appel à Google Fonts). Le bandeau cookies propose le refus en un clic.
