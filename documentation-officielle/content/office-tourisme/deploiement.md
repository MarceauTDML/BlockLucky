# Servir et déployer

Le site est un dossier de fichiers statiques. Il peut être servi par n'importe quel serveur HTTP, mais deux configurations sont versionnées : le serveur de développement `serve` piloté par [`serve.json`](src:frontend-office-tourisme/serve.json), et une image Docker nginx décrite par le [`Dockerfile`](src:frontend-office-tourisme/Dockerfile) et le dossier [`docker/`](src:frontend-office-tourisme/docker/).

## Servir en local

Depuis le dossier du site :

```bash
cd frontend-office-tourisme
npm run dev
```

Le script `dev` de [`package.json`](src:frontend-office-tourisme/package.json) lance `npx --yes serve@14.2.7 . -l 4000`. Il n'y a pas de `npm ci` à faire : `npx` télécharge la version exacte de `serve` au premier lancement, ce qui demande un accès à l'annuaire npm. Le site est alors disponible sur `http://localhost:4000`.

`serve` lit [`serve.json`](src:frontend-office-tourisme/serve.json) :

| Réglage | Valeur | Effet |
| --- | --- | --- |
| `cleanUrls` | `false` | Les URL gardent leur extension `.html`, comme en production |
| `trailingSlash` | `false` | Pas de redirection vers une URL terminée par `/` |
| `directoryListing` | `false` | Pas de liste des fichiers d'un dossier |
| `rewrites` | `/` vers `/index.html` | Page d'accueil |
| En-têtes des `.css`, `.js`, `.mjs` | `Cache-Control: no-cache` | Chaque modification est visible au rechargement |
| En-têtes des images | `Cache-Control: public, max-age=3600` | Une heure de cache |
| En-têtes des `.html` et de `/` | `no-cache`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`, `X-Frame-Options` | Même politique de sécurité de contenu qu'en production |

Servir le site avec la même politique de sécurité de contenu qu'en production permet de détecter en développement un style en ligne ou une ressource externe qui serait bloqué une fois déployé.

D'autres serveurs conviennent pour un essai rapide, sans les en-têtes : l'extension Live Server de VS Code, ou `python -m http.server 4000`. Ouvrir directement `index.html` depuis le disque ne fonctionne pas : le navigateur bloque le chargement des modules ES en `file://`.

## Image Docker

```dockerfile
FROM nginxinc/nginx-unprivileged:1.30-alpine
USER root
RUN apk upgrade --no-cache
USER 101
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --chown=nginx:nginx *.html /usr/share/nginx/html/
COPY --chown=nginx:nginx assets /usr/share/nginx/html/assets
COPY --chown=nginx:nginx .well-known /usr/share/nginx/html/.well-known
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
```

| Choix | Raison |
| --- | --- |
| Image `nginx-unprivileged` | nginx tourne sous l'utilisateur 101 et écoute le port 8080 : aucun privilège n'est nécessaire pour ouvrir un port inférieur à 1024 |
| `apk upgrade` en root, puis retour à l'utilisateur 101 | Applique les correctifs Alpine publiés après l'image de base, pour passer le contrôle Trivy de la CI |
| Copie sélective | Seuls les pages, `assets/`, `.well-known/` et la configuration nginx entrent dans l'image |
| `HEALTHCHECK` sur `/health` | Docker et Compose savent si le serveur répond |

Le [`.dockerignore`](src:frontend-office-tourisme/.dockerignore) écarte `README.md`, `package.json`, `serve.json`, le `Dockerfile` et les journaux : ces fichiers ne sont pas servis en production.

Construire et lancer l'image seule, depuis la racine du dépôt :

```bash
docker build -t blocklucky-tourisme frontend-office-tourisme
docker run --rm -p 4000:8080 blocklucky-tourisme
```

### Configuration nginx

[`docker/nginx.conf`](src:frontend-office-tourisme/docker/nginx.conf) définit un seul serveur :

| Directive | Effet |
| --- | --- |
| `listen 8080`, `server_tokens off` | Port non privilégié, version de nginx masquée |
| `client_max_body_size 16k` | Corps de requête limité : le site ne reçoit jamais de données |
| `gzip on` niveau 6, au-delà de 1024 octets | Compression du CSS, du JavaScript, du SVG, du JSON et du texte |
| `if ($request_method !~ ^(GET\|HEAD)$) { return 405; }` | Toute autre méthode HTTP est refusée |
| `location = /health` | Répond `200 ok` en texte, sans journal d'accès |
| `location = /.well-known/security.txt` | Sert le fichier de contact sécurité, cache d'un jour |
| `location ~ /\.(?!well-known)` | Tout autre chemin commençant par un point renvoie 404 |
| `error_page 404 /404.html` | Page d'erreur du site |

Les durées de cache dépendent du type de fichier :

| Fichiers | `Cache-Control` |
| --- | --- |
| `.html` | `no-cache` : le navigateur revalide à chaque visite |
| `.css`, `.js`, `.mjs` | `public, max-age=86400, stale-while-revalidate=604800` : un jour, puis une semaine de revalidation en arrière-plan |
| Images et polices (`jpg`, `jpeg`, `png`, `webp`, `avif`, `svg`, `ico`, `woff2`) | `public, max-age=2592000` : 30 jours |

> [!NOTE]
> Les noms des fichiers CSS et JavaScript ne contiennent pas d'empreinte. Après une mise à jour, un visiteur peut garder l'ancienne version d'un module jusqu'à un jour, tandis que les pages HTML, revalidées, sont déjà à jour. Pour une modification incompatible entre une page et un module, renommer le module ou ajouter un paramètre de version dans l'URL du script.

### En-têtes de sécurité

Les en-têtes sont regroupés dans [`docker/security-headers.conf`](src:frontend-office-tourisme/docker/security-headers.conf) :

| En-tête | Valeur | Rôle |
| --- | --- | --- |
| `Content-Security-Policy` | voir ci-dessous | Liste blanche des ressources |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | HTTPS obligatoire pendant deux ans, sous-domaines compris. Ignoré par le navigateur tant que le site est servi en HTTP, comme sur le port 4000 local |
| `X-Content-Type-Options` | `nosniff` | Le navigateur respecte le type MIME annoncé |
| `X-Frame-Options` | `DENY` | Le site ne peut pas être affiché dans un cadre |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Seule l'origine est transmise aux autres sites |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | Fonctions sensibles du navigateur désactivées |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolement de la fenêtre vis-à-vis des pages ouvertes |
| `Cross-Origin-Resource-Policy` | `same-origin` | Les ressources du site ne peuvent pas être chargées par un autre site |

> [!WARNING]
> Dans nginx, un bloc `location` qui déclare son propre `add_header` n'hérite plus d'aucun `add_header` du niveau `server`. C'est pourquoi chaque `location` qui ajoute un `Cache-Control` refait `include /etc/nginx/snippets/security-headers.conf`. Toute nouvelle `location` avec un `add_header` doit en faire autant, sinon ses réponses partent sans politique de sécurité.

### Politique de sécurité de contenu

```text
default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
```

La même valeur est écrite dans `security-headers.conf` et dans `serve.json`.

| Directive | Conséquence |
| --- | --- |
| `script-src 'self'` | Aucun script en ligne, aucun script tiers. Tous les comportements sont dans des modules de `assets/js/` |
| `style-src 'self'` | Feuilles de style du site uniquement, pas de balise `<style>` |
| `style-src-attr 'unsafe-inline'` | Les attributs `style="..."` restent autorisés. Ils sont utilisés dans le HTML des pages (espacements ponctuels) et dans quelques gabarits JavaScript |
| `img-src 'self' data:` | Images du site et images en `data:` (icône SVG intégrée dans `layout.css`) |
| `font-src 'self'` | Polices auto-hébergées uniquement |
| `connect-src 'self'` | Aucune requête réseau vers un autre domaine, en particulier vers l'API BlockLucky |
| `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` | Ni plugin, ni changement de l'URL de base, ni affichage en cadre |
| `form-action 'self'` | Un formulaire ne peut être envoyé qu'au site lui-même |

Le lien « Accéder à la loterie » n'est pas concerné : une navigation vers un autre site n'est pas une ressource chargée.

## Dans Docker Compose

Le service `tourisme` de [`docker-compose.yml`](src:docker-compose.yml) fait partie du profil `app` :

```yaml
tourisme:
  profiles: ["app"]
  <<: *hardening
  build:
    context: ./frontend-office-tourisme
  ports:
    - "4000:8080"
  restart: unless-stopped
```

| Propriété | Effet |
| --- | --- |
| `profiles: ["app"]` | Démarré seulement avec `docker compose --profile app up`, avec le reste de l'application |
| `<<: *hardening` | Système de fichiers en lecture seule, toutes les capacités Linux retirées, `no-new-privileges`, `/tmp` en mémoire (64 Mo) pour les fichiers temporaires de nginx |
| `ports: "4000:8080"` | Le port 8080 du conteneur est publié sur le port 4000 de toutes les interfaces de l'hôte |
| aucune dépendance | Le service ne dépend ni de la base, ni de l'API |

Pour ne lancer que ce service :

```bash
docker compose --profile app up -d --build tourisme
```

Le contexte de construction et la stack complète sont décrits dans [Docker Compose](../infrastructure/docker-compose.md) et [Images Docker](../infrastructure/images.md).

## Vérifications de la CI

Le job `tourisme` de [`.github/workflows/ci.yml`](src:.github/workflows/ci.yml) s'exécute quand un fichier de `frontend-office-tourisme/` ou le workflow change :

| Étape | Commande | Échoue si |
| --- | --- | --- |
| Syntaxe des modules JavaScript | `find assets/js \( -name '*.js' -o -name '*.mjs' \) -exec node --check {} \;` | Un fichier ne se compile pas |
| Ressources locales référencées par les pages HTML | `node ../.github/scripts/check-static-links.mjs .` | Un `src` ou `href` d'une page HTML vise un fichier absent |

Le script [`check-static-links.mjs`](src:.github/scripts/check-static-links.mjs) ignore les liens absolus (`https:`, `mailto:`, `tel:`), les ancres seules et les gabarits `${...}`, puis retire paramètres et ancre avant de tester l'existence du fichier. Il affiche `14 pages vérifiées, aucune ressource locale manquante` quand tout va bien.

Le job `docker` construit ensuite l'image, puis Trivy l'analyse et échoue sur toute vulnérabilité `CRITICAL` ou `HIGH` pour laquelle un correctif existe (`--ignore-unfixed`). Dependabot propose chaque semaine les nouvelles versions de l'image de base (écosystème `docker`, voir [Dépendances](../contribuer/dependances.md)).

## Avant une mise en ligne

La cible prévue est `tourisme.etherbay.tech`, derrière le proxy Caddy de la machine de démonstration (voir [Environnements](../infrastructure/environnements.md) et [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md)). Le conteneur sert du HTTP ; Caddy termine le HTTPS.

| Point | Action |
| --- | --- |
| Lien vers la loterie | Remplacer `lotteryAppUrl: 'http://localhost:3000'` dans [`assets/js/data/site.js`](src:frontend-office-tourisme/assets/js/data/site.js) par l'URL publique du frontend web, puis reconstruire l'image |
| Exposition du port | Le service publie `4000` sur toutes les interfaces. Derrière un proxy sur la même machine, limiter la publication à `127.0.0.1:4000:8080` pour que seul Caddy y accède |
| HSTS | L'en-tête porte `includeSubDomains` : il ne doit être envoyé que si tous les sous-domaines d'`etherbay.tech` sont servis en HTTPS |
| Dates des contenus | Vérifier que les événements de [`assets/js/data/events.js`](src:frontend-office-tourisme/assets/js/data/events.js) couvrent la période de démonstration (voir [Contenus](contenus.md#evenements)) |
| `security.txt` | Le champ `Expires` de [`.well-known/security.txt`](src:frontend-office-tourisme/.well-known/security.txt) vaut `2027-11-10T00:00:00.000Z` : le renouveler avant cette date |
| Mentions légales | Elles décrivent un site de démonstration : à réécrire si le site devenait réel |
