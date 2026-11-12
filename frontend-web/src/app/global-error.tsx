'use client';

import './globals.css';
import Icon from '@/components/ui/Icon';

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
          <div className="card w-full max-w-md p-7 text-center" role="alert">
            <span aria-hidden className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sun-chip">
              <Icon name="logoSymbol" size={34} />
            </span>
            <h1 className="mb-2 text-hero font-bold tracking-[-0.6px]">BlockLucky est momentanément indisponible</h1>
            <p className="mb-6 text-body text-fg-secondary">
              Une erreur empêche l&apos;affichage de l&apos;application. Veuillez réessayer dans
              quelques instants.
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-sun px-5 py-3 font-semibold text-on-sun shadow-[0_6px_16px_rgba(172,141,10,0.18)] transition-colors hover:bg-sun-light"
            >
              Réessayer
            </button>
            {error.digest ? (
              <p className="mt-5 text-caption text-fg-muted">Référence : {error.digest}</p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
