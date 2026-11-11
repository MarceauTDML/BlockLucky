# Décisions d'architecture

Un ADR (Architecture Decision Record) est une note courte qui consigne une décision structurante : le problème posé, la solution retenue, ce qu'elle coûte. Il répond à la question qu'un développeur qui reprend le projet se pose devant un choix surprenant : « pourquoi est-ce fait ainsi ? ». Un ADR ne décrit pas le fonctionnement détaillé du code, qui est l'objet des autres parties de cette documentation.

## Quand écrire un ADR

Une décision mérite un ADR quand elle est coûteuse à défaire ou qu'elle s'impose à tout le code. Le [workflow Git](../../contribuer/workflow-git.md#decisions-d-architecture) cite trois cas : une nouvelle dépendance d'infrastructure, un changement de découpage, un changement de contrat d'API. L'ADR est écrit avant la pull request qui implémente la décision, ou dans la même.

Exemples de décisions qui en relèvent : remplacer BullMQ, extraire un module en service, changer de réseau Ethereum, abandonner le portefeuille intégré. Exemples qui n'en relèvent pas : ajouter un endpoint, renommer une variable, monter une version mineure.

## Format MADR

Les ADR suivent une forme allégée de MADR (Markdown Architectural Decision Records) :

| Section | Contenu |
|---|---|
| Titre | `NNNN - Décision formulée en une phrase`, numéro sur quatre chiffres, attribué dans l'ordre |
| Statut et date | `accepté`, `remplacé par NNNN` ou `déprécié`, date d'acceptation |
| Contexte | Les contraintes et le problème, sans parti pris |
| Décision | Ce qui est retenu, formulé de manière vérifiable dans le code ou la configuration |
| Alternatives écartées | Les options étudiées et la raison de leur rejet (présente dans l'ADR 0004) |
| Conséquences | Ce que la décision implique, y compris ses coûts et ses limites connues |

Dans cette documentation, chaque ADR est suivi d'une section **Vérification dans le code** qui confronte la décision à l'état actuel du dépôt, avec des liens vers les fichiers. Cette section n'appartient pas à la décision : elle est mise à jour quand le code évolue, alors que la décision elle-même ne change pas.

## Règle d'immuabilité

Une décision acceptée n'est jamais réécrite. Si le contexte change :

1. Écrire un nouvel ADR avec le numéro suivant, qui expose le nouveau contexte et la nouvelle décision.
2. Passer l'ancien au statut « remplacé par NNNN », sans toucher au reste de son texte.
3. Ajouter le nouvel ADR à la page correspondante du sommaire et au tableau ci-dessous.

Cette règle garde l'historique du raisonnement. Les corrections purement formelles (lien cassé, faute de frappe) restent permises.

> [!NOTE]
> Les ADR étaient auparavant rangés dans `docs/adr/`. Leur texte est repris ici à l'identique. Le fichier de l'ADR 0004 s'appelait `0004-smart-contract-ethereum-portefeuille-integre.md` ; sa page est désormais [0004-smart-contract-portefeuille-integre.md](0004-smart-contract-portefeuille-integre.md).

## Registre des décisions

| N° | Décision | Statut | Date | Écarts constatés dans le code |
|---|---|---|---|---|
| [0001](0001-monolithe-modulaire.md) | Monolithe modulaire plutôt que microservices | accepté | 2026-11-10 | Le worker porte aussi l'indexeur, le keeper et la file `chain-actions` ; des modules importent les fichiers internes d'autres modules |
| [0002](0002-redis-files-et-repli-memoire.md) | Redis pour les files et l'état court, avec repli en mémoire | accepté | 2026-11-10 | Les échecs SMTP ne sont pas rejoués ; certaines données durables sont stockées dans Redis sans expiration |
| [0003](0003-migrations-expand-contract.md) | Migrations versionnées, exécutées une seule fois, compatibles N-1 | accepté | 2026-11-10 | La migration initiale ne commence pas par `SET lock_timeout` |
| [0004](0004-smart-contract-portefeuille-integre.md) | Smart contract Solidity sur Ethereum, tirage Chainlink VRF et portefeuille intégré | accepté | 2026-11-11 | La dotation est déclenchée dès l'inscription ; `retryDraw` n'est jamais appelée par le backend |

Le détail de chaque écart est dans la section de vérification de l'ADR concerné.

## Décisions en attente d'un ADR

Plusieurs choix du code ont la portée d'un ADR sans en avoir un. Ils sont justifiés dans [Choix techniques](../choix-techniques.md) et gagneraient à être formalisés :

- l'usage de Socket.IO sans adaptateur Redis, qui limite l'API à une instance pour les événements émis localement ;
- le portefeuille intégré comme modèle custodial, et ses conséquences pour la suppression RGPD (clé détruite, fonds restants irrécupérables) ;
- l'authentification par code envoyé par email avec une adresse de portefeuille fournie par le client.
