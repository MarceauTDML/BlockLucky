# Navigateur et mobile

Cette page regroupe les protections côté client : en-têtes HTTP et politique de sécurité du contenu (CSP) du frontend web, configuration du site statique de l'Office de Tourisme, et stockage sécurisé de l'application mobile. Les détails d'implémentation propres à chaque application sont dans [Sécurité du navigateur](../web/securite-navigateur.md), [Authentification et stockage sécurisé](../mobile/authentification.md) et [Accessibilité et vie privée](../office-tourisme/accessibilite.md).

## Frontend web

Les en-têtes sont déclarés dans la fonction `headers()` de [`frontend-web/next.config.mjs`](src:frontend-web/next.config.mjs) et appliqués à toutes les routes (`/:path*`).

### En-têtes

| En-tête | Valeur | Environnement |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Tous |
| `X-Frame-Options` | `DENY` | Tous |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Tous |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | Tous |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (2 ans) | Tous ; ignoré par le navigateur en HTTP |
| `Cross-Origin-Opener-Policy` | `same-origin` | Tous |
| `Content-Security-Policy` | Voir ci-dessous | **Production uniquement** (`NODE_ENV=production`) |

Next.js est aussi configuré avec `poweredByHeader: false` (pas d'en-tête `X-Powered-By`) et `productionBrowserSourceMaps: false` (pas de source map publique). La CI vérifie qu'aucun fichier `.map` ni aucun motif de secret ne figure dans `.next/static`.

### Politique CSP

La politique est construite à partir de `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL`, dont seule l'origine est retenue :

| Directive | Valeur |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self' 'unsafe-inline'` |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data: blob: https:` et l'origine de l'API |
| `font-src` | `'self' data:` |
| `connect-src` | `'self'`, origines HTTP et WebSocket de l'API et du serveur temps réel |
| `object-src` | `'none'` |
| `base-uri` | `'none'` |
| `frame-ancestors` | `'none'` |
| `form-action` | `'self'` |
| `manifest-src` | `'self'` |
| `worker-src` | `'self' blob:` |
| `upgrade-insecure-requests` | Ajoutée quand l'API est en HTTPS |

`connect-src` limite les destinations des appels réseau : un script injecté ne peut pas exfiltrer de données vers un autre domaine par `fetch` ou WebSocket. `frame-ancestors 'none'` et `X-Frame-Options: DENY` empêchent l'intégration du site dans une iframe (clickjacking).

> [!WARNING]
> `script-src` autorise `'unsafe-inline'`. Ce choix est imposé par les scripts en ligne de Next.js et par `themeInitScript`, injecté dans [`frontend-web/src/app/layout.tsx`](src:frontend-web/src/app/layout.tsx) pour appliquer le thème avant le premier rendu. Il affaiblit la protection contre le XSS : un script injecté dans la page serait exécuté. Comme le jeton de session est dans `localStorage` (voir [Sessions](sessions.md#stockage-du-jeton-par-les-clients)), la CSP ne suffit pas à le protéger en cas d'injection. Une CSP par nonce, que Next.js permet via un middleware, retirerait ce besoin.

En développement, aucune CSP n'est envoyée, pour laisser fonctionner le rechargement à chaud.

### Autres mesures

| Mesure | Situation |
|---|---|
| Polices | Inter servie par le site lui-même (`next/font/local`, fichiers de [`frontend-web/src/app/fonts`](src:frontend-web/src/app/fonts)), autorisée par `font-src 'self' data:` ; aucune requête vers un service de polices tiers |
| Liens externes | Les liens `target="_blank"` portent `rel="noopener noreferrer"` |
| Fichier `security.txt` | [`frontend-web/public/.well-known/security.txt`](src:frontend-web/public/.well-known/security.txt), contact `securite@etherbay.fr`, expiration le 10 novembre 2027 |
| Cookies | Aucun cookie posé par l'application ; préférences et jeton dans `localStorage` |
| Rendu | React échappe le texte affiché ; le seul `dangerouslySetInnerHTML` est le script de thème, sans donnée externe |
| Pièces d'identité | La page Identités de l'espace Mairie affiche le recto et le verso en `data:` URL, autorisées par `img-src data:` ; la réponse de l'API porte `Cache-Control: no-store`. Les images restent dans la mémoire de l'onglet tant que la demande est ouverte |

## Site de l'Office de Tourisme

Le site est statique (HTML, CSS, modules JavaScript) et servi par nginx non privilégié. La configuration est dans [`frontend-office-tourisme/docker/nginx.conf`](src:frontend-office-tourisme/docker/nginx.conf) et [`frontend-office-tourisme/docker/security-headers.conf`](src:frontend-office-tourisme/docker/security-headers.conf).

### En-têtes

| En-tête | Valeur |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Identique au web |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

La CSP du site est plus stricte que celle du web : aucun script en ligne n'est autorisé (`script-src 'self'`), et seuls les attributs `style` en ligne le sont (`style-src-attr 'unsafe-inline'`), pas les balises `<style>`. Toutes les ressources (polices Inter et Jost, bibliothèque `qrcode-generator`, photos) sont servies par le site lui-même.

Le fichier d'en-têtes est inclus au niveau du serveur **et** dans chaque bloc `location` qui ajoute ses propres en-têtes. Ce doublement est nécessaire : dans nginx, une directive `add_header` dans un bloc `location` annule celles héritées du niveau supérieur.

### Durcissement nginx

| Mesure | Directive |
|---|---|
| Version masquée | `server_tokens off` |
| Méthodes limitées | Tout autre verbe que `GET` et `HEAD` reçoit 405 |
| Corps limité | `client_max_body_size 16k` |
| Fichiers cachés | `location ~ /\.(?!well-known)` renvoie 404 : `.git`, `.env` et assimilés ne sont pas servis |
| Utilisateur | Image `nginxinc/nginx-unprivileged`, utilisateur 101, port 8080 |
| Fichier `security.txt` | Servi depuis `/.well-known/security.txt` |

### Serveur de développement

`npm run dev` sert le site avec `serve` et [`frontend-office-tourisme/serve.json`](src:frontend-office-tourisme/serve.json). Ce fichier n'applique qu'une partie des en-têtes (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`) aux pages HTML. Les en-têtes complets ne sont garantis que par l'image nginx.

### Données dans le navigateur

Le site n'envoie aucune donnée à un serveur. Panier, favoris, commandes de démonstration, inscription à la newsletter et choix du bandeau cookies sont stockés dans le `localStorage`. La billetterie ne demande aucune coordonnée bancaire. Les modules qui construisent du HTML échappent les valeurs avec `escapeHtml` de [`frontend-office-tourisme/assets/js/modules/utils.js`](src:frontend-office-tourisme/assets/js/modules/utils.js). Le bandeau est décrit dans [Cookies, mentions et CGU](../juridique/cookies-mentions.md).

## Application mobile

### Stockage sécurisé

[`mobile-app/src/services/secureStorage.ts`](src:mobile-app/src/services/secureStorage.ts) enregistre le jeton (`blocklucky_jwt_token`) et le profil (`blocklucky_user_profile`) avec `expo-secure-store` :

| Plateforme | Support | Option |
|---|---|---|
| iOS | Keychain | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` : lisible seulement appareil déverrouillé, non migré vers un autre appareil par une sauvegarde |
| Android | Keystore (données chiffrées par une clé du Keystore) | Même option |
| Web (Expo pour le web) | `localStorage` | Aucune protection supplémentaire |

Une copie du jeton est aussi gardée dans un cache mémoire du module, vidé à la fermeture de l'application. Les erreurs d'écriture dans le stockage sécurisé sont ignorées silencieusement. L'application ne relit de toute façon pas la session au démarrage : le jeton reste stocké mais l'utilisateur doit se reconnecter. À la déconnexion, le jeton et le profil sont effacés après l'appel à `POST /api/auth/logout`. Aucun mot de passe n'est stocké sur l'appareil.

### Connexion Google

Le mobile obtient le jeton d'identité par `expo-auth-session` (Google, avec les identifiants `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` et `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`), puis le transmet au backend, qui le vérifie ([`SocialAuthButtons.tsx`](src:mobile-app/src/components/auth/SocialAuthButtons.tsx)). L'application ne garde pas ce jeton. Les identifiants client sont publics par nature ; ils figurent vides dans [`mobile-app/.env.example`](src:mobile-app/.env.example). Sans eux, ou si le backend répond 503, le bouton Google est désactivé.

### Photos de la pièce d'identité

[`VerifyAgeScreen.tsx`](src:mobile-app/src/screens/settings/VerifyAgeScreen.tsx) prend le recto et le verso avec l'appareil photo ou les choisit dans la galerie (`expo-image-picker`, autorisations demandées au moment de l'usage, textes d'explication déclarés dans `app.json`). Les images sont lues en base64, sans métadonnées EXIF (`exif: false`), refusées au-delà de 4 Mo, puis envoyées en HTTPS par `POST /api/user/identity` et retirées de l'état de l'écran après l'envoi. Le sélecteur dépose aussi une copie de chaque image dans le cache de l'application (`asset.uri`), que le code ne supprime pas. Une photo prise dans la galerie y reste, puisqu'elle appartient au citoyen.

### Configuration

| Mesure | Fichier | Valeur |
|---|---|---|
| Sauvegarde Android | [`mobile-app/app.json`](src:mobile-app/app.json) | `android.allowBackup: false` : les données de l'application ne partent pas dans la sauvegarde Google |
| Chiffrement déclaré | idem | `ios.config.usesNonExemptEncryption: false` |
| Autorisations | idem | Appareil photo et photos (plugin `expo-image-picker`), avec un texte qui explique l'usage pour la pièce d'identité ; lecture des sons par le plugin `expo-audio`, sans autorisation particulière |
| Schéma d'URL | idem | `blocklucky`, qui permet à `expo-auth-session` de revenir dans l'application après l'authentification Google ; aucun lien profond applicatif n'est configuré |
| Secrets embarqués | [`mobile-app/.env.example`](src:mobile-app/.env.example) | Uniquement des URL et des identifiants client publics ; toute variable `EXPO_PUBLIC_*` est lisible dans le binaire |

### Ce qui n'est pas en place

| Mesure | Situation |
|---|---|
| Trafic chiffré obligatoire | Les URL d'exemple sont en `http://localhost` pour le développement. En production, `EXPO_PUBLIC_API_URL` doit être en HTTPS ; rien dans le code ne refuse une URL HTTP. |
| Épinglage de certificat | Absent |
| Détection de root ou de jailbreak, attestation d'intégrité | Absentes |
| Masquage de l'écran dans le sélecteur d'applications | Absent |
| Garde 401 | Absente : une session révoquée côté serveur n'est pas effacée de l'appareil |
| En-tête `Idempotency-Key` | Jamais envoyé, y compris pour l'achat d'un ticket à gratter |
| Mise à jour forcée | Le backend expose `MOBILE_MIN_VERSION` sous le nom `minimumMobileVersion` dans `GET /api/config`, mais l'application ne lit pas cette valeur aujourd'hui. Le déploiement est traité dans [Builds et publication](../mobile/builds-publication.md). |

Ces absences sont acceptables pour un pilote sur réseau de test. Elles redeviennent prioritaires si l'application manipule des fonds réels, la clé de portefeuille restant de toute façon côté serveur.
