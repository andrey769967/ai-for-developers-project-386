import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { CONFIG, resolvePort } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const port = resolvePort();
  const staticDir = isAbsolute(CONFIG.staticDir)
    ? CONFIG.staticDir
    : join(__dirname, CONFIG.staticDir);

  const app = await buildApp({ logger: true, seed: true, staticDir });

  try {
    await app.listen({ port, host: CONFIG.host });
    app.log.info(`Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
