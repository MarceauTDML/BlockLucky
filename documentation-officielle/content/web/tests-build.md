# Tests et build

Cette page couvre la vérification du frontend web (lint, types, tests unitaires), la construction de l'application et l'image Docker qui la sert. Les commandes s'exécutent depuis `frontend-web/` après `npm ci`. La stratégie de test de l'ensemble du dépôt est dans [Tests et qualité](../contribuer/tests-qualite.md).

## Vérifications statiques

| Commande | Outil | Configuration |
|---|---|---|
| `npm run lint` | ESLint 10 | [`eslint.config.mjs`](src:frontend-web/eslint.config.mjs) : règles `eslint-config-next/core-web-vitals` et `eslint-config-next/typescript`, règle `@next/next/no-img-element` désactivée (les QR codes en `data:` et les visuels POAP sont des `<img>`), dossiers `.next`, `node_modules` et `coverage` ignorés |
| `npm run typecheck` | `tsc --noEmit` | [`tsconfig.json`](src:frontend-web/tsconfig.json) : `strict`, cible ES2022, résolution `bundler`, alias `@/*` vers `src/*`, types globaux de Vitest et de jest-dom |

## Tests unitaires

Les tests utilisent Vitest 5 avec l'environnement `jsdom`, React Testing Library et les assertions de `@testing-library/jest-dom`. La configuration est dans [`vitest.config.mts`](src:frontend-web/vitest.config.mts) :

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
});
```

[`vitest.setup.ts`](src:frontend-web/vitest.setup.ts) importe seulement `@testing-library/jest-dom/vitest`. Les fonctions `describe`, `it`, `expect` et `vi` sont globales.

```bash
npm test
npm run test:watch
```

### Ce qui est couvert

[`frontend-web/__tests__/lib.test.ts`](src:frontend-web/__tests__/lib.test.ts) teste les fonctions pures de `src/lib` :

| Bloc | Vérifie |
|---|---|
| `wallet déterministe` | L'adresse calculée fait 42 caractères, ne dépend ni de la casse ni des espaces, et diffère selon l'email |
| `formatters` | `shortenWallet`, `formatEth`, `formatPercentage` |
| `validators` | `isValidEmail`, `isValidOtpCode` |
| `safeInternalPath (anti open-redirect)` | Seuls les chemins internes sont acceptés |
| `parseCodes (upload CSV partenaire)` | En-tête ignoré, doublons retirés, valeurs invalides rejetées |
| `attribution UTM` | Capture d'une source valide et rejet des valeurs suspectes |

[`frontend-web/__tests__/components.test.tsx`](src:frontend-web/__tests__/components.test.tsx) teste quatre composants, avec `next/navigation` simulé par `vi.mock` :

| Bloc | Vérifie |
|---|---|
| `Button` | Un bouton en chargement est désactivé, porte `aria-busy` et n'appelle pas `onClick` |
| `ProgressBar` | La jauge expose sa valeur aux technologies d'assistance |
| `BarList` | Un tableau équivalent est fourni aux lecteurs d'écran |
| `RequireRole` | Écran 403 pour un citoyen, accès pour un administrateur, avec un store Redux préchargé |

> [!NOTE]
> Le test « reste identique à l'algorithme mobile (valeur de référence) » compare la fonction à elle-même et ne contient aucune valeur de référence. Il ne détecterait pas une divergence avec le mobile. Cette fonction n'a d'ailleurs plus d'effet sur le portefeuille réel (voir [Authentification](authentification.md#adresse-calculee-cote-client)).

### Ce qui n'est pas couvert

Aucun test ne porte sur les pages, les hooks (`useAuth`, `useBlockLuckyWallet`, `useSocket`), les endpoints RTK Query ni la table des erreurs de transaction. Il n'y a pas de test de bout en bout (Playwright ou Cypress), ni de mesure de couverture. Les parcours sont vérifiés à la main contre un backend local, avec les comptes du seed (voir [Comptes de démonstration et connexion](../demarrage/comptes-et-connexion.md)). Les priorités raisonnables pour un repreneur sont `getErrorMessage`, `notifyChainError` et le parcours de connexion avec code.

## Build Next.js

```bash
npm run build
npm run start
```

`npm run build` produit `.next/`. Toutes les pages sont des composants client : les pages sans segment dynamique sont prérendues en HTML avec l'état initial (session non hydratée, thème clair, français), `/invite/[code]` et `/boutique/[rewardId]` sont rendues à la demande, puis le navigateur prend le relais et appelle l'API.

Les points d'attention :

| Élément | Comportement |
|---|---|
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` | Lus au build et intégrés au JavaScript et à la CSP ; à fournir avant `npm run build` |
| `NEXT_OUTPUT=standalone` | Si présent, `output: 'standalone'` : Next.js copie dans `.next/standalone` un `server.js` et les seules dépendances nécessaires |
| `productionBrowserSourceMaps: false` | Aucune source map servie au navigateur |
| `NEXT_TELEMETRY_DISABLED=1` | Positionné dans la CI et dans l'image pour couper la télémétrie de Next.js |

La CSP n'est active qu'avec `NODE_ENV=production`, ce que fait `next start`. Pour vérifier les en-têtes en local, lancer `npm run build` puis `npm run start` et inspecter les réponses (voir [Sécurité du navigateur](securite-navigateur.md)).

## Image Docker

[`frontend-web/Dockerfile`](src:frontend-web/Dockerfile) construit l'image en quatre étapes à partir de `node:22-bookworm-slim` (surchargeable par `NODE_IMAGE`) :

| Étape | Contenu |
|---|---|
| `base` | Dossier `/app`, télémétrie Next.js et messages npm désactivés |
| `deps` | `npm ci` à partir de `package.json` et `package-lock.json`, avec un cache BuildKit pour `/root/.npm` |
| `build` | Arguments `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL`, `NEXT_OUTPUT=standalone`, copie des sources et `npm run build` |
| `runtime` | Copie de `.next/standalone`, `.next/static` et `public` avec le propriétaire `node`, exécution en utilisateur `node` |

L'étape finale fixe `NODE_ENV=production`, `PORT=3000` et `HOSTNAME=0.0.0.0`, expose le port 3000 et lance `node server.js`. Un `HEALTHCHECK` toutes les 15 secondes appelle `http://127.0.0.1:3000/` avec `fetch` et considère le conteneur sain si le statut est inférieur à 500.

[`.dockerignore`](src:frontend-web/.dockerignore) exclut `node_modules`, `.next`, `out`, `coverage`, les fichiers `.env*` (sauf `.env.example`), les journaux, `.git`, le Dockerfile et `__tests__`. Les tests ne sont donc pas exécutés dans l'image : ils le sont par la CI.

Construction manuelle, avec l'URL de l'API visée :

```bash
docker build -t blocklucky-web --build-arg NEXT_PUBLIC_API_URL=https://api.example.org/api --build-arg NEXT_PUBLIC_WS_URL=https://api.example.org frontend-web
```

Dans [`docker-compose.yml`](src:docker-compose.yml), le service `web` appartient au profil `app`, construit l'image avec `http://localhost:2053/api` et `http://localhost:2053`, publie le port 3000, monte `/tmp` et `/app/.next/cache` en `tmpfs`, reprend le bloc de durcissement commun et attend que le service `backend` soit sain. La stack complète est décrite dans [Stack complète en conteneurs](../demarrage/stack-conteneurs.md) et les images dans [Images Docker](../infrastructure/images.md).

## Intégration continue

Le job « Frontend web (lint, typecheck, tests, build) » de [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) ne s'exécute que si `frontend-web/**` ou le workflow a changé. Il enchaîne :

1. `npm ci` avec la version de Node.js de `.nvmrc` ;
2. `npm audit --omit=dev --audit-level=high` ;
3. `npm run lint`, `npm run typecheck`, `npm test` ;
4. restauration du cache `.next/cache`, puis `npm run build` ;
5. recherche de secrets et de source maps dans `.next/static`.

L'image est construite à part, sans être poussée, dans le job des images, puis analysée par Trivy. Le détail des jobs est dans [Intégration continue](../infrastructure/ci.md).

## Avant de livrer une modification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Ces quatre commandes reproduisent la CI. Si la modification touche les en-têtes ou l'URL de l'API, ajouter un `npm run start` et vérifier dans le navigateur que la CSP ne bloque aucun appel.
