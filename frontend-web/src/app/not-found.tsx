import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <p className="text-caption font-medium text-secondary">Erreur 404</p>
        <h1 className="mt-1 mb-2 text-title font-bold">Page introuvable</h1>
        <p className="mb-5 text-body text-fg-secondary">
          Cette page n&apos;existe pas ou a été déplacée. / This page does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-[18px] font-medium text-on-primary hover:bg-primary-light"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
