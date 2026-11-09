import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider, { themeInitScript } from '@/theme/ThemeProvider';

export const metadata: Metadata = {
  title: {
    default: "BlockLucky · Loterie citoyenne de la Ville d'EtherBay",
    template: '%s · BlockLucky EtherBay',
  },
  description:
    "Loterie pédagogique de fin d'année de la Ville d'EtherBay : participez avec des ethers fictifs, vérifiez chaque ticket sur la blockchain et soutenez les commerces locaux.",
  applicationName: 'BlockLucky EtherBay',
  openGraph: {
    title: "BlockLucky · Loterie citoyenne d'EtherBay",
    description: 'Une loterie transparente et vérifiable, en ethers fictifs, pour toute la ville.',
    locale: 'fr_FR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F2' },
    { media: '(prefers-color-scheme: dark)', color: '#141413' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
