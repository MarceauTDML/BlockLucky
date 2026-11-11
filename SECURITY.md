# Politique de sécurité

## Signaler une vulnérabilité

Écrivez à **securite@etherbay.fr** en décrivant la vulnérabilité, son impact et les étapes pour la reproduire. N'ouvrez pas d'issue publique sur GitHub.

Nos engagements :

- accusé de réception sous 3 jours ouvrés ;
- première analyse et niveau de gravité communiqués sous 10 jours ouvrés ;
- correction des failles critiques sous 7 jours et des failles élevées sous 30 jours ;
- aucune poursuite contre un chercheur de bonne foi qui respecte le périmètre ci-dessous, ne consulte pas plus de données que nécessaire et ne dégrade pas le service.

Le contact est aussi publié dans `/.well-known/security.txt` (RFC 9116) sur le frontend web et le site de l'Office de Tourisme.

## Périmètre

| Inclus | Exclus |
|---|---|
| Smart contracts `smart-contract/` (fonds des joueurs, tirage, rôles) | Attaques par déni de service volumétrique |
| API `backend/` (authentification, autorisations, webhooks, EtherPoints, portefeuilles intégrés) | |
| Frontend web `frontend-web/` | Ingénierie sociale des équipes de la Ville d'EtherBay |
| Application mobile `mobile-app/` | Valeurs de développement documentées dans `.env.example` (refusées en production) |
| Site `frontend-office-tourisme/` | Paiement de démonstration du site de l'Office de Tourisme (aucune donnée bancaire n'est collectée) |

## Versions maintenues

Seule la dernière version de la branche `main` reçoit des correctifs de sécurité.

## Mesures en place

Le détail des protections (authentification, sessions, autorisations, en-têtes, chaîne logicielle, smart contracts) et la matrice des droits sont décrits dans la partie [Sécurité](https://docs.etherbay.tech/securite/menaces.html) de la documentation officielle. La procédure à suivre en cas d'incident est dans [Réponse aux incidents](https://docs.etherbay.tech/infrastructure/incidents.html).
