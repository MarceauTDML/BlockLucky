# Sécurité du navigateur

Le frontend web ne détient aucun secret : pas de clé privée, pas de clé d'API, seulement le jeton de session de l'utilisateur. Sa sécurité tient en trois points : des en-têtes HTTP qui limitent ce que le navigateur accepte de charger et d'afficher, une hygiène du code qui évite les injections et les redirections ouvertes, et un build qui ne publie ni secret ni source map. Le modèle de menaces global est dans [Modèle de menaces](../securite/menaces.md) et la comparaison avec le mobile dans [Navigateur et mobile](../securite/navigateur-mobile.md).

## En-têtes HTTP

Tous les en-têtes sont définis dans la fonction `headers()` de [`frontend-web/next.config.mjs`](src:frontend-web/next.config.mjs) et appliqués à toutes les routes (`source: '/:path*'`). Next.js les envoie aussi bien avec `next start` qu'avec le serveur standalone de l'image Docker.

| En-tête | Valeur | Effet |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Le navigateur respecte le type MIME déclaré |
| `X-Frame-Options` | `DENY` | Interdit l'affichage du site dans un cadre (anti clickjacking), doublé par `frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Seule l'origine est transmise aux autres sites, rien en passant de HTTPS à HTTP |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | Désactive ces API pour le site et les éventuels cadres |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Impose HTTPS pendant deux ans sur le domaine et ses sous-domaines |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isole la fenêtre des pages ouvertes depuis d'autres origines |
| `Content-Security-Policy` | voir ci-dessous | Uniquement si `NODE_ENV === 'production'` |

Deux autres réglages complètent la liste :

| Réglage | Valeur | Effet |
|---|---|---|
| `poweredByHeader` | `false` | Supprime l'en-tête `X-Powered-By: Next.js` |
| `productionBrowserSourceMaps` | `false` | Aucune source map publique en production |
| `Cache-Control` sur `/_next/static/:path*` | `public, max-age=31536000, immutable` | Les fichiers à empreinte sont mis en cache un an |

`Strict-Transport-Security` est envoyé même en développement sur `http://localhost` ; les navigateurs l'ignorent sur une connexion non chiffrée, il ne gêne donc pas le travail local. En production, il ne protège que si le site est réellement servi en HTTPS par le proxy (voir [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md)).

## Politique de sécurité du contenu

La CSP est construite à partir des deux variables publiques. `originOf` extrait l'origine de `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL` (repli sur `localhost:2053`), puis `toWebSocket` en déduit les variantes `ws:` ou `wss:`.

Avec les valeurs par défaut, la politique produite est :

```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https: http://localhost:2053;
font-src 'self' data:;
connect-src 'self' http://localhost:2053 ws://localhost:2053;
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
form-action 'self';
manifest-src 'self';
worker-src 'self' blob:
```

| Directive | Raison |
|---|---|
| `script-src 'self' 'unsafe-inline'` | Next.js injecte des scripts inline d'hydratation, et le layout racine injecte `themeInitScript` ; aucun nonce n'est généré |
| `style-src 'self' 'unsafe-inline'` | Styles inline de React (`style=`) et de Next.js |
| `img-src ... https: <origine de l'API>` | Images servies par l'API (visuels POAP, QR codes en `data:`) et logos de partenaires sur n'importe quel hôte HTTPS |
| `connect-src` | Seuls l'API et le serveur Socket.IO sont joignables par `fetch` et WebSocket |
| `object-src 'none'`, `base-uri 'none'` | Pas de plugin, pas de changement de base des URL |
| `form-action 'self'` | Les formulaires ne peuvent pas être soumis ailleurs |
| `upgrade-insecure-requests` | Ajouté seulement si l'API est en `https:` |

En production, avec `NEXT_PUBLIC_API_URL=https://api.etherbay.tech/api` par exemple, `connect-src` contient `https://api.etherbay.tech` et `wss://api.etherbay.tech`, et `upgrade-insecure-requests` est ajouté.

> [!WARNING]
> `'unsafe-inline'` dans `script-src` affaiblit nettement la CSP : une injection HTML qui insère un `<script>` serait exécutée. Comme le jeton de session est dans `localStorage`, une XSS permettrait de le lire. La protection repose donc surtout sur React, qui échappe tout texte par défaut. Passer à une CSP à nonce (middleware Next.js qui génère un nonce par requête et le transmet aux scripts) est l'amélioration prioritaire.

La CSP n'est pas envoyée en développement, pour ne pas gêner le rechargement à chaud de Next.js. Pour la tester, il faut un build de production (`npm run build` puis `npm run start`).

> [!IMPORTANT]
> Les variables `NEXT_PUBLIC_*` sont lues au moment du build. Une image Docker construite avec `http://localhost:2053/api` gardera cette origine dans sa CSP même si l'API est déployée ailleurs : le navigateur bloquera alors tous les appels. Il faut passer les bonnes valeurs en `--build-arg`.

## Hygiène du code

| Risque | Mesure | Fichier |
|---|---|---|
| Injection de HTML | Aucun `dangerouslySetInnerHTML` dans les pages ; le seul usage est `themeInitScript`, une chaîne constante sans donnée utilisateur | [`layout.tsx`](src:frontend-web/src/app/layout.tsx) |
| Rapport imprimable | Chaque valeur passe par `escapeHtml` avant `document.write` | [`download.ts`](src:frontend-web/src/lib/download.ts) |
| Export CSV de l'audit | `csvCell` encadre chaque cellule de guillemets et double les guillemets internes. Il ne neutralise pas les cellules qui commencent par `=`, `+`, `-` ou `@` : une valeur de métadonnée piégée pourrait être interprétée comme formule par un tableur | [`mairie/audit/page.tsx`](src:frontend-web/src/app/mairie/audit/page.tsx) |
| Redirection ouverte | `safeInternalPath` n'accepte qu'un chemin interne pour `next` et refuse `//`, `/\`, `/connexion`, `/invite` | [`navigation.ts`](src:frontend-web/src/lib/navigation.ts) |
| Liens externes | `target="_blank"` toujours accompagné de `rel="noopener noreferrer"` (explorateur, Etherscan, partage) | composants de loterie, `LinkButton` |
| Paramètres d'URL | `utm_source` filtré par une expression régulière, code de parrainage limité à 4 à 64 caractères `[a-z0-9-]` | [`analytics.ts`](src:frontend-web/src/lib/analytics.ts), [`invite/[code]/page.tsx`](src:frontend-web/src/app/invite/[code]/page.tsx) |
| Accès à `localStorage` | Toutes les lectures et écritures sont dans des `try/catch` (navigation privée, stockage plein) | [`storage.ts`](src:frontend-web/src/lib/storage.ts) |
| Données sensibles dans l'URL | Aucun email ni jeton dans les paramètres ; le code de parrainage est la seule donnée de chemin | |
| Double soumission | Boutons désactivés pendant la requête | [`Button.tsx`](src:frontend-web/src/components/ui/Button.tsx) |

Le contrôle d'accès du navigateur (`RequireRole`) n'est pas une barrière de sécurité : il masque des écrans, le backend vérifie chaque requête (voir [Authentification et routes protégées](authentification.md#garde-des-routes)).

## Stockage dans le navigateur

| Donnée | Stockage | Sensibilité |
|---|---|---|
| Jeton JWT | `localStorage` `bl.auth.token` | Élevée : donne accès au compte pendant sa durée de vie (12 h par défaut), révocable par la déconnexion |
| Profil | `localStorage` `bl.auth.user` | Moyenne : email, adresse, rôle, solde de points |
| Dernier code obtenu | `localStorage` `bl.marketplace.lastClaim` | Moyenne : code promo utilisable en caisse ; effacé à la déconnexion |
| Préférences, source UTM, parrainage, opposition, établissement choisi | `localStorage` `bl.*` | Faible |

Aucun cookie n'est posé par le frontend. L'absence de cookie supprime le risque CSRF sur l'API, au prix d'une exposition du jeton à une éventuelle XSS. Ce compromis est discuté dans [Sessions](../securite/sessions.md).

## Contrôles de la CI

Le job « Frontend web » de [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) vérifie, après le build :

- qu'aucune dépendance de production n'a de vulnérabilité haute ou critique (`npm audit --omit=dev --audit-level=high`) ;
- que `.next/static` ne contient aucun motif de secret (`sk_live_`, clé AWS, en-tête de clé privée, clé privée par défaut du premier compte Hardhat) ;
- qu'aucun fichier `.map` n'est publié dans `.next/static`.

L'image Docker est ensuite analysée par Trivy dans le job des images (voir [Intégration continue](../infrastructure/ci.md)).

## Signalement

[`frontend-web/public/.well-known/security.txt`](src:frontend-web/public/.well-known/security.txt) est servi à `/.well-known/security.txt`. Il indique le contact `securite@etherbay.fr`, une expiration au 10 novembre 2027, les langues `fr` et `en` et un lien vers `SECURITY.md` sur GitHub. La procédure est décrite dans [Signaler une vulnérabilité](../securite/signalement.md).
