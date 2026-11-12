import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Providers from './providers';
import { themeInitScript } from '@/theme/ThemeProvider';

const inter = localFont({
  src: [
    { path: './fonts/Inter_400Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/Inter_500Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/Inter_600SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/Inter_700Bold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/Inter_700Bold_Italic.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

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
    { media: '(prefers-color-scheme: light)', color: '#F6F7FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1626' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
