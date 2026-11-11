'use client';

import React, { useState } from 'react';
import { POAPBadgeCard, TicketCard } from '@/components/lottery/TicketCard';
import BackButton from '@/components/ui/BackButton';
import { LinkButton } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, EmptyState, PageHeader } from '@/components/ui/Misc';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { useGetMyTransactionsQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

type Tab = 'TICKETS' | 'POAP';

export default function HistoryPage() {
  const { t } = useAppTheme();
  const { data, isLoading, isError } = useGetMyTransactionsQuery({ page: 1, limit: 50 });
  const [activeTab, setActiveTab] = useState<Tab>('TICKETS');

  const tickets = data?.data?.tickets ?? [];
  const poapBadges = data?.data?.poapBadges ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <BackButton href="/accueil" />
      <PageHeader
        title={t('Historique & POAP', 'History & POAP')}
        subtitle={t(
          'Consultez vos tickets vérifiables sur Ethereum et vos certificats de participation.',
          'View your verifiable Ethereum tickets and participation certificates.'
        )}
      />

      <SegmentedTabs<Tab>
        ariaLabel={t('Type de contenu', 'Content type')}
        value={activeTab}
        onChange={setActiveTab}
        className="md:max-w-md"
        options={[
          { value: 'TICKETS', label: t(`Tickets (${tickets.length})`, `Tickets (${tickets.length})`) },
          { value: 'POAP', label: t(`Certificats POAP (${poapBadges.length})`, `POAP Badges (${poapBadges.length})`) },
        ]}
      />

      {isLoading ? (
        <Loader message={t('Chargement des preuves on-chain...', 'Loading on-chain proofs...')} skeletonRows={3} />
      ) : isError ? (
        <Alert tone="error">
          {t('Impossible de charger votre historique pour le moment.', 'Unable to load your history right now.')}
        </Alert>
      ) : activeTab === 'TICKETS' ? (
        tickets.length === 0 ? (
          <EmptyState
            title={t('Aucun ticket enregistré', 'No tickets recorded')}
            description={t(
              'Participez depuis la billetterie pour obtenir votre premier ticket, inscrit et vérifiable sur la blockchain.',
              'Enter from the ticket office to get your first ticket, recorded and verifiable on the blockchain.'
            )}
            action={<LinkButton href="/billetterie">{t('Acheter un ticket', 'Buy a ticket')}</LinkButton>}
          />
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )
      ) : poapBadges.length === 0 ? (
        <EmptyState
          title={t('Aucun certificat POAP', 'No POAP certificates')}
          description={t(
            'Chaque participation débloque automatiquement un certificat commémoratif.',
            'Every ticket entry automatically unlocks a commemorative certificate.'
          )}
        />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {poapBadges.map((badge) => (
            <POAPBadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );
}
