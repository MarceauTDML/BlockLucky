# Règlement de participation

Cette page reproduit le règlement de participation publié sur le web à l'adresse `/reglement` ([`frontend-web/src/app/reglement/page.tsx`](src:frontend-web/src/app/reglement/page.tsx)) et dans l'application mobile, écran Informations légales ([`mobile-app/src/screens/settings/LegalScreen.tsx`](src:mobile-app/src/screens/settings/LegalScreen.tsx)). Le texte est tiré du dossier juridique de l'équipe, adapté au code actuel. Sa source unique est le module de contenu [`frontend-web/src/content/legal.ts`](src:frontend-web/src/content/legal.ts), dupliqué à l'identique dans [`mobile-app/src/content/legal.ts`](src:mobile-app/src/content/legal.ts) : toute modification doit être reportée dans les deux fichiers et dans cette page. Il ne constitue pas un avis juridique.

## Ce qui a changé par rapport au dossier

| Point du dossier | Texte publié | Raison |
|---|---|---|
| « Plafond de tickets par participant » et « plusieurs tickets confirmés » | Un seul ticket par participant et par tirage | `maxTicketsPerPlayer` vaut 1 par défaut dans les scripts de déploiement et l'API refuse toute quantité différente de 1 (`buyTicketSchema`) |
| Majorité simplement confirmée | Âge vérifié par un agent de la Mairie à partir de la pièce d'identité | Middleware `requireAgeVerification` sur l'achat, le cadeau, l'échange et le ticket à gratter |
| Champs entre crochets | Valeurs du scénario fictif | Voir [Valeurs retenues](#valeurs-retenues) |
| Absence de mention du jeu responsable | Rappel du numéro de Joueurs Info Service | Contenu repris de l'ancienne page `/mentions-legales` |

## Texte publié

Version du 12 novembre 2026.

### Organisateur et période

Le tirage BlockLucky est organisé par la Ville d'EtherBay (collectivité fictive du scénario pédagogique), 1 place de la Mairie, 00000 EtherBay, joignable à support@etherbay.fr, dans le cadre du prototype pédagogique d'EtherBay.

La participation est réservée aux personnes d'au moins 18 ans qui disposent d'un compte et dont l'âge a été vérifié par un agent de la Mairie à partir de leur pièce d'identité. La fiche de chaque tour affiche les heures d'ouverture et de clôture, le fuseau horaire, le prix d'un ticket en ETH de test, le seuil minimum et la capacité maximale.

### Gratuité

La participation est gratuite. Le ticket est payé avec des ETH de test issus de la dotation de bienvenue offerte à l'inscription. Aucun achat, aucune mise d'argent et aucune conversion en euros ne sont possibles.

### Comment obtenir un ticket

Chaque participant peut obtenir un seul ticket par tirage. Le ticket est acquis avec des ETH de test issus de la dotation gratuite. Les frais du réseau de test, lorsqu'ils s'appliquent, sont débités en unités de test.

Le ticket confirmé donne une chance au tirage. Le système l'attribue automatiquement, sans choix de numéro. Vérifiez sa confirmation dans votre historique. Si l'option cadeau est proposée, le ticket offert compte pour le bénéficiaire, dans la limite d'un ticket par personne, et un éventuel remboursement revient au portefeuille qui l'a financé.

### Clôture et résultat

Lorsque la capacité du tour est atteinte, le tirage peut être lancé avant l'heure prévue. À l'échéance, le tirage a lieu si le seuil minimum est atteint. En dessous de ce seuil, le tour est annulé.

Un seul ticket confirmé est sélectionné. Chaque participant détenant un ticket, chacun a la même chance. La page du tirage affiche le résultat après confirmation, avec l'adresse du portefeuille gagnant sous forme abrégée.

### Cagnotte

Le gagnant reçoit les ETH de test accumulés au titre du tour, après déduction de la part de l'organisateur affichée dans la fiche. Le versement est lancé automatiquement et peut rester en attente de confirmation. La cagnotte est fictive, sans valeur monétaire et sans conversion en euros. Les offres partenaires se consultent séparément dans le catalogue.

### Annulation et remboursement

Lorsqu'un tour est annulé, le montant du ticket est remboursable en ETH de test au portefeuille qui l'a financé. Les frais réseau déjà consommés ne font pas partie du remboursement.

BlockLucky tente de verser automatiquement les remboursements aux portefeuilles intégrés éligibles. Un incident technique peut retarder la confirmation. Consultez l'état du tour avant de contacter l'assistance.

### Incident ou réclamation

Un opérateur habilité peut suspendre le service, annuler un tour ou relancer une demande d'aléa après un délai technique. Les changements d'état sont visibles dans l'interface et, selon le réseau, dans le registre du contrat.

Pour une réclamation, écrivez à support@etherbay.fr en indiquant le tour et, si disponible, la référence de transaction.

### Jeu responsable

Le prototype limite la participation à un ticket par personne et par tirage. Si les jeux deviennent une difficulté pour vous ou un proche, Joueurs Info Service répond au 09 74 75 13 13 (appel non surtaxé).

## Paramètres du code à relire avant la soutenance

Les valeurs ci-dessous sont des valeurs par défaut du dépôt. Le règlement renvoie à la fiche du tour, qui doit afficher la configuration effective du contrat déployé.

| Paramètre | Valeur par défaut | Source |
|---|---|---|
| Prix d'un ticket | 0,01 ETH de test | `TICKET_PRICE_WEI`, [`smart-contract/scripts/lib/deployment.ts`](src:smart-contract/scripts/lib/deployment.ts) |
| Tickets par participant | 1 | `MAX_TICKETS_PER_PLAYER` |
| Seuil minimum | 2 tickets | `MIN_TICKETS_TO_DRAW` |
| Capacité | 10 000 tickets | `MAX_TICKETS` |
| Part de l'organisateur | 10 % (plafonnée à 20 % par le contrat) | `MUNICIPALITY_FEE_BPS` |
| Durée d'un tour | 30 minutes en local, 48 heures pour le script Sepolia | `deploy-local.ts`, `deploy-sepolia.ts` |
| Dotation de bienvenue | 0,5 ETH de test | `WELCOME_GRANT_WEI`, [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) |

## Valeurs retenues

Les crochets du dossier ont été remplacés par les valeurs du scénario fictif. Elles sont à confirmer par l'équipe.

| Champ | Valeur |
|---|---|
| Entité organisatrice | Ville d'EtherBay (collectivité fictive du scénario pédagogique) |
| Adresse | 1 place de la Mairie, 00000 EtherBay |
| Contact assistance et réclamations | support@etherbay.fr (valeur par défaut de `SUPPORT_EMAIL`) |
| Date de version | 12 novembre 2026 |

Les autres textes publics (conditions générales d'utilisation, mentions légales, politique de confidentialité, politique relative aux traceurs, charte de transparence) utilisent les mêmes valeurs. Leur inventaire figure dans [Cookies, mentions et CGU](cookies-mentions.md) ; l'analyse d'impact est dans [AIPD](aipd.md).
