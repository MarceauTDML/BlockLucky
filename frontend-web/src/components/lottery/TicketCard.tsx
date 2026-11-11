'use client';

import React from 'react';
import { formatDateShort } from '@/lib/date';
import { shortenWallet } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PoapBadge, TicketItem } from '@/types/api.types';

export const TicketCard: React.FC<{ ticket: TicketItem }> = ({ ticket }) => {
  const { t } = useAppTheme();
  return (
    <article className="card flex flex-col gap-[3px] p-3.5">
      <div className="mb-0.5 flex justify-between gap-2">
        <h3 className="text-body font-bold">
          {t('Tirage', 'Draw')} #{ticket.contractRoundId ?? 1}
        </h3>
        <span className="text-caption text-fg-secondary tabular">
          {t(`Bloc ${ticket.blockNumber}`, `Block ${ticket.blockNumber}`)}
        </span>
      </div>
      <p className="text-caption text-fg-secondary">
        Transaction : <span className="font-mono">{shortenWallet(ticket.transactionHash, 8)}</span>
      </p>
      <p className="text-caption text-fg-muted">{formatDateShort(ticket.purchasedAt)}</p>
      {ticket.roundStatus ? (
        <p className="text-caption text-fg-muted">
          {t('Statut du tirage : ', 'Draw status: ')}
          {ticket.roundStatus}
        </p>
      ) : null}
      {ticket.etherscanUrl ? (
        <a
          href={ticket.etherscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 rounded-sm bg-surface-elevated px-3 py-2 text-center text-caption font-medium text-primary hover:bg-line"
        >
          {t('Consulter sur Etherscan →', 'View on Etherscan →')}
        </a>
      ) : null}
    </article>
  );
};

export const POAPBadgeCard: React.FC<{ badge: PoapBadge }> = ({ badge }) => {
  const { t } = useAppTheme();
  return (
    <article className="card flex items-start p-3.5">
      {badge.imageUrl ? (
        <img
          src={badge.imageUrl}
          alt={t(`Visuel du badge POAP ${badge.title}`, `POAP badge artwork ${badge.title}`)}
          width={48}
          height={48}
          loading="lazy"
          className="mr-3 h-12 w-12 shrink-0 rounded-md bg-surface-elevated object-cover"
        />
      ) : (
        <div className="mr-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-caption font-bold text-secondary">
          POAP
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="text-body font-bold">{badge.title}</h3>
        <p className="text-caption text-fg-secondary">
          {badge.edition} • Token #{badge.tokenId}
        </p>
        {badge.contractAddress ? (
          <p className="text-caption text-fg-muted">
            {t('Contrat : ', 'Contract: ')}
            <span className="font-mono">{shortenWallet(badge.contractAddress, 6)}</span>
          </p>
        ) : null}
        {badge.mintedAt ? <p className="text-caption text-fg-muted">{formatDateShort(badge.mintedAt)}</p> : null}
        {badge.explorerUrl ? (
          <a
            href={badge.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("Voir le contrat POAP sur l'explorateur de blocs →", 'View the POAP contract on the block explorer →')}
          </a>
        ) : null}
      </div>
    </article>
  );
};

export default TicketCard;
