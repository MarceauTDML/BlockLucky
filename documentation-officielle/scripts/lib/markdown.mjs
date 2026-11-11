import { existsSync } from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import hljs from 'highlight.js';

export const REPO_URL = 'https://github.com/MarceauTDML/BlockLucky';
export const REPO_BRANCH = 'main';

const LANGUAGE_ALIASES = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  yml: 'yaml',
  ps1: 'powershell',
  html: 'xml',
  env: 'ini',
  dotenv: 'ini',
};

const LANGUAGE_LABELS = {
  bash: 'Terminal',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  yaml: 'YAML',
  sql: 'SQL',
  solidity: 'Solidity',
  prisma: 'Prisma',
  dockerfile: 'Dockerfile',
  ini: 'Configuration',
  http: 'HTTP',
  xml: 'HTML',
  css: 'CSS',
  powershell: 'PowerShell',
  caddyfile: 'Caddyfile',
  nginx: 'Nginx',
  text: 'Texte',
  diff: 'Diff',
};

const HINTS = {
  NOTE: { cls: 'note', label: 'À savoir' },
  TIP: { cls: 'tip', label: 'Astuce' },
  IMPORTANT: { cls: 'important', label: 'Important' },
  WARNING: { cls: 'warning', label: 'Attention' },
  CAUTION: { cls: 'caution', label: 'Danger' },
};

export const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const stripTags = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

export const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

const toPosix = (value) => value.split(path.sep).join('/');

export const htmlPathFor = (source) => source.replace(/README\.md$/i, 'index.md').replace(/\.md$/, '.html');

export const relativeUrl = (fromSource, toHtml) => {
  const fromDir = path.posix.dirname(htmlPathFor(fromSource));
  const rel = path.posix.relative(fromDir, toHtml);
  return rel === '' ? path.posix.basename(toHtml) : rel;
};

export const renderMarkdown = ({ markdown, source, knownSources, repoRoot, errors, warnings = errors, strict = true, versioned = null }) => {
  const headings = [];
  const usedIds = new Set();
  let hasMermaid = false;
  let title = null;

  const uniqueId = (text) => {
    const base = slugify(text);
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  const resolveHref = (href) => {
    if (href.startsWith('src:')) {
      const [target, line] = href.slice(4).split('#');
      const clean = target.replace(/\/$/, '');
      if (!existsSync(path.join(repoRoot, clean))) {
        errors.push(`${source} : fichier du dépôt introuvable « ${clean} »`);
      } else if (versioned && !versioned.has(clean)) {
        errors.push(`${source} : « ${clean} » existe mais n'est pas versionné, le lien sera cassé sur GitHub`);
      }
      const kind = clean.includes('.') && !target.endsWith('/') ? 'blob' : 'tree';
      return { url: `${REPO_URL}/${kind}/${REPO_BRANCH}/${clean}${line ? `#${line}` : ''}`, external: true };
    }
    if (/^(https?:|mailto:)/.test(href)) return { url: href, external: href.startsWith('http') };
    if (href.startsWith('#')) return { url: href, external: false };
    const [target, anchor] = href.split('#');
    if (!target.endsWith('.md')) {
      errors.push(`${source} : lien non pris en charge « ${href} » (utiliser une page .md, src: ou une URL)`);
      return { url: href, external: false };
    }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), target));
    if (!knownSources.has(resolved)) {
      (strict ? errors : warnings).push(`${source} : lien vers une page absente du sommaire « ${href} »`);
    }
    const url = relativeUrl(source, htmlPathFor(resolved));
    return { url: anchor ? `${url}#${anchor}` : url, external: false };
  };

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const text = stripTags(inner).trim();
        if (depth === 1) {
          if (title) errors.push(`${source} : plusieurs titres de niveau 1`);
          title = text;
          return `<h1>${inner}</h1>\n`;
        }
        const id = uniqueId(text);
        if (depth <= 3) headings.push({ depth, text, id });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const raw = (lang || 'text').trim().split(/\s+/)[0].toLowerCase();
        if (raw === 'mermaid') {
          hasMermaid = true;
          return `<div class="diagram"><pre class="mermaid">${escapeHtml(text)}</pre></div>\n`;
        }
        const language = LANGUAGE_ALIASES[raw] ?? raw;
        const highlighted = hljs.getLanguage(language)
          ? hljs.highlight(text, { language, ignoreIllegals: true }).value
          : escapeHtml(text);
        const label = LANGUAGE_LABELS[language] ?? language;
        return `<div class="code-block"><div class="code-head"><span>${escapeHtml(label)}</span></div><pre><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre></div>\n`;
      },
      link({ href, title: linkTitle, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const { url, external } = resolveHref(href);
        const titleAttr = linkTitle ? ` title="${escapeHtml(linkTitle)}"` : '';
        const extra = external ? ' class="external" target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(url)}"${titleAttr}${extra}>${inner}</a>`;
      },
      image({ href, title: imageTitle, text }) {
        if (!/^https?:/.test(href)) {
          const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), href));
          if (!existsSync(path.join(repoRoot, 'documentation-officielle', 'content', resolved))) {
            errors.push(`${source} : image introuvable « ${href} »`);
          }
        }
        const titleAttr = imageTitle ? ` title="${escapeHtml(imageTitle)}"` : '';
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}" loading="lazy"${titleAttr}>`;
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        const match = /^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>)?\s*/.exec(body);
        if (!match) return `<blockquote>\n${body}</blockquote>\n`;
        const hint = HINTS[match[1]];
        const rest = body.slice(match[0].length).replace(/^<\/p>\s*/, '');
        const content = rest.startsWith('<') ? rest : `<p>${rest}`;
        return `<div class="hint hint-${hint.cls}"><p class="hint-title">${hint.label}</p>\n${content}</div>\n`;
      },
    },
  });

  let html = marked.parse(markdown);
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');

  if (!title) errors.push(`${source} : titre de niveau 1 manquant`);
  return { html, headings, hasMermaid, title: title ?? toPosix(source) };
};
