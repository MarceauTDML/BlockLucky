import { readFileSync } from 'node:fs';

const schemaSource = readFileSync(new URL('../src/config/env.config.ts', import.meta.url), 'utf8');
const exampleSource = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

const schemaKeys = new Set(
  [...schemaSource.matchAll(/^\s{4}([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1])
);
const exampleKeys = new Set(
  exampleSource
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map((line) => line.split('=')[0])
);

const missing = [...schemaKeys].filter((key) => !exampleKeys.has(key));
const unknown = [...exampleKeys].filter((key) => !schemaKeys.has(key));

if (missing.length || unknown.length) {
  if (missing.length) console.error(`Variables absentes de .env.example : ${missing.join(', ')}`);
  if (unknown.length) console.error(`Variables inconnues du schéma : ${unknown.join(', ')}`);
  process.exit(1);
}

console.log(`.env.example synchronisé avec le schéma (${schemaKeys.size} variables)`);
