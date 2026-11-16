import { defineConfig, devices } from "@playwright/test"

import { LOCAL_SERVER, LOCAL_SERVER_ORIGIN } from "./src/data/local-server.ts"

const isCI = Boolean(process.env["CI"])
const appUrl = process.env["PLAYWRIGHT_BASE_URL"] ?? LOCAL_SERVER_ORIGIN
const startCommand = `bun run start:test --port ${new URL(appUrl).port || String(LOCAL_SERVER.PORT)}`

export const CI_RETRIES = 2
export const DEV_RETRIES = 0
export const CI_WORKERS = 2
export const LOCAL_WORKERS = 1
const E2E_TIMEOUT_MS = 60_000

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  forbidOnly: isCI,
  fullyParallel: true,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "on-failure" }]],
  retries: isCI ? CI_RETRIES : DEV_RETRIES,
  testDir: "./e2e/specs",
  timeout: E2E_TIMEOUT_MS,
  use: {
    baseURL: appUrl,
    navigationTimeout: E2E_TIMEOUT_MS,
    screenshot: "only-on-failure",
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    video: isCI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: isCI ? startCommand : `bun run db:reset:test && bun run build:test && ${startCommand}`,
    reuseExistingServer: !isCI,
    timeout: 600_000,
    url: appUrl,
  },
  workers: isCI ? CI_WORKERS : LOCAL_WORKERS,
})
