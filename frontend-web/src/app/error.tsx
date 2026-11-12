'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md p-7 text-center" role="alert">
        <span aria-hidden className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-peach text-terracotta">
          <Icon name="alert" size={26} />
        </span>
        <p className="mb-3 inline-flex rounded-full bg-peach px-3 py-1 text-caption font-semibold text-error">
          Erreur inattendue
        </p>
        <h1 className="mb-2 text-hero font-bold tracking-[-0.6px]">Un problème est survenu</h1>
        <p className="mb-6 text-body text-fg-secondary">
          Cette section n&apos;a pas pu s&apos;afficher. Le reste de l&apos;application reste
          disponible. / Something went wrong.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-sun px-5 py-3 font-semibold text-on-sun shadow-[0_6px_16px_rgba(172,141,10,0.18)] transition-colors hover:bg-sun-light"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-line bg-surface px-5 py-3 font-semibold text-fg transition-colors hover:bg-surface-elevated"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 text-caption text-fg-muted">Référence : {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
