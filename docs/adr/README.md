# Décisions d'architecture (ADR)

Chaque décision structurante est consignée dans un fichier numéroté au format MADR (contexte, décision, conséquences). Une décision n'est jamais modifiée après acceptation : une nouvelle décision la remplace et passe l'ancienne au statut « remplacée ».

| N° | Décision | Statut |
|---|---|---|
| [0001](0001-monolithe-modulaire.md) | Monolithe modulaire plutôt que microservices | accepté |
| [0002](0002-redis-files-et-repli-memoire.md) | Redis pour les files et l'état court, avec repli en mémoire | accepté |
| [0003](0003-migrations-expand-contract.md) | Migrations versionnées, exécutées une seule fois, compatibles N-1 | accepté |
| [0004](0004-smart-contract-ethereum-portefeuille-integre.md) | Smart contract Solidity sur Ethereum, tirage Chainlink VRF et portefeuille intégré | accepté |
