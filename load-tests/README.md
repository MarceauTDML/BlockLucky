# Tests de charge k6

Scénarios versionnés pour mesurer la capacité de l'API BlockLucky. Les seuils (`thresholds`) font échouer le test si les objectifs de latence et d'erreurs ne sont pas tenus.

| Script | Profil | Usage |
|---|---|---|
| `smoke.js` | 2 utilisateurs, 30 s | Vérification rapide après un déploiement |
| `load.js` (`PROFILE=load`) | 30 req/s pendant 3 min | Charge nominale |
| `load.js` (`PROFILE=stress`) | jusqu'à 300 req/s | Recherche du point de rupture |
| `load.js` (`PROFILE=spike`) | pic soudain ×10 | Résistance à un pic (annonce du tirage) |
| `load.js` (`PROFILE=soak`) | 20 req/s pendant 4 h | Détection de fuites mémoire |

Le modèle de charge est ouvert (`arrival-rate`) : le débit est imposé, quel que soit le temps de réponse de l'API.

## Lancer un test

Sans installer k6, avec Docker :

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:2053 grafana/k6 run - < load-tests/smoke.js
```

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:2053 -e PROFILE=stress grafana/k6 run - < load-tests/load.js
```

Le rate limiter global (300 requêtes / 15 min par IP) bloque rapidement un test lancé depuis une seule machine. Pour un test de capacité, lancer l'API avec une limite relevée dans un environnement dédié, jamais contre la production sans prévenir.

Pendant le test, suivre `/metrics` (latence par route, event loop, mémoire) et `pg_stat_statements` côté PostgreSQL.
