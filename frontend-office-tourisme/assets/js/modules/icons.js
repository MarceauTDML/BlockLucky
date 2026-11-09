const svg = (body, attrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg ${attrs} aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  arrow: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  chevronLeft: svg('<path d="m15 18-6-6 6-6"/>'),
  chevronRight: svg('<path d="m9 18 6-6-6-6"/>'),
  heart: svg('<path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"/>'),
  bag: svg('<path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  pin: svg('<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="currentColor"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/>'),
  burger: svg('<path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'),
  up: svg('<path d="m6 15 6-6 6 6"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  leaf: svg('<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19 13 11"/>'),
  cookie: svg('<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5Z"/><circle cx="8.5" cy="11" r="1"/><circle cx="12" cy="16" r="1"/><circle cx="15.5" cy="13" r="1"/>'),
  filter: svg('<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>'),
  bed: svg('<path d="M3 18V7"/><path d="M3 13h18v5"/><path d="M7 13V10h5a3 3 0 0 1 3 3"/>'),
  fork: svg('<path d="M7 3v8a2 2 0 0 0 4 0V3"/><path d="M9 11v10"/><path d="M17 21V3c-2 1-3 4-3 7h3"/>'),
  ticket: svg('<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V5H3Z"/><path d="M13 5v14" stroke-dasharray="2 2"/>'),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>'),
  waves: svg('<path d="M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>'),
  youtube: svg('<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" fill="currentColor" stroke="none"/><path d="m10 15 5-3-5-3Z" fill="#C86D51" stroke="none"/>', 'viewBox="0 0 24 24"'),
  instagram: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
  facebook: svg('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" fill="currentColor" stroke="none"/>', 'viewBox="0 0 24 24"'),
  linkedin: svg('<path d="M6.5 9H3v12h3.5V9ZM4.8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 14.2c0-3.3-1.8-5.4-4.6-5.4-1.6 0-2.7.8-3.2 1.6V9H9.8v12h3.5v-6.3c0-1.6.8-2.6 2-2.6s1.9.9 1.9 2.6V21H21v-6.8Z" fill="currentColor" stroke="none"/>', 'viewBox="0 0 24 24"'),
  tiktok: svg('<path d="M16 3c.3 2.3 1.7 3.8 4 4v3.3c-1.5 0-2.8-.4-4-1.2V15a6 6 0 1 1-6-6v3.4a2.6 2.6 0 1 0 2.6 2.6V3H16Z" fill="currentColor" stroke="none"/>', 'viewBox="0 0 24 24"'),
};

export const BRAND_WAVE = `<svg class="brand__wave" viewBox="0 0 22 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M1 4c2.5 0 2.5-2.5 5-2.5S8.5 4 11 4s2.5-2.5 5-2.5S18.5 4 21 4"/><path d="M1 10c2.5 0 2.5-2.5 5-2.5S8.5 10 11 10s2.5-2.5 5-2.5S18.5 10 21 10"/></svg>`;
