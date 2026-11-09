# BlockLucky Frontend Web — Ville d'EtherBay

Interface web responsive de la **loterie citoyenne pédagogique** d'EtherBay, construite avec **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 4** et **Redux Toolkit / RTK Query**. Elle reprend à l'identique le design system de l'application mobile (`mobile-app/src/theme`) en attendant les maquettes définitives.

## Trois espaces, un seul design

| Espace | Routes | Rôle requis |
|---|---|---|
| Public (page municipale) | `/`, `/transparence`, `/confidentialite`, `/mentions-legales`, `/connexion`, `/invite/[code]` | — |
| Citoyen (parité mobile) | `/accueil`, `/billetterie`, `/tirage`, `/historique`, `/boutique`, `/boutique/[id]`, `/boutique/carte`, `/boutique/mes-codes`, `/profil`, `/profil/securite`, `/profil/securite/2fa`, `/profil/rgpd`, `/profil/aide` | connecté |
| Dashboard Mairie | `/mairie`, `/mairie/analytique`, `/mairie/partenaires`, `/mairie/securite`, `/mairie/audit` | `ADMIN` |
| Espace Partenaires | `/partenaire`, `/partenaire/offres`, `/partenaire/codes`, `/partenaire/validation` | `PARTNER` ou `ADMIN` |

**Responsive** : sous 1024 px, en-tête compact + barre d'onglets basse identique au `CustomTabBar` mobile ; au-dessus, barre latérale et grilles multi-colonnes. Les modales sont des feuilles basses sur mobile et des dialogues centrés sur desktop.

## Parcours instrumenté (Dossier 03)

Les six étapes du parcours de démonstration envoient un événement first-party (`POST /api/analytics/track`, sans cookie, désactivable dans `/confidentialite`) :

`landing_view` → `rules_view` → `access_started` → `ticket_submitted` → `ticket_confirmed` → `result_view`

La source `utm_source` est capturée à l'arrivée et transmise à la connexion pour le suivi d'acquisition par canal.

## Démarrage

```bash
cd frontend-web
npm install
cp .env.example .env.local   # API sur http://localhost:2053/api par défaut
npm run dev                  # http://localhost:3000
```

Le backend doit tourner (`backend/`, port 2053) avec la base seedée (`npm run prisma:seed`).

**Comptes de démonstration (seed)** — connexion par email, sans mot de passe :

- Citoyen : `citoyen@etherbay.fr`
- Mairie : `maire@etherbay.fr` (via `/connexion?espace=pro`)
- Partenaire : `boulangerie@etherbay.fr` (via `/connexion?espace=pro`)

L'adresse de portefeuille est dérivée de l'email avec **le même algorithme que l'app mobile** (`src/lib/wallet.ts`) : un habitant retrouve son compte sur les deux supports.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint (config Next.js) |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires Vitest + Testing Library |

## Architecture

```text
src/
├── app/                 # Routes App Router (public, (citoyen), mairie, partenaire)
├── components/
│   ├── ui/              # Button, Input, Card, Sheet, Loader, ProgressBar, SegmentedTabs…
│   ├── layout/          # AppShell responsive, PublicShell, RequireRole, AccessDenied
│   ├── lottery/         # CountdownTimer, RouletteAnimation, ChatBox, TicketCard…
│   ├── marketplace/     # PointsBalanceCard, RewardCard, ScratchCanvas (canvas)
│   ├── charts/          # BarList, RingMeter, KpiTile (SVG/CSS, sans dépendance)
│   └── partner/         # Sélection de l'établissement
├── hooks/               # useAuth, useGaslessWeb3, usePoints, useSocket… (mêmes API que le mobile)
├── store/               # Redux Toolkit + RTK Query (auth, lottery, marketplace, admin, partners)
├── theme/               # ThemeProvider (clair/sombre, FR/EN, t(fr, en))
├── lib/                 # config, stockage, analytics, wallet, formatters, export
└── types/               # Types API partagés avec le mobile + types Mairie/Partenaire
```

## Accessibilité, sécurité, conformité

- Navigation clavier complète, lien d'évitement, focus visible, modales accessibles (piège de focus, Échap), `aria-live` sur les états réseau, tableaux équivalents pour les graphiques, `prefers-reduced-motion` respecté.
- Vérification de majorité avant connexion, question de compréhension des **ethers fictifs** avant chaque achat, reçu distinguant « en attente » et « confirmé », bouton bloqué pendant l'envoi (anti double confirmation), plafond de jeu responsable.
- RGPD : export JSON, anonymisation avec double confirmation, politique de confidentialité, opposition à la mesure d'audience.
- Garde RBAC côté client (écran 403) en complément du RBAC backend ; redirections `next` validées (anti open-redirect) ; en-têtes de sécurité HTTP.

## Points en attente

- **Maquettes UX/UI** : les tokens sont centralisés dans `src/app/globals.css` (variables CSS) pour une mise à jour rapide.
- **Backend** : pas de lien entre un compte `PARTNER` et sa fiche commerce (l'établissement est choisi dans l'interface) ; la connexion accepte n'importe quel email existant sans preuve de possession (voir rapport de l'équipe).
