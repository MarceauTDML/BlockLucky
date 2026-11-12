import Link from 'next/link';
import React from 'react';
import Icon from '@/components/ui/Icon';

export const Brand: React.FC<{ compact?: boolean; href?: string }> = ({ compact, href = '/' }) => (
  <Link href={href} className="inline-flex items-center gap-2" aria-label="BlockLucky, accueil">
    <Icon name="logoSymbol" size={compact ? 30 : 34} />
    <span className="flex flex-col leading-tight">
      <span className="text-[21px] font-bold tracking-[-0.5px]">
        Block<span className="italic">Lucky</span>
      </span>
      {!compact ? <span className="text-caption font-medium text-fg-secondary">Ville d&apos;EtherBay</span> : null}
    </span>
  </Link>
);

export default Brand;
