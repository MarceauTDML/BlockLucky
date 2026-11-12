import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md p-7 text-center">
        <span aria-hidden className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun">
          <Icon name="location" size={26} />
        </span>
        <p className="mb-3 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">Erreur 404</p>
        <h1 className="mb-2 text-hero font-bold tracking-[-0.6px]">Page introuvable</h1>
        <p className="mb-6 text-body text-fg-secondary">
          Cette page n&apos;existe pas ou a été déplacée. / This page does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-sun px-5 py-3 font-semibold text-on-sun shadow-[0_6px_16px_rgba(172,141,10,0.18)] transition-colors hover:bg-sun-light"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
