# Ajouter une variable d'environnement

Toute la configuration du backend passe par un schéma Zod unique, [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts), validé au démarrage. Une valeur invalide arrête le processus avec la liste des erreurs, avant qu'aucune connexion ne soit ouverte. Ce guide ajoute une variable de bout en bout : schéma, `.env.example`, contrôle `env:check`, utilisation, Compose et documentation.

L'exemple rend configurable le bonus d'EtherPoints crédité à la création d'un compte. Il est aujourd'hui codé en dur à 25 dans [`auth.services.ts`](src:backend/src/api/auth/auth.services.ts), et utilisé par `welcomeNewAccount` :

```typescript
const WELCOME_POINTS = 25;
```

## Fichiers à toucher

| Fichier | Modification |
| --- | --- |
| [`backend/src/config/env.config.ts`](src:backend/src/config/env.config.ts) | Déclaration, type, valeur par défaut, contraintes, règle de production éventuelle |
| [`backend/.env.example`](src:backend/.env.example) | Ligne d'exemple |
| Code qui utilise la valeur | Ici [`auth.services.ts`](src:backend/src/api/auth/auth.services.ts) |
| [`docker-compose.yml`](src:docker-compose.yml) | Valeur pour la stack conteneurisée, si elle diffère du défaut |
| [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) | Valeur pour la CI, si elle diffère du défaut |
| [`documentation-officielle/content/_data/variables.json`](src:documentation-officielle/content/_data/variables.json) | Catégorie et description |

## 1. Déclarer la variable dans le schéma

Ajouter une ligne dans l'objet passé à `z.object({...})`, près des variables de même domaine :

```typescript
    WELCOME_POINTS: z.coerce.number().int().min(0).max(500).default(25),
```

> [!IMPORTANT]
> La ligne doit commencer par exactement quatre espaces, suivis du nom en majuscules et de deux-points. `npm run env:check` ([`scripts/check-env-example.mjs`](src:backend/scripts/check-env-example.mjs)) et le générateur de la page [Variables d'environnement](../backend/variables-environnement.md) trouvent les variables avec cette forme. Une variable déclarée autrement serait invisible pour les deux.

Les constructions disponibles, toutes déjà utilisées dans le schéma :

| Besoin | Expression | Exemple existant |
| --- | --- | --- |
| Entier | `z.coerce.number().int().positive().default(n)` | `PORT`, `DB_POOL_MAX` |
| Entier borné | `z.coerce.number().int().min(a).max(b).default(n)` | `CHAIN_CONFIRMATIONS` (0 à 64) |
| Booléen | `booleanFromEnv(false)`, qui accepte `true`, `false`, `1`, `0` | `MAINTENANCE_MODE`, `RUN_WORKERS` |
| Liste séparée par des virgules | `csvList('a,b')`, transformée en tableau | `CORS_ORIGINS` |
| Énumération | `z.enum(['onchain', 'simulated']).default('onchain')` | `BLOCKCHAIN_MODE` |
| URL | `z.string().url().default('...')` | `RPC_URL`, `FRONTEND_URL` |
| Format imposé | `z.string().regex(/.../, 'message').default('...')` | `ENCRYPTION_KEY`, `LOTTERY_CONTRACT_ADDRESS` |
| Facultative | `.optional()` | `LOG_LEVEL` |

Une variable vide dans l'environnement (`WELCOME_POINTS=`) n'est pas « absente » : Zod reçoit une chaîne vide, que `z.coerce.number()` convertit en `0`, accepté ici par `min(0)` : le bonus serait silencieusement supprimé. Le défaut ne s'applique que si la variable n'existe pas. Pour refuser ce cas, borner par `min(1)`.

Le type TypeScript est déduit du schéma (`export type Env = z.infer<typeof envSchema>`) : `env.WELCOME_POINTS` est un `number` partout, sans conversion.

### Secret ou règle de production

Pour un secret, la valeur de développement est déclarée dans `DEV_DEFAULTS` et utilisée comme défaut ; le `superRefine` final refuse automatiquement de démarrer en production si elle est restée :

```typescript
const DEV_DEFAULTS = {
  JWT_SECRET: 'etherbay-super-secret-jwt-key-2026',
  NOUVEAU_SECRET: 'valeur-publique-de-developpement',
} as const;
```

```typescript
    NOUVEAU_SECRET: z.string().min(32).default(DEV_DEFAULTS.NOUVEAU_SECRET),
```

Une règle propre à la production s'ajoute dans le `superRefine`, après le test `if (values.NODE_ENV !== 'production') return;`, sur le modèle de `METRICS_TOKEN` :

```typescript
if (values.WELCOME_POINTS > 100) {
  ctx.addIssue({
    code: 'custom',
    path: ['WELCOME_POINTS'],
    message: 'WELCOME_POINTS ne peut pas dépasser 100 en production (équilibre du catalogue partenaire)',
  });
}
```

Une valeur publique de développement ajoutée à `DEV_DEFAULTS` doit aussi être ajoutée à la liste blanche de [`.gitleaks.toml`](src:.gitleaks.toml) si gitleaks la prend pour un secret.

## 2. Ajouter la ligne d'exemple

Dans [`backend/.env.example`](src:backend/.env.example), qui sert de modèle au `.env` de chaque développeur (`cp .env.example .env`) :

```ini
WELCOME_POINTS=25
```

Puis vérifier la synchronisation, depuis `backend/` :

```bash
npm run env:check
```

```text
.env.example synchronisé avec le schéma (60 variables)
```

Le script compare les deux listes et échoue dans les deux sens : variable du schéma absente de l'exemple, ou variable de l'exemple inconnue du schéma. La CI le lance dans le job `backend`.

> [!NOTE]
> Les développeurs qui ont déjà un `.env` ne reçoivent pas la nouvelle ligne : leur backend utilise le défaut du schéma. Une variable sans défaut, donc obligatoire, doit être annoncée dans la description de la pull request.

## 3. Utiliser la valeur

Importer `env`, jamais `process.env` hors de `src/config/` :

```typescript
import { env } from '../../config/env.config';
```

`auth.services.ts` importe déjà `env`. Supprimer la constante `WELCOME_POINTS` et lire la variable à sa place :

```typescript
await ledgerService.creditPoints(user.id, env.WELCOME_POINTS, 'SOCIAL_QUEST', 'Bonus de bienvenue Onboarding EtherBay');
```

Le test d'[`auth.test.ts`](src:backend/__tests__/api/auth.test.ts) qui attend les 25 points de bienvenue reste vert tant que le défaut ne change pas.

La valeur est lue une fois au démarrage : la changer demande de redémarrer l'API et le worker.

## 4. Compose et CI

| Fichier | Quand le modifier |
| --- | --- |
| [`docker-compose.yml`](src:docker-compose.yml), ancre `x-backend-env` | La stack conteneurisée a besoin d'une valeur différente du défaut. Un secret s'y écrit `NOM: ${NOM:-}`, pour être fourni par l'environnement de l'hôte |
| [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml), bloc `env` des jobs `backend` ou `chain` | Les tests ont besoin d'une valeur précise |
| [`backend/__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts) | Tous les tests unitaires doivent tourner avec une valeur fixe |

Le service `backend` et le service `worker` de Compose partagent `x-backend-env` : une variable lue par les deux processus n'est à écrire qu'une fois.

## 5. Documenter

Ajouter l'entrée dans [`variables.json`](src:documentation-officielle/content/_data/variables.json), avec une catégorie existante (`Serveur HTTP`, `Observabilité`, `Base de données`, `Redis`, `Sécurité et sessions`, `Email`, `Blockchain`, `Workers`, `Stockage S3`, `Frontend et CORS`, `Fonctionnalités`) :

```json
{
  "WELCOME_POINTS": {
    "categorie": "Fonctionnalités",
    "description": "EtherPoints crédités une fois à la création d'un compte, en plus de la dotation de bienvenue en ETH de test (25 par défaut)."
  }
}
```

Puis régénérer, depuis `documentation-officielle/` :

```bash
npm run build
```

Le type, la valeur par défaut, les contraintes et la règle de production éventuelle sont lus dans le schéma et affichés automatiquement. Seules la catégorie et la description sont écrites à la main. La construction signale une variable du code sans description, et une description dont la variable n'existe plus (« Variable décrite mais absente du code »).

## Variables des frontends

Les frontends n'ont pas de schéma : leurs variables sont lues une fois dans un fichier de configuration.

| Projet | Préfixe obligatoire | Fichier qui les lit | Exemple | Quand la valeur est figée |
| --- | --- | --- | --- | --- |
| Frontend web | `NEXT_PUBLIC_` | [`frontend-web/src/lib/config.ts`](src:frontend-web/src/lib/config.ts) | [`frontend-web/.env.example`](src:frontend-web/.env.example) | Au build : passer la valeur en argument `ARG` du [`Dockerfile`](src:frontend-web/Dockerfile) et en `build.args` du service `web` de Compose |
| Mobile | `EXPO_PUBLIC_` | [`mobile-app/src/services/api.client.ts`](src:mobile-app/src/services/api.client.ts) et les services qui en ont besoin | [`mobile-app/.env.example`](src:mobile-app/.env.example) | Au build de l'application |

> [!CAUTION]
> Une variable `NEXT_PUBLIC_*` ou `EXPO_PUBLIC_*` est copiée en clair dans le JavaScript livré au navigateur ou dans l'application. Elle ne doit jamais contenir de secret. La CI recherche les formes de secrets connues dans `.next/static`, mais ne peut pas tout détecter.

## Liste de contrôle

- [ ] Ligne du schéma à quatre espaces d'indentation, avec type, bornes et défaut.
- [ ] Secret : valeur de développement dans `DEV_DEFAULTS`, refus automatique en production.
- [ ] Ligne dans `backend/.env.example`, `npm run env:check` vert.
- [ ] Code qui lit `env.NOM`, jamais `process.env.NOM`.
- [ ] Compose, CI et `setup-env.ts` mis à jour si nécessaire.
- [ ] Entrée dans `variables.json`, documentation régénérée.
- [ ] Pull request : variable annoncée dans « Changements » et case `.env.example` cochée.
