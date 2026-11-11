import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "..", "backend", "src", "blockchain", "abi");
const checkOnly = process.argv.includes("--check");
const contracts = ["BlockLucky", "BlockLuckyPOAP"];

mkdirSync(target, { recursive: true });
let outdated = 0;

for (const name of contracts) {
  const artifact = JSON.parse(readFileSync(resolve(root, "artifacts", "contracts", `${name}.sol`, `${name}.json`), "utf8"));
  const content = `${JSON.stringify(artifact.abi, null, 2)}\n`;
  const file = resolve(target, `${name}.json`);
  const current = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";

  if (current === content) {
    console.log(`${name} : ABI à jour`);
    continue;
  }
  if (checkOnly) {
    console.error(`${name} : ABI du backend différente du contrat compilé, lancer npm run export:abi`);
    outdated += 1;
    continue;
  }
  writeFileSync(file, content, "utf8");
  console.log(`${name} : ABI exportée vers ${file}`);
}

if (outdated > 0) process.exit(1);
