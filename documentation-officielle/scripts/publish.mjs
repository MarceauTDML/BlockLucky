import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DOC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(DOC_ROOT, 'site');

const option = (name, fallback) => {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : process.env[`DOCS_${name.toUpperCase().replace(/-/g, '_')}`] ?? fallback;
};

const host = option('host', 'etherbay@etherbay.tech');
const key = option('key', '');
const remoteDir = option('remote-dir', '/opt/edge/docs');

if (!/^[\w./-]+$/.test(remoteDir)) {
  console.error(`Dossier distant invalide : ${remoteDir}`);
  process.exit(1);
}

const check = spawnSync(process.execPath, [path.join(DOC_ROOT, 'scripts', 'check.mjs')], { stdio: 'inherit' });
if (check.status !== 0) {
  console.error('Publication annulée : la documentation doit être à jour et valide (npm run build puis npm run check).');
  process.exit(1);
}
if (!existsSync(path.join(SITE, 'index.html'))) {
  console.error('Publication annulée : site/index.html introuvable.');
  process.exit(1);
}

const sshArgs = [];
if (key) sshArgs.push('-i', key.replace(/^~(?=$|[\\/])/, os.homedir()));
const remote = [
  'set -e',
  `sudo rm -rf ${remoteDir}.new`,
  `sudo mkdir -p ${remoteDir}.new`,
  `sudo tar -xzf - -C ${remoteDir}.new`,
  `sudo rm -rf ${remoteDir}.old`,
  `if [ -d ${remoteDir} ]; then sudo mv ${remoteDir} ${remoteDir}.old; fi`,
  `sudo mv ${remoteDir}.new ${remoteDir}`,
  `sudo chmod -R a+rX ${remoteDir}`,
  `echo "Documentation publiée dans ${remoteDir}"`,
].join(' && ');
sshArgs.push(host, remote);

console.log(`Envoi de site/ vers ${host}:${remoteDir}`);
const tar = spawn('tar', ['-czf', '-', '-C', SITE, '.'], { stdio: ['ignore', 'pipe', 'inherit'] });
const ssh = spawn('ssh', sshArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
tar.stdout.pipe(ssh.stdin);
tar.on('error', (error) => {
  console.error(`tar indisponible : ${error.message}`);
  process.exit(1);
});
ssh.on('error', (error) => {
  console.error(`ssh indisponible : ${error.message}`);
  process.exit(1);
});
ssh.on('close', (code) => process.exit(code ?? 1));
