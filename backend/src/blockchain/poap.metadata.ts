import { env } from '../config/env.config';

export const parsePoapFile = (file: string, extension: 'json' | 'svg'): number | null => {
  const match = new RegExp(`^(\\d{1,9})\\.${extension}$`).exec(file);
  if (!match) return null;
  const roundId = Number(match[1]);
  return roundId > 0 ? roundId : null;
};

export const poapMetadata = (roundId: number, baseUrl: string) => ({
  name: `POAP BlockLucky EtherBay, tour n°${roundId}`,
  description:
    "Badge de participation non transférable délivré par la Ville d'EtherBay à chaque citoyen ayant participé à ce tour de la loterie solidaire BlockLucky.",
  image: `${baseUrl.replace(/\/$/, '')}/${roundId}.svg`,
  external_url: env.FRONTEND_URL,
  attributes: [
    { trait_type: 'Tour', value: roundId, display_type: 'number' },
    { trait_type: 'Émetteur', value: "Mairie d'EtherBay" },
    { trait_type: 'Transférable', value: 'Non' },
  ],
});

export const poapImage = (roundId: number): string =>
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">',
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0f766e"/>',
    '</linearGradient></defs>',
    '<circle cx="200" cy="200" r="190" fill="url(#g)"/>',
    '<circle cx="200" cy="200" r="160" fill="none" stroke="#fbbf24" stroke-width="6"/>',
    '<text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#ffffff" font-weight="700">BlockLucky</text>',
    '<text x="200" y="185" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#e2e8f0">Ville d\'EtherBay</text>',
    `<text x="200" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" fill="#fbbf24" font-weight="700">#${roundId}</text>`,
    '<text x="200" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#e2e8f0">Badge de participation</text>',
    '</svg>',
  ].join('');
