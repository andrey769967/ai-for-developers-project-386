import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  // Настоящий сервер с собранным фронтендом: никаких моков API.
  webServer: {
    command: "node server/dist/index.js",
    url: `http://127.0.0.1:${PORT}/health`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      STATIC_DIR: resolve("web/dist"),
    } as Record<string, string>,
  },
});
