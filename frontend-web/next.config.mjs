const isProduction = process.env.NODE_ENV === 'production';

const originOf = (value, fallback) => {
  try {
    return new URL(value || fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
};

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:2053/api');
const wsOrigin = originOf(process.env.NEXT_PUBLIC_WS_URL, 'http://localhost:2053');
const toWebSocket = (origin) => origin.replace(/^http/, 'ws');
const googleIdentity = 'https://accounts.google.com/gsi/';

const connectSources = Array.from(
  new Set(["'self'", apiOrigin, wsOrigin, toWebSocket(apiOrigin), toWebSocket(wsOrigin), googleIdentity])
).join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${googleIdentity}client`,
  `style-src 'self' 'unsafe-inline' ${googleIdentity}style`,
  `frame-src ${googleIdentity}`,
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src ${connectSources}`,
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(apiOrigin.startsWith('https:') ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ...(isProduction ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }] : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      ...(isProduction
        ? [
            {
              source: '/_next/static/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
