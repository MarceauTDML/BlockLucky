'use client';

import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md p-6 text-center" role="alert">
        <p className="text-caption font-medium text-secondary">Erreur inattendue</p>
        <h1 className="mt-1 mb-2 text-title font-bold">Un problème est survenu</h1>
        <p className="mb-5 text-body text-fg-secondary">
          Cette section n&apos;a pas pu s&apos;afficher. Le reste de l&apos;application reste
          disponible. / Something went wrong.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-[18px] font-medium text-on-primary hover:bg-primary-light"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-line px-[18px] font-medium"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-4 text-caption text-fg-secondary">Référence : {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
