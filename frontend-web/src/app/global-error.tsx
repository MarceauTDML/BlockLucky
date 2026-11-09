'use client';

import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-background px-4">
          <div className="card w-full max-w-md p-6 text-center" role="alert">
            <h1 className="mt-1 mb-2 text-title font-bold">BlockLucky est momentanément indisponible</h1>
            <p className="mb-5 text-body text-fg-secondary">
              Une erreur empêche l&apos;affichage de l&apos;application. Veuillez réessayer dans
              quelques instants.
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-[18px] font-medium text-on-primary hover:bg-primary-light"
            >
              Réessayer
            </button>
            {error.digest ? (
              <p className="mt-4 text-caption text-fg-secondary">Référence : {error.digest}</p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
