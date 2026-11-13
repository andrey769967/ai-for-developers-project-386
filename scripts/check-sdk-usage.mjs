// Проверяет, что фронтенд ходит в API только через сгенерированный клиент.
// Прямые fetch/axios/XMLHttpRequest в web/src считаются нарушением: они обходят
// типы из контракта и ломают смысл SDK.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = "web/src";
const clientPath = join(root, "lib", "api", "client.ts");

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
}
walk(root);

const problems = [];
for (const file of files) {
  if (file === clientPath) continue;
  const text = readFileSync(file, "utf8");
  if (/\b(fetch|XMLHttpRequest)\s*\(/.test(text) || /from\s+["']axios["']/.test(text)) {
    problems.push(`${file}: прямой HTTP-вызов вместо SDK`);
  }
}

const client = readFileSync(clientPath, "utf8");
if (!client.includes("openapi-fetch")) {
  problems.push(`${clientPath}: клиент не использует openapi-fetch`);
}
if (!client.includes("schema")) {
  problems.push(`${clientPath}: клиент не использует сгенерированные типы`);
}

if (problems.length > 0) {
  console.error("Проверка SDK не прошла:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`SDK ok: ${files.length} файлов, все запросы идут через сгенерированный клиент`);
