import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const DOC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(DOC_ROOT, 'site');

const listFiles = (dir, base = '') => {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listFiles(path.join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files.sort();
};

const normalized = (file) => {
  const buffer = readFileSync(file);
  return /\.(html|json|css|js|svg|txt)$/.test(file) ? buffer.toString('utf8').replace(/\r\n/g, '\n') : buffer.toString('base64');
};

const temp = mkdtempSync(path.join(os.tmpdir(), 'bl-doc-'));
const problems = [];

try {
  const result = build({ out: temp, strict: true });
  if (!result.ok) {
    console.error('La génération stricte de la documentation a échoué.');
    process.exit(1);
  }

  const fresh = listFiles(temp);
  const committed = listFiles(SITE);
  const freshSet = new Set(fresh);
  for (const file of fresh) {
    if (!committed.includes(file)) problems.push(`site/${file} manque : lancer npm run build`);
    else if (normalized(path.join(temp, file)) !== normalized(path.join(SITE, file))) problems.push(`site/${file} n'est pas à jour : lancer npm run build`);
  }
  for (const file of committed) {
    if (!freshSet.has(file)) problems.push(`site/${file} est obsolète : lancer npm run build`);
  }

  const idsCache = new Map();
  const idsOf = (file) => {
    if (!idsCache.has(file)) idsCache.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    return idsCache.get(file);
  };
  for (const file of fresh.filter((f) => f.endsWith('.html') && f !== '404.html')) {
    const html = readFileSync(path.join(temp, file), 'utf8');
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const value = m[1].replace(/&amp;/g, '&');
      if (/^(https?:|mailto:)/.test(value)) continue;
      const [target, anchor] = value.split('#');
      const resolved = target ? path.join(temp, path.dirname(file), decodeURI(target)) : path.join(temp, file);
      if (!existsSync(resolved)) {
        problems.push(`${file} : lien cassé « ${value} »`);
        continue;
      }
      if (anchor && resolved.endsWith('.html') && !idsOf(resolved).has(decodeURIComponent(anchor))) {
        problems.push(`${file} : ancre absente « ${value} »`);
      }
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (problems.length) {
  for (const problem of problems) console.error(`Erreur : ${problem}`);
  console.error(`${problems.length} problème(s) dans la documentation.`);
  process.exit(1);
}
console.log('Documentation à jour, sans lien cassé ni description manquante.');
