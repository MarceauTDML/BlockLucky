import Link from 'next/link';
import React from 'react';

export const Brand: React.FC<{ compact?: boolean; href?: string }> = ({ compact, href = '/' }) => (
  <Link href={href} className="inline-flex items-center gap-2" aria-label="BlockLucky, accueil">
    <span
      aria-hidden
      className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-on-primary"
    >
      BL
    </span>
    <span className="flex flex-col leading-tight">
      <span className="text-body font-bold tracking-[-0.3px]">BlockLucky</span>
      {!compact ? <span className="text-caption font-medium text-secondary">Ville d&apos;EtherBay</span> : null}
    </span>
  </Link>
);

export default Brand;
