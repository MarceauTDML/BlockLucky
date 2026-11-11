import { readFileSync } from "node:fs";

const minimum = Number(process.env.COVERAGE_MIN_LINES ?? 100);
const report = readFileSync(new URL("../coverage/lcov.info", import.meta.url), "utf8");

const files = report
  .split("end_of_record")
  .map((record) => ({
    file: /^SF:(.+)$/m.exec(record)?.[1]?.trim().replaceAll("\\", "/"),
    found: Number(/^LF:(\d+)$/m.exec(record)?.[1] ?? 0),
    hit: Number(/^LH:(\d+)$/m.exec(record)?.[1] ?? 0),
  }))
  .filter((entry) => entry.file && entry.file.startsWith("contracts/") && !entry.file.startsWith("contracts/test/"));

if (files.length === 0) {
  console.error("Aucun contrat trouvé dans coverage/lcov.info : lancez d'abord npm run test:coverage");
  process.exit(1);
}

let failed = false;
for (const { file, found, hit } of files) {
  const ratio = found === 0 ? 100 : (hit / found) * 100;
  const ok = ratio >= minimum;
  failed ||= !ok;
  console.log(`${ok ? "OK " : "KO "} ${file} : ${ratio.toFixed(2)} % des lignes couvertes (${hit}/${found}, seuil ${minimum} %)`);
}
process.exit(failed ? 1 : 0);
