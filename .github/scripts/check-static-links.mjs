import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const pages = readdirSync(root).filter((file) => file.endsWith('.html'));
const ignored = /^(?:[a-z]+:|\/\/|#|\$\{)/i;
const broken = [];

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const target = match[1].trim();
    if (!target || ignored.test(target)) continue;
    const path = target.split(/[?#]/)[0];
    if (!path) continue;
    const file = join(root, path.startsWith('/') ? path.slice(1) : path);
    if (!existsSync(file)) broken.push(`${page} -> ${target}`);
  }
}

if (broken.length) {
  console.error(`Ressources introuvables (${broken.length}) :\n${broken.join('\n')}`);
  process.exit(1);
}

console.log(`${pages.length} pages vérifiées, aucune ressource locale manquante`);
