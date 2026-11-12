'use client';

import React from 'react';
import Icon from '@/components/ui/Icon';
import { formatDateShort } from '@/lib/date';
import { shortenWallet } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PoapBadge, TicketItem } from '@/types/api.types';

export const TicketCard: React.FC<{ ticket: TicketItem }> = ({ ticket }) => {
  const { t } = useAppTheme();
  return (
    <article className="card relative flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 bg-sun px-4 py-3.5 text-on-sun">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d2637] text-sun">
            <Icon name="ticket" size={18} />
          </span>
          <h3 className="text-subtitle font-bold">
            {t('Tirage', 'Draw')} #{ticket.contractRoundId ?? 1}
          </h3>
        </div>
        <span className="rounded-full bg-sun-soft px-2.5 py-1 text-caption font-semibold text-on-sun tabular">
          {t(`Bloc ${ticket.blockNumber}`, `Block ${ticket.blockNumber}`)}
        </span>
      </div>
      <div aria-hidden className="relative h-0 border-t-2 border-dashed border-line">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-3.5">
        <p className="text-caption text-fg-secondary">
          Transaction : <span className="font-mono font-semibold text-fg">{shortenWallet(ticket.transactionHash, 8)}</span>
        </p>
        <p className="inline-flex items-center gap-1.5 text-caption text-fg-muted">
          <Icon name="clock" size={14} />
          {formatDateShort(ticket.purchasedAt)}
        </p>
        {ticket.roundStatus ? (
          <p className="mt-1 self-start rounded-full bg-lavender px-2.5 py-1 text-caption font-semibold text-violet">
            {t('Statut du tirage : ', 'Draw status: ')}
            {ticket.roundStatus}
          </p>
        ) : null}
        {ticket.etherscanUrl ? (
          <a
            href={ticket.etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-[12px] bg-surface-elevated px-3 py-2.5 text-center text-caption font-semibold text-fg hover:bg-line"
          >
            {t('Consulter sur Etherscan →', 'View on Etherscan →')}
          </a>
        ) : null}
      </div>
    </article>
  );
};

export const POAPBadgeCard: React.FC<{ badge: PoapBadge }> = ({ badge }) => {
  const { t } = useAppTheme();
  return (
    <article className="card flex items-start gap-3.5 p-4">
      {badge.imageUrl ? (
        <img
          src={badge.imageUrl}
          alt={t(`Visuel du badge POAP ${badge.title}`, `POAP badge artwork ${badge.title}`)}
          width={48}
          height={48}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-full bg-surface-elevated object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-lavender text-violet">
          <Icon name="star" size={18} />
          <span className="text-[10px] font-bold leading-3">POAP</span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="text-body font-bold">{badge.title}</h3>
        <p className="self-start rounded-full bg-sun-chip px-2.5 py-0.5 text-caption font-semibold text-on-sun dark:text-sun">
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
            className="mt-1 text-caption font-semibold text-green underline-offset-2 hover:underline"
          >
            {t("Voir le contrat POAP sur l'explorateur de blocs →", 'View the POAP contract on the block explorer →')}
          </a>
        ) : null}
      </div>
    </article>
  );
};

export default TicketCard;
