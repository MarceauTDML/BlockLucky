# 0002 - Redis pour les files et l'état court, avec repli en mémoire

- Statut : accepté
- Date : 2026-11-10

## Contexte

Le backend utilise Redis pour les files BullMQ (emails, ledger), le rate limiting et quelques états courts (préférences, quêtes, disjoncteur blockchain). L'environnement de développement doit fonctionner même sans Redis.

## Décision

- Une seule instance Redis en local, configurée en `maxmemory-policy noeviction` (obligatoire pour BullMQ) avec persistance AOF `everysec`.
- Toutes les clés applicatives sont préfixées `blocklucky:<environnement>:` et écrites avec un timeout de commande court (500 ms).
- Si Redis est indisponible : les lectures et écritures basculent sur une mémoire locale, les jobs sont exécutés directement dans la requête et le rate limiter laisse passer (fail-open) au lieu de bloquer l'API.
- Les jobs BullMQ ont 5 tentatives avec backoff exponentiel et jitter. Les erreurs métier (4xx) sont marquées `UnrecoverableError` pour ne pas être rejouées. Les jobs terminés sont conservés 24 h, les échecs 14 jours.

## Conséquences

- L'API reste disponible si Redis tombe, au prix d'un rate limit non partagé et d'une exécution synchrone des emails.
- En production, il faudra séparer une instance cache (éviction autorisée) d'une instance files et état (noeviction, réplica et failover). Ce n'est pas fait car aucun environnement hébergé n'existe encore.
