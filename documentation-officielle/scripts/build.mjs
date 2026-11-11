import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSummary } from './lib/summary.mjs';
import { escapeHtml, htmlPathFor, relativeUrl, renderMarkdown, stripTags } from './lib/markdown.mjs';
import { createGenerators } from './lib/generators.mjs';

const DOC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(DOC_ROOT, '..');
const CONTENT = path.join(DOC_ROOT, 'content');
const THEME = path.join(DOC_ROOT, 'theme');
const SITE_NAME = 'Documentation BlockLucky';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  return {
    out: outIndex >= 0 ? path.resolve(args[outIndex + 1]) : path.join(DOC_ROOT, 'site'),
    strict: args.includes('--strict'),
    quiet: args.includes('--quiet'),
  };
};

const versionedPaths = () => {
  const result = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 || !result.stdout) return null;
  const paths = new Set();
  for (const file of result.stdout.split(/\r?\n/).filter(Boolean)) {
    const parts = file.split('/');
    for (let i = 1; i <= parts.length; i++) paths.add(parts.slice(0, i).join('/'));
  }
  return paths;
};

const fill = (template, values) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');

const listMarkdown = (dir, base = '') => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === 'images') continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listMarkdown(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.md') && rel !== 'SUMMARY.md') files.push(rel);
  }
  return files;
};

export const build = ({ out, strict = false, quiet = false } = parseArgs()) => {
  const errors = [];
  const warnings = [];
  const missing = [];
  const summary = parseSummary(path.join(CONTENT, 'SUMMARY.md'));
  const knownSources = new Set(summary.pages.map((p) => p.source));

  for (const file of listMarkdown(CONTENT)) {
    if (!knownSources.has(file)) errors.push(`content/${file} : page absente de SUMMARY.md`);
  }
  for (const page of summary.pages) {
    if (!existsSync(path.join(CONTENT, page.source))) errors.push(`SUMMARY.md : page introuvable « ${page.source} »`);
  }
  if (errors.length) return finish({ errors, missing, strict, quiet });

  const generators = createGenerators({ repoRoot: REPO_ROOT, dataDir: path.join(CONTENT, '_data'), missing });
  const versioned = versionedPaths();
  const generatedCache = new Map();
  const generate = (name, source) => {
    if (!generators[name]) {
      errors.push(`${source} : générateur inconnu « ${name} »`);
      return '';
    }
    if (!generatedCache.has(name)) generatedCache.set(name, generators[name]());
    return generatedCache.get(name);
  };

  const rendered = summary.pages.map((page) => {
    const raw = readFileSync(path.join(CONTENT, page.source), 'utf8').replace(/\r\n/g, '\n');
    const markdown = raw.replace(/^\{\{generated:([\w-]+)\}\}$/gm, (_, name) => generate(name, page.source));
    const result = renderMarkdown({ markdown, source: page.source, knownSources, repoRoot: REPO_ROOT, errors, warnings, strict, versioned });
    return { ...page, ...result, output: htmlPathFor(page.source) };
  });

  const layout = readFileSync(path.join(THEME, 'layout.html'), 'utf8');
  rmSync(out, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  mkdirSync(out, { recursive: true });
  cpSync(path.join(THEME, 'assets'), path.join(out, 'assets'), { recursive: true });
  mkdirSync(path.join(out, 'assets', 'vendor'), { recursive: true });
  cpSync(path.join(DOC_ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'), path.join(out, 'assets', 'vendor', 'mermaid.min.js'));
  if (existsSync(path.join(CONTENT, 'images'))) cpSync(path.join(CONTENT, 'images'), path.join(out, 'images'), { recursive: true });

  const searchIndex = [];
  rendered.forEach((page, index) => {
    const root = path.posix.relative(path.posix.dirname(page.output), '.') || '.';
    const prefix = root === '.' ? '' : `${root}/`;
    const link = (target) => escapeHtml(relativeUrl(page.source, target.output));

    const renderItems = (items) =>
      items
        .map((item) => {
          const target = rendered.find((p) => p.source === item.source);
          const current = item.source === page.source;
          const open = current || page.parents.some((parent) => parent.source === item.source);
          const children = item.children.length ? `<ul>${renderItems(item.children)}</ul>` : '';
          const toggle = item.children.length
            ? `<button class="nav-toggle" type="button" aria-label="Déplier ou replier ${escapeHtml(item.title)}" aria-expanded="${open}"></button>`
            : '';
          const classes = [item.children.length ? 'has-children' : '', open && item.children.length ? 'open' : ''].filter(Boolean).join(' ');
          return `<li${classes ? ` class="${classes}"` : ''}><div class="nav-row"><a href="${link(target)}"${current ? ' aria-current="page"' : ''}>${escapeHtml(item.title)}</a>${toggle}</div>${children}</li>`;
        })
        .join('');
    const nav = summary.groups
      .map((group) => `<div class="nav-group">${group.title ? `<p class="nav-group-title">${escapeHtml(group.title)}</p>` : ''}<ul>${renderItems(group.items)}</ul></div>`)
      .join('');

    const toc = page.headings.length
      ? `<p class="toc-title">Sur cette page</p><ul>${page.headings.map((h) => `<li class="toc-h${h.depth}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ul>`
      : '';
    const crumbs = [page.group.title, ...page.parents.map((p) => p.title)].filter(Boolean).map((t) => `<span>${escapeHtml(t)}</span>`);
    const prev = rendered[index - 1];
    const next = rendered[index + 1];
    const pager = [
      prev ? `<a class="pager-prev" href="${link(prev)}"><span>Précédent</span><strong>${escapeHtml(prev.title)}</strong></a>` : '<span></span>',
      next ? `<a class="pager-next" href="${link(next)}"><span>Suivant</span><strong>${escapeHtml(next.title)}</strong></a>` : '<span></span>',
    ].join('');
    const firstParagraph = /<p>([\s\S]*?)<\/p>/.exec(page.html)?.[1] ?? '';
    const description = stripTags(firstParagraph).replace(/\s+/g, ' ').trim().slice(0, 160);

    const html = fill(layout, {
      title: escapeHtml(page.source === 'README.md' ? SITE_NAME : `${page.title} | ${SITE_NAME}`),
      description: escapeHtml(description),
      root: prefix,
      home: escapeHtml(relativeUrl(page.source, 'index.html')),
      nav,
      toc,
      breadcrumb: crumbs.join(''),
      content: page.html,
      pager,
      mermaid: page.hasMermaid ? `<script src="${prefix}assets/vendor/mermaid.min.js" defer></script>` : '',
      source: escapeHtml(`https://github.com/MarceauTDML/BlockLucky/blob/main/documentation-officielle/content/${page.source}`),
    });
    const target = path.join(out, page.output);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, html);

    const sections = page.html.split(/(?=<h[23] id=")/);
    sections.forEach((chunk, i) => {
      const heading = /^<h[23] id="([^"]+)">[\s\S]*?<\/a>([\s\S]*?)<\/h[23]>/.exec(chunk);
      const text = stripTags(chunk.replace(/<pre[\s\S]*?<\/pre>/g, ' ')).replace(/\s+/g, ' ').trim();
      if (!text) return;
      searchIndex.push({
        p: page.title,
        s: i === 0 || !heading ? '' : stripTags(heading[2]).trim(),
        u: `${page.output}${i === 0 || !heading ? '' : `#${heading[1]}`}`,
        g: page.group.title ?? '',
        t: text.slice(0, 1200),
      });
    });
  });

  writeFileSync(path.join(out, 'search-index.json'), JSON.stringify(searchIndex));
  const notFound = fill(readFileSync(path.join(THEME, '404.html'), 'utf8'), { site: SITE_NAME });
  writeFileSync(path.join(out, '404.html'), notFound);

  return finish({ errors, warnings, missing, strict, quiet, pages: rendered.length, out });
};

const finish = ({ errors, warnings = [], missing, strict, quiet, pages, out }) => {
  for (const error of errors) console.error(`Erreur : ${error}`);
  if (warnings.length && !quiet) {
    console.warn(`${warnings.length} lien(s) vers des pages pas encore présentes dans le sommaire (bloquant pour npm run check) :`);
    for (const warning of warnings.slice(0, 15)) console.warn(`  - ${warning}`);
    if (warnings.length > 15) console.warn('  ...');
  }
  if (missing.length && !quiet) {
    console.warn(`${missing.length} description(s) à compléter dans content/_data :`);
    for (const item of missing.slice(0, strict ? missing.length : 15)) console.warn(`  - ${item}`);
    if (!strict && missing.length > 15) console.warn('  ...');
  }
  const failed = errors.length > 0 || (strict && missing.length > 0);
  if (!failed && !quiet && pages) console.log(`${pages} pages générées dans ${path.relative(process.cwd(), out) || '.'}`);
  return { ok: !failed, errors, missing };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = build();
  if (!result.ok) process.exit(1);
}
