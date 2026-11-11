import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const TODO = '*À compléter*';

const cell = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();

const code = (value) => {
  const text = String(value);
  return text.includes('`') ? `<code>${text.replace(/</g, '&lt;')}</code>` : `\`${text}\``;
};

const table = (headers, rows) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const splitTopLevel = (text, separator = ',') => {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === '\\') {
        current += text[++i] ?? '';
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const matchingParen = (text, openIndex) => {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

const literal = (raw, constants = {}) => {
  const value = raw.trim();
  const str = /^(['"`])([\s\S]*)\1$/.exec(value);
  if (str) return str[2];
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  const constant = /^DEV_DEFAULTS\.(\w+)$/.exec(value);
  if (constant && constants[constant[1]] !== undefined) return constants[constant[1]];
  if (value.includes('npm_package_version')) return 'version du package npm, sinon 1.0.0';
  return value;
};

const shorten = (value, max = 46) => (value.length > max ? `${value.slice(0, 18)}…${value.slice(-8)}` : value);

export const createGenerators = ({ repoRoot, dataDir, missing }) => {
  const repo = (...parts) => path.join(repoRoot, ...parts);
  const data = (name) => readJson(path.join(dataDir, `${name}.json`));
  const describe = (scope, key, value) => {
    if (value && String(value).trim()) return value;
    missing.push(`${scope} : ${key}`);
    return TODO;
  };

  const envVariables = () => {
    const source = read(repo('backend/src/config/env.config.ts'));
    const devDefaults = {};
    const devBlock = /const DEV_DEFAULTS = \{([\s\S]*?)\} as const;/.exec(source)?.[1] ?? '';
    for (const m of devBlock.matchAll(/(\w+): '([^']*)'/g)) devDefaults[m[1]] = m[2];

    const objectBlock = /\.object\(\{\n([\s\S]*?)\n\s{2}\}\)/.exec(source)?.[1] ?? '';
    const starts = [...objectBlock.matchAll(/^ {4}([A-Z0-9_]+): /gm)];
    const variables = starts.map((m, index) => {
      const end = index + 1 < starts.length ? starts[index + 1].index : objectBlock.length;
      return { name: m[1], expr: objectBlock.slice(m.index + m[0].length, end).replace(/,\s*$/, '').trim() };
    });

    const refine = source.slice(source.indexOf('.superRefine'));
    const production = {};
    for (const m of refine.matchAll(/\(\[([^\]]+)\] as const\)\.forEach[\s\S]*?message: `\$\{key\} ([^`]+)`/g)) {
      for (const name of m[1].match(/[A-Z0-9_]+/g) ?? []) production[name] = m[2];
    }
    for (const m of refine.matchAll(/path: \['([A-Z0-9_]+)'\],\s*message: '([^']+)'/g)) production[m[1]] = m[2];
    if (/Object\.keys\(DEV_DEFAULTS\)/.test(refine)) {
      for (const name of Object.keys(devDefaults)) production[name] = 'la valeur de développement est refusée en production';
    }

    const meta = data('variables');
    const categories = new Map();
    for (const variable of variables) {
      const { expr } = variable;
      let type = 'chaîne';
      let def = '';
      const constraints = [];
      const bool = /^booleanFromEnv\((true|false)\)/.exec(expr);
      const csv = /^csvList\(('[^']*')\)/.exec(expr);
      const enumMatch = /z\.enum\(\[([^\]]+)\]\)/.exec(expr);
      if (bool) {
        type = 'booléen (true, false, 1, 0)';
        def = bool[1];
      } else if (csv) {
        type = 'liste séparée par des virgules';
        def = literal(csv[1]);
      } else if (enumMatch) {
        type = `énumération : ${enumMatch[1].replace(/'/g, '').split(',').map((v) => v.trim()).join(', ')}`;
      } else if (/z\.coerce\.number\(\)/.test(expr)) {
        type = /\.int\(\)/.test(expr) ? 'entier' : 'nombre';
      } else if (/\.url\(\)/.test(expr)) {
        type = 'URL';
      }
      const defaultArg = /\.default\(/.exec(expr);
      if (!bool && !csv && defaultArg) {
        const open = defaultArg.index + defaultArg[0].length - 1;
        def = literal(expr.slice(open + 1, matchingParen(expr, open)), devDefaults);
      }
      if (/\.optional\(\)/.test(expr)) def = 'aucune (facultative)';
      const min = /\.min\((\d+)\)/.exec(expr);
      const max = /\.max\((\d+)\)/.exec(expr);
      if (/\.positive\(\)/.test(expr)) constraints.push('strictement positif');
      if (min) constraints.push(type === 'entier' ? `minimum ${min[1]}` : `au moins ${min[1]} caractères`);
      if (max) constraints.push(`maximum ${max[1]}`);
      const regex = /\.regex\((\/[^,]+?\/[a-z]*)(?:,\s*'([^']+)')?\)/.exec(expr);
      if (regex) constraints.push(regex[2] ?? `format ${code(regex[1])}`);
      const refineMessage = /\.refine\([\s\S]*?,\s*'([^']+)'\)/.exec(expr);
      if (refineMessage) constraints.push(refineMessage[1]);
      if (production[variable.name]) constraints.push(`production : ${production[variable.name]}`);
      if (devDefaults[variable.name] !== undefined) def = `${shorten(def)} (développement)`;

      const info = meta[variable.name] ?? {};
      const category = info.categorie || 'Non classées';
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push([
        code(variable.name),
        type,
        def === '' ? 'chaîne vide' : code(shorten(def)),
        constraints.join(' ; ') || '-',
        describe('Variable d\'environnement', variable.name, info.description),
      ]);
    }
    for (const name of Object.keys(meta)) {
      if (!variables.some((v) => v.name === name)) missing.push(`Variable décrite mais absente du code : ${name}`);
    }

    const parts = [
      `Le schéma de configuration compte **${variables.length} variables**, lues et validées au démarrage par ${code('backend/src/config/env.config.ts')}. Une valeur invalide arrête le processus avec la liste des erreurs.`,
    ];
    for (const [category, rows] of categories) {
      parts.push(`### ${category}`, table(['Variable', 'Type', 'Valeur par défaut', 'Contraintes', 'Rôle'], rows));
    }
    return parts.join('\n\n');
  };

  const prismaModel = () => {
    const schema = read(repo('backend/prisma/schema.prisma'));
    const blocks = [...schema.matchAll(/^(model|enum) (\w+) \{\n([\s\S]*?)^\}/gm)].map((m) => ({
      kind: m[1],
      name: m[2],
      body: m[3],
    }));
    const modelNames = new Set(blocks.filter((b) => b.kind === 'model').map((b) => b.name));
    const enumNames = new Set(blocks.filter((b) => b.kind === 'enum').map((b) => b.name));
    const checks = {};
    const migrationsDir = repo('backend/prisma/migrations');
    for (const dir of readdirSync(migrationsDir).sort()) {
      const file = path.join(migrationsDir, dir, 'migration.sql');
      if (!existsSync(file)) continue;
      const sql = read(file);
      for (const m of sql.matchAll(/ALTER TABLE "(\w+)"[\s\S]*?ADD CONSTRAINT "(\w+)" CHECK \(([\s\S]*?)\)( NOT VALID)?;/g)) {
        (checks[m[1]] ??= []).push({ name: m[2], expr: m[3].replace(/\s+/g, ' ') });
      }
    }
    const meta = data('modele-donnees');
    const parts = [];
    for (const block of blocks.filter((b) => b.kind === 'model')) {
      const info = meta.modeles?.[block.name] ?? {};
      const rows = [];
      const extras = [];
      for (const line of block.body.split('\n').map((l) => l.trim()).filter(Boolean)) {
        if (line.startsWith('//')) continue;
        if (line.startsWith('@@')) {
          extras.push(line);
          continue;
        }
        const m = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/.exec(line);
        if (!m) continue;
        const [, field, baseType, list, optional, attrs] = m;
        const isRelation = modelNames.has(baseType);
        const def = /@default\(((?:[^()]|\([^()]*\))*)\)/.exec(attrs)?.[1] ?? '';
        const flags = [];
        if (/@id\b/.test(attrs)) flags.push('clé primaire');
        if (/@unique\b/.test(attrs)) flags.push('unique');
        if (/@updatedAt\b/.test(attrs)) flags.push('mis à jour automatiquement');
        const db = /@db\.(\w+(?:\([^)]*\))?)/.exec(attrs);
        if (db) flags.push(`PostgreSQL ${db[1]}`);
        const relation = /@relation\(([^)]*)\)/.exec(attrs);
        if (relation && /fields:/.test(relation[1])) {
          const fields = /fields: \[([^\]]+)\]/.exec(relation[1])?.[1];
          const onDelete = /onDelete: (\w+)/.exec(relation[1])?.[1];
          flags.push(`clé étrangère ${fields}${onDelete ? `, suppression ${onDelete}` : ''}`);
        }
        let type = `${baseType}${list ? '[]' : ''}`;
        if (isRelation) type = `relation vers ${baseType}${list ? ' (plusieurs)' : ''}`;
        else if (enumNames.has(baseType)) type = `énumération ${baseType}${list ? '[]' : ''}`;
        rows.push([
          code(field),
          type,
          optional || list ? 'non' : 'oui',
          def ? code(def) : '-',
          flags.join(' ; ') || '-',
          describe(`Champ ${block.name}`, field, info.champs?.[field]),
        ]);
      }
      parts.push(`### ${block.name}`);
      parts.push(describe('Modèle', block.name, info.description));
      parts.push(table(['Champ', 'Type', 'Obligatoire', 'Défaut', 'Contraintes', 'Rôle'], rows));
      const indexLines = extras.map((line) => {
        const kind = line.startsWith('@@unique') ? 'Unicité' : line.startsWith('@@index') ? 'Index' : 'Attribut';
        return `- ${kind} : ${code(line)}`;
      });
      for (const check of checks[block.name] ?? []) indexLines.push(`- Contrainte CHECK ${code(check.name)} : ${code(check.expr)}`);
      if (indexLines.length) parts.push(`Index et contraintes de la table :\n\n${indexLines.join('\n')}`);
    }
    parts.push('### Énumérations');
    for (const block of blocks.filter((b) => b.kind === 'enum')) {
      const info = meta.enumerations?.[block.name] ?? {};
      const values = block.body.split('\n').map((l) => l.trim()).filter(Boolean);
      parts.push(`#### ${block.name}`);
      parts.push(describe('Énumération', block.name, info.description));
      parts.push(table(['Valeur', 'Signification'], values.map((v) => [code(v), describe(`Valeur ${block.name}`, v, info.valeurs?.[v])])));
    }
    return parts.join('\n\n');
  };

  const routesReference = () => {
    const app = read(repo('backend/src/app.ts'));
    const imports = {};
    for (const m of app.matchAll(/import (\w+) from '\.\/api\/(\w+)\/(\w+)\.routes';/g)) imports[m[1]] = m[2];
    const mounts = [];
    for (const m of app.matchAll(/apiRouter\.use\('([^']+)', (\w+)\)/g)) mounts.push({ prefix: `/api/v1${m[1]}`, module: imports[m[2]] });
    const rootMounted = [...app.matchAll(/app\.use\((\w+Routes)\)/g)].map((m) => imports[m[1]]).filter(Boolean);
    for (const module of rootMounted) mounts.unshift({ prefix: '', module });

    const moduleNames = data('modules-api');
    const parts = [
      'Chaque route est servie sous `/api/v1` et, pour compatibilité, sous `/api`. Les sondes et métriques du module système sont à la racine du serveur.',
    ];
    let total = 0;
    for (const mount of mounts) {
      const file = repo(`backend/src/api/${mount.module}/${mount.module}.routes.ts`);
      if (!existsSync(file)) continue;
      const source = read(file);
      const routerLevel = [];
      const routes = [];
      const re = /router\.(use|get|post|put|patch|delete)\(/g;
      let m;
      let lastEnd = 0;
      while ((m = re.exec(source))) {
        const open = m.index + m[0].length - 1;
        const close = matchingParen(source, open);
        const args = splitTopLevel(source.slice(open + 1, close));
        const between = source.slice(lastEnd, m.index);
        lastEnd = close;
        if (m[1] === 'use') {
          routerLevel.push(...args);
          continue;
        }
        const summary = /summary: (.+)/.exec(between.slice(between.lastIndexOf('/**')))?.[1]?.trim();
        const middlewares = [...routerLevel, ...args.slice(1, -1)];
        const roles = middlewares.map((a) => /requireRoles\(([^)]*)\)/.exec(a)?.[1]).filter(Boolean).join(', ').replace(/'/g, '');
        const authenticated = middlewares.some((a) => /^authenticate$/.test(a));
        const access = roles ? `rôle ${roles}` : authenticated ? 'connecté' : 'public';
        const notes = middlewares
          .filter((a) => !/^authenticate$|^requireRoles/.test(a))
          .map((a) => {
            const validate = /^validate\((\w+)/.exec(a);
            if (validate) return `validation ${code(validate[1])}`;
            if (a === 'idempotency') return 'idempotence';
            return code(a.replace(/\s+/g, ' '));
          });
        const routePath = literal(args[0]);
        routes.push([code(m[1].toUpperCase()), code(`${mount.prefix}${routePath}`), access, notes.join(', ') || '-', summary ?? TODO]);
      }
      total += routes.length;
      const label = moduleNames[mount.module] ?? mount.module;
      parts.push(`### ${label}`, `Fichier source : [${code(`backend/src/api/${mount.module}/${mount.module}.routes.ts`)}](src:backend/src/api/${mount.module}/${mount.module}.routes.ts)`);
      parts.push(table(['Méthode', 'Chemin', 'Accès', 'Contrôles', 'Résumé (OpenAPI)'], routes));
    }
    parts.splice(1, 0, `L'API expose **${total} routes** réparties en ${mounts.length} modules.`);
    return parts.join('\n\n');
  };

  const socketEvents = () => {
    const source = read(repo('backend/src/types/socket.types.ts'));
    const section = (name) => /export interface \w+ \{\n([\s\S]*?)\n\}/.exec(source.slice(source.indexOf(`export interface ${name}`)))?.[1] ?? '';
    const meta = data('evenements-socket');
    const rows = (body, scope) =>
      [...body.matchAll(/'([^']+)': \(([^)]*)\) => void;/g)].map((m) => [
        code(m[1]),
        code(m[2].replace(/^\w+\??: /, '')),
        describe(`Événement ${scope}`, m[1], meta[m[1]]),
      ]);
    const interfaces = [...source.matchAll(/export interface (\w+Event|\w+Payload) \{[\s\S]*?\n\}/g)].map((m) => m[0]);
    return [
      '### Du serveur vers les clients',
      table(['Événement', 'Données', 'Rôle'], rows(section('ServerToClientEvents'), 'serveur')),
      '### Des clients vers le serveur',
      table(['Événement', 'Données', 'Rôle'], rows(section('ClientToServerEvents'), 'client')),
      '### Types des données',
      `Définis dans [${code('backend/src/types/socket.types.ts')}](src:backend/src/types/socket.types.ts) :`,
      '```typescript\n' + interfaces.join('\n\n') + '\n```',
    ].join('\n\n');
  };

  const INHERITED = {
    grantRole: 'AccessControl (OpenZeppelin)',
    revokeRole: 'AccessControl (OpenZeppelin)',
    renounceRole: 'AccessControl (OpenZeppelin)',
    hasRole: 'AccessControl (OpenZeppelin)',
    getRoleAdmin: 'AccessControl (OpenZeppelin)',
    DEFAULT_ADMIN_ROLE: 'AccessControl (OpenZeppelin)',
    paused: 'Pausable (OpenZeppelin)',
    rawFulfillRandomWords: 'VRFConsumerBaseV2Plus (Chainlink)',
    s_vrfCoordinator: 'VRFConsumerBaseV2Plus (Chainlink)',
    setCoordinator: 'VRFConsumerBaseV2Plus (Chainlink)',
    owner: 'ConfirmedOwner (Chainlink)',
    transferOwnership: 'ConfirmedOwner (Chainlink)',
    acceptOwnership: 'ConfirmedOwner (Chainlink)',
  };

  const contractReference = (contractName) => {
    const abi = JSON.parse(read(repo(`backend/src/blockchain/abi/${contractName}.json`)));
    const sol = read(repo(`smart-contract/contracts/${contractName}.sol`));
    const meta = data('contrats')[contractName] ?? {};
    const own = new Map();
    for (const m of sol.matchAll(/function (\w+)\(([^)]*)\)([^{;]*)[{;]/g)) own.set(m[1], m[3].replace(/\s+/g, ' ').trim());
    const stateVars = new Set([
      ...[...sol.matchAll(/^\s+[\w\[\]]+\s+public\s+(?:constant\s+|immutable\s+)?(\w+)/gm)].map((m) => m[1]),
      ...[...sol.matchAll(/^\s+mapping\s*\(.*\)\s+public\s+(\w+)/gm)].map((m) => m[1]),
    ]);
    const fmtParams = (params) =>
      params.map((p) => `${p.type}${p.indexed ? ' indexed' : ''}${p.name ? ` ${p.name}` : ''}`).join(', ');
    const modifierList = (signature) =>
      (signature ?? '')
        .replace(/returns\s*\(.*\)/, '')
        .split(/\s+(?![^(]*\))/)
        .filter((token) => token && !['external', 'public', 'override', 'virtual'].includes(token))
        .join(' ');

    const functions = abi.filter((e) => e.type === 'function').sort((a, b) => a.name.localeCompare(b.name));
    const ownRows = [];
    const inheritedRows = [];
    for (const fn of functions) {
      const params = fmtParams(fn.inputs ?? []);
      const returns = fmtParams(fn.outputs ?? []) || '-';
      const signature = own.get(fn.name);
      const isState = stateVars.has(fn.name);
      if (signature !== undefined || isState) {
        ownRows.push([
          code(`${fn.name}(${params})`),
          returns === '-' ? '-' : code(returns),
          isState ? 'variable publique' : fn.stateMutability,
          code(modifierList(signature) || '-').replace('`-`', '-'),
          describe(`${contractName}, fonction`, fn.name, meta.fonctions?.[fn.name]),
        ]);
      } else {
        inheritedRows.push([code(`${fn.name}(${params})`), returns === '-' ? '-' : code(returns), fn.stateMutability, INHERITED[fn.name] ?? (contractName === 'BlockLuckyPOAP' ? 'ERC721 ou AccessControl (OpenZeppelin)' : 'contrat parent'), meta.fonctions?.[fn.name] ?? '-']);
      }
    }
    const events = abi.filter((e) => e.type === 'event').sort((a, b) => a.name.localeCompare(b.name));
    const errors = abi.filter((e) => e.type === 'error').sort((a, b) => a.name.localeCompare(b.name));
    const ownEvents = new Set([...sol.matchAll(/event (\w+)\(/g)].map((m) => m[1]));
    const ownErrors = new Set([...sol.matchAll(/error (\w+)\(/g)].map((m) => m[1]));
    return [
      `Source : [${code(`smart-contract/contracts/${contractName}.sol`)}](src:smart-contract/contracts/${contractName}.sol). ABI : [${code(`backend/src/blockchain/abi/${contractName}.json`)}](src:backend/src/blockchain/abi/${contractName}.json), vérifiée en CI par ${code('node scripts/export-abi.mjs --check')}.`,
      `### Fonctions du contrat`,
      table(['Fonction', 'Retour', 'Mutabilité', 'Modificateurs', 'Rôle'], ownRows),
      `### Fonctions héritées`,
      table(['Fonction', 'Retour', 'Mutabilité', 'Origine', 'Rôle'], inheritedRows),
      `### Événements`,
      table(
        ['Événement', 'Paramètres', 'Rôle'],
        events.map((e) => [code(e.name), code(fmtParams(e.inputs)), ownEvents.has(e.name) ? describe(`${contractName}, événement`, e.name, meta.evenements?.[e.name]) : `hérité (${meta.evenements?.[e.name] ?? 'contrat parent'})`]),
      ),
      `### Erreurs`,
      table(
        ['Erreur', 'Paramètres', 'Déclenchée quand'],
        errors.map((e) => [code(e.name), e.inputs.length ? code(fmtParams(e.inputs)) : '-', ownErrors.has(e.name) ? describe(`${contractName}, erreur`, e.name, meta.erreurs?.[e.name]) : `héritée (${meta.erreurs?.[e.name] ?? 'contrat parent'})`]),
      ),
    ].join('\n\n');
  };

  const PROJECTS = [
    ['smart-contract', 'Smart contracts'],
    ['backend', 'Backend'],
    ['frontend-web', 'Frontend web'],
    ['mobile-app', 'Application mobile'],
    ['frontend-office-tourisme', 'Office de Tourisme'],
    ['documentation-officielle', 'Documentation officielle'],
  ];

  const stackVersions = () => {
    const parts = [];
    for (const [dir, label] of PROJECTS) {
      const file = repo(dir, 'package.json');
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(read(file));
      const rows = [
        ...Object.entries(pkg.dependencies ?? {}).map(([n, v]) => [code(n), code(v), 'exécution']),
        ...Object.entries(pkg.devDependencies ?? {}).map(([n, v]) => [code(n), code(v), 'développement']),
      ];
      if (!rows.length) continue;
      parts.push(`### ${label}`, `Fichier : [${code(`${dir}/package.json`)}](src:${dir}/package.json)${pkg.engines?.node ? `, Node.js ${code(pkg.engines.node)}` : ''}.`, table(['Paquet', 'Version demandée', 'Usage'], rows));
    }
    return parts.join('\n\n');
  };

  const npmScripts = () => {
    const parts = [];
    for (const [dir, label] of PROJECTS) {
      const file = repo(dir, 'package.json');
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(read(file));
      const rows = Object.entries(pkg.scripts ?? {}).map(([n, v]) => [code(`npm run ${n}`), code(v)]);
      if (!rows.length) continue;
      parts.push(`### ${label}`, `Depuis le dossier ${code(`${dir}/`)} :`, table(['Commande', 'Ce qu\'elle exécute'], rows));
    }
    return parts.join('\n\n');
  };

  const composeServices = () => {
    const compose = YAML.parse(read(repo('docker-compose.yml')), { merge: true });
    const meta = data('services-compose');
    const rows = Object.entries(compose.services).map(([name, service]) => {
      const source = service.image ? code(service.image) : `build ${code(service.build?.context ?? service.build)}${service.build?.target ? `, cible ${code(service.build.target)}` : ''}`;
      const ports = (service.ports ?? []).map((p) => code(p)).join(', ') || '-';
      const profile = service.profiles?.join(', ') ?? 'par défaut';
      const deps = service.depends_on
        ? Object.entries(Array.isArray(service.depends_on) ? Object.fromEntries(service.depends_on.map((d) => [d, {}])) : service.depends_on)
            .map(([d, c]) => `${d}${c?.condition ? ` (${c.condition.replace('service_', '')})` : ''}`)
            .join(', ')
        : '-';
      const context = typeof service.build === 'string' ? service.build : service.build?.context;
      const dockerfile = context ? path.join(repoRoot, context, service.build?.dockerfile ?? 'Dockerfile') : null;
      const imageProbe = dockerfile && existsSync(dockerfile) && /^HEALTHCHECK\s+(?!NONE)/m.test(read(dockerfile));
      const probe = service.healthcheck ? 'oui (Compose)' : imageProbe ? 'oui (Dockerfile)' : 'non';
      return [code(name), source, profile, ports, deps, probe, describe('Service Docker Compose', name, meta[name])];
    });
    return table(['Service', 'Image ou build', 'Profil', 'Ports', 'Dépend de', 'Sonde', 'Rôle'], rows);
  };

  const ciJobs = () => {
    const parts = [];
    for (const file of ['ci.yml', 'codeql.yml']) {
      const full = repo('.github/workflows', file);
      if (!existsSync(full)) continue;
      const workflow = YAML.parse(read(full));
      parts.push(`### Workflow ${code(file)} : ${workflow.name}`);
      const triggers = Object.keys(workflow.on ?? workflow[true] ?? {}).join(', ');
      if (triggers) parts.push(`Déclencheurs : ${triggers}.`);
      for (const [id, job] of Object.entries(workflow.jobs ?? {})) {
        const needs = [job.needs ?? []].flat();
        const steps = (job.steps ?? []).map((step, index) => `${index + 1}. ${step.name ?? (step.uses ? `action ${code(step.uses.split('@')[0])}` : code(String(step.run).split('\n')[0]))}`);
        parts.push(`#### ${job.name ?? id}`, `Identifiant ${code(id)}${needs.length ? `, après ${needs.map(code).join(', ')}` : ''}${job['timeout-minutes'] ? `, délai maximal ${job['timeout-minutes']} minutes` : ''}.`, steps.join('\n'));
      }
    }
    return parts.join('\n\n');
  };

  const migrations = () => {
    const dir = repo('backend/prisma/migrations');
    const meta = data('migrations');
    const rows = readdirSync(dir)
      .filter((name) => /^\d{14}_/.test(name))
      .sort()
      .map((name) => {
        const stamp = name.slice(0, 14);
        const date = `${stamp.slice(6, 8)}/${stamp.slice(4, 6)}/${stamp.slice(0, 4)} ${stamp.slice(8, 10)}:${stamp.slice(10, 12)}`;
        return [`[${code(name)}](src:backend/prisma/migrations/${name}/migration.sql)`, date, describe('Migration', name, meta[name])];
      });
    return table(['Migration', 'Date', 'Contenu'], rows);
  };

  return {
    'variables-environnement': envVariables,
    'dictionnaire-donnees': prismaModel,
    'reference-api': routesReference,
    'evenements-socket': socketEvents,
    'contrat-blocklucky': () => contractReference('BlockLucky'),
    'contrat-poap': () => contractReference('BlockLuckyPOAP'),
    'versions-stack': stackVersions,
    'scripts-npm': npmScripts,
    'services-compose': composeServices,
    'jobs-ci': ciJobs,
    migrations,
  };
};
