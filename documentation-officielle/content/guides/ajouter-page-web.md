# Ajouter une page web

Le frontend web est une application Next.js 16 en App Router ([`frontend-web/src/app/`](src:frontend-web/src/app/)) : un dossier égale un segment d'URL, et son fichier `page.tsx` est la page. Ce guide ajoute une page publique `/transparence/tours` qui affiche l'historique des tirages, à partir de la route `GET /api/v1/lottery/rounds` créée dans [Ajouter un endpoint](ajouter-endpoint.md).

## Fichiers à toucher

| Fichier | Modification |
| --- | --- |
| [`frontend-web/src/types/api.types.ts`](src:frontend-web/src/types/api.types.ts) | Type de la réponse |
| [`frontend-web/src/store/api/lotteryApi.ts`](src:frontend-web/src/store/api/lotteryApi.ts) | Endpoint RTK Query et hook exporté |
| `frontend-web/src/components/lottery/RoundHistoryList.tsx` | Composant d'affichage, testable seul |
| `frontend-web/src/app/transparence/tours/page.tsx` | La page |
| [`frontend-web/src/app/transparence/page.tsx`](src:frontend-web/src/app/transparence/page.tsx) | Lien vers la nouvelle page |
| [`frontend-web/__tests__/components.test.tsx`](src:frontend-web/__tests__/components.test.tsx) | Test du composant |

## Choisir l'emplacement

L'emplacement du dossier décide de l'habillage et de la protection de la page :

| Dossier | Habillage | Accès | Exemples |
| --- | --- | --- | --- |
| `src/app/<page>/` | à fournir par la page, en général `PublicShell` | public | `/transparence`, `/mentions-legales`, `/connexion` |
| `src/app/(citoyen)/<page>/` | `AppShell` de l'espace citoyen, posé par [`(citoyen)/layout.tsx`](src:frontend-web/src/app/(citoyen)/layout.tsx) | compte connecté, tout rôle | `/accueil`, `/billetterie`, `/historique` |
| `src/app/partenaire/<page>/` | `AppShell` de l'espace partenaires | rôles `PARTNER` et `ADMIN` | `/partenaire/codes` |
| `src/app/mairie/<page>/` | `AppShell` du dashboard Mairie | rôle `ADMIN` | `/mairie/securite` |

Le dossier `(citoyen)` est un groupe de routes : ses parenthèses n'apparaissent pas dans l'URL. La protection est faite côté navigateur par [`RequireRole`](src:frontend-web/src/components/layout/RequireRole.tsx), qui redirige vers `/connexion?next=...` ou affiche `AccessDenied`. Elle améliore l'ergonomie mais ne protège rien : la vraie barrière est le contrôle `authenticate` et `requireRoles` de chaque route de l'API.

Ajouter une entrée de menu à un espace se fait dans le tableau `nav` du `layout.tsx` correspondant. Renseigner aussi son champ `icon` avec un nom de [`iconData.ts`](src:frontend-web/src/components/ui/iconData.ts) (par exemple `{ href: '/historique', label: t('Historique & POAP', 'History & POAP'), icon: 'tabTickets' }`) : la barre latérale et la barre d'onglets affichent l'icône à côté du libellé.

## 1. Typer la réponse

Dans [`api.types.ts`](src:frontend-web/src/types/api.types.ts), à côté de `LeaderboardEntry` :

```typescript
export interface RoundHistoryItem {
  contractRoundId: number;
  winner: string | null;
  winningTicket: number | null;
  prizeEth: number | null;
  ticketsCount: number;
  chainlinkRequestId: string | null;
  drawnAt: string | null;
  prizeClaimedAt: string | null;
}
```

## 2. Déclarer l'appel API

Les appels passent tous par RTK Query. Dans [`lotteryApi.ts`](src:frontend-web/src/store/api/lotteryApi.ts), ajouter l'endpoint dans `injectEndpoints` et exporter son hook :

```typescript
getRoundHistory: builder.query<ApiResponse<{ rounds: RoundHistoryItem[] }>, { page?: number; limit?: number } | void>({
  query: (params) => ({ url: '/lottery/rounds', params: params || { page: 1, limit: 10 } }),
  providesTags: ['Lottery'],
}),
```

```typescript
export const {
  useGetLotteryStatusQuery,
  useGetRoundHistoryQuery,
} = lotteryApi;
```

| Point | Détail |
| --- | --- |
| URL de base | `baseApi` préfixe `NEXT_PUBLIC_API_URL` (`http://localhost:2053/api` par défaut, [`lib/config.ts`](src:frontend-web/src/lib/config.ts)) et ajoute le jeton `Authorization` s'il existe |
| Délai | 15 s par requête (`fetchBaseQuery`, [`baseApi.ts`](src:frontend-web/src/store/api/baseApi.ts)) |
| Jeton expiré | Une réponse 401 sur une requête authentifiée déconnecte l'utilisateur |
| Étiquette `Lottery` | Le hook `useSocket` invalide `Lottery` à chaque événement `draw:winner` : la liste se rafraîchit seule après un tirage, sans code supplémentaire |
| Écriture | Une mutation déclare `invalidatesTags` pour rafraîchir les requêtes concernées |

## 3. Écrire le composant

Un composant d'affichage reçoit ses données par propriétés : il se teste sans store ni réseau. Fichier `src/components/lottery/RoundHistoryList.tsx` :

```typescript
'use client';

import React from 'react';
import { formatEth, shortenHash } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';
import { RoundHistoryItem } from '@/types/api.types';

export const RoundHistoryList: React.FC<{ rounds: RoundHistoryItem[] }> = ({ rounds }) => {
  const { t } = useAppTheme();

  if (rounds.length === 0) {
    return <p className="text-caption text-fg-muted">{t('Aucun tirage terminé.', 'No completed draw yet.')}</p>;
  }

  return (
    <ol className="grid gap-2.5">
      {rounds.map((round) => (
        <li key={round.contractRoundId} className="card flex flex-col gap-1 p-4">
          <h2 className="text-body font-bold">
            {t('Tour', 'Round')} #{round.contractRoundId}
          </h2>
          <p className="text-small">
            {t('Gagnant', 'Winner')} : {round.winner ?? '—'} · {t('ticket', 'ticket')} {round.winningTicket ?? '—'}
          </p>
          <p className="text-small">
            {t('Cagnotte', 'Prize')} : {formatEth(round.prizeEth ?? 0)} · {round.ticketsCount} {t('tickets', 'tickets')}
          </p>
          <p className="text-caption text-fg-muted">
            {t('Requête Chainlink VRF', 'Chainlink VRF request')} {shortenHash(round.chainlinkRequestId)}
          </p>
        </li>
      ))}
    </ol>
  );
};

export default RoundHistoryList;
```

Règles du frontend :

| Règle | Outil |
| --- | --- |
| Tout texte visible est bilingue | `t('français', 'english')` de [`useAppTheme`](src:frontend-web/src/theme/ThemeProvider.tsx) |
| Couleurs et tailles par classes du thème (`text-fg-muted`, `text-caption`, `card`) | Tailwind 4 et [`globals.css`](src:frontend-web/src/app/globals.css), voir [Design system](../web/design-system.md) |
| Formatage des montants, adresses et empreintes | [`lib/formatters.ts`](src:frontend-web/src/lib/formatters.ts) |
| Composants existants avant du balisage neuf | `PageHeader`, `EmptyState`, `Alert` de [`Misc.tsx`](src:frontend-web/src/components/ui/Misc.tsx), `Loader`, `Button`, `LinkButton` |
| `'use client'` en tête | Tout composant qui utilise un hook React ou le store |

## 4. Créer la page

Fichier `src/app/transparence/tours/page.tsx`, sur le modèle de [`transparence/page.tsx`](src:frontend-web/src/app/transparence/page.tsx) et [`(citoyen)/historique/page.tsx`](src:frontend-web/src/app/(citoyen)/historique/page.tsx) :

```typescript
'use client';

import React from 'react';
import PublicShell from '@/components/layout/PublicShell';
import RoundHistoryList from '@/components/lottery/RoundHistoryList';
import { Loader } from '@/components/ui/Loader';
import { Alert, PageHeader } from '@/components/ui/Misc';
import { useGetRoundHistoryQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function RoundHistoryPage() {
  const { t } = useAppTheme();
  const { data, isLoading, isError } = useGetRoundHistoryQuery({ page: 1, limit: 20 });

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <PageHeader
          title={t('Historique des tirages', 'Draw history')}
          subtitle={t(
            'Chaque gagnant a été désigné par Chainlink VRF et peut être vérifié sur la blockchain.',
            'Each winner was picked by Chainlink VRF and can be checked on the blockchain.'
          )}
        />
        {isLoading ? <Loader message={t('Chargement…', 'Loading…')} /> : null}
        {isError ? <Alert tone="error">{t('Historique indisponible.', 'History unavailable.')}</Alert> : null}
        {data ? <RoundHistoryList rounds={data.data.rounds} /> : null}
      </div>
    </PublicShell>
  );
}
```

Puis ajouter un lien depuis la page Transparence, sous le bouton existant :

```typescript
<LinkButton href="/transparence/tours" variant="outline">
  {t("Voir l'historique des tirages", 'See draw history')}
</LinkButton>
```

> [!NOTE]
> Les pages du projet sont des composants client (`'use client'`) qui chargent leurs données dans le navigateur. Le titre de l'onglet vient du `metadata` global de [`app/layout.tsx`](src:frontend-web/src/app/layout.tsx). Une page qui a besoin de son propre titre pour le référencement doit être un composant serveur qui exporte `metadata` et rend un composant client.

## 5. Tester

Dans [`__tests__/components.test.tsx`](src:frontend-web/__tests__/components.test.tsx), le fichier enveloppe déjà les composants dans `ThemeProvider` avec `withTheme` :

```typescript
import RoundHistoryList from '@/components/lottery/RoundHistoryList';

describe('RoundHistoryList', () => {
  it('affiche le gagnant anonymisé et la cagnotte de chaque tour', () => {
    withTheme(
      <RoundHistoryList
        rounds={[
          {
            contractRoundId: 3,
            winner: '0x8a3f...91c2',
            winningTicket: 2,
            prizeEth: 0.036,
            ticketsCount: 4,
            chainlinkRequestId: '1',
            drawnAt: '2026-11-11T14:32:10.000Z',
            prizeClaimedAt: null,
          },
        ]}
      />
    );
    expect(screen.getByText(/0x8a3f\.\.\.91c2/)).toBeInTheDocument();
    expect(screen.getByText(/0\.04 ETH/)).toBeInTheDocument();
  });
});
```

`formatEth` arrondit à deux décimales : 0,036 devient « 0.04 ETH ». Lancer ensuite les contrôles de la CI :

```bash
cd frontend-web
npm run lint
npm run typecheck
npm test
npm run build
```

Le build échoue sur une erreur de type ou un import introuvable que le serveur de développement aurait toléré. Vérifier enfin la page sur `http://localhost:3000/transparence/tours` avec `npm run dev`, en clair et en sombre, en français et en anglais, et au clavier.

## 6. Accessibilité et sécurité

| Point | Vérification |
| --- | --- |
| Un seul `<h1>` | `PageHeader` le pose ; les titres suivants sont des `<h2>` |
| Navigation clavier | Tous les éléments interactifs sont des `<button>` ou des liens |
| États annoncés | Chargement et erreur visibles en texte, pas seulement par une couleur |
| Données affichées | Aucune adresse complète ni email d'un autre citoyen : l'API renvoie déjà des adresses anonymisées |
| Nouvelle origine appelée | Ajouter le domaine à `connect-src` de la politique de sécurité de contenu de [`next.config.mjs`](src:frontend-web/next.config.mjs), sinon l'appel est bloqué en production |

Voir [Accessibilité et responsive](../web/accessibilite.md) et [Sécurité du navigateur](../web/securite-navigateur.md).

## Liste de contrôle

- [ ] Dossier placé dans le bon espace (public, citoyen, partenaire, Mairie).
- [ ] Type de réponse et endpoint RTK Query avec la bonne étiquette.
- [ ] Textes bilingues avec `t()`.
- [ ] États de chargement, d'erreur et liste vide.
- [ ] Test Vitest du composant.
- [ ] `lint`, `typecheck`, `test` et `build` verts.
- [ ] Captures d'écran jointes à la pull request.
