import { type Project, defineConfig, devices } from "@playwright/test"

import {
  VISUAL_BROWSER_VARIABLE,
  VISUAL_COLOR_SCHEME,
  VISUAL_MAX_DIFF_PIXEL_RATIO,
  VISUAL_PROJECT,
  VISUAL_SNAPSHOT_PATH,
  VISUAL_SPECS,
  VISUAL_TIMEZONE,
} from "./e2e/data/visual.ts"
import { LOCAL_SERVER, LOCAL_SERVER_ORIGIN, TEST_HOSTS, TEST_SERVER_PORTS } from "./src/data/local-server.ts"

const isCI = Boolean(process.env["CI"])
const appUrl = process.env["PLAYWRIGHT_BASE_URL"] ?? LOCAL_SERVER_ORIGIN
const { host, port } = new URL(appUrl)
const startCommand = `bun run start:test --port ${port}`
const visualBrowser = process.env[VISUAL_BROWSER_VARIABLE]

const visualProject = (wsEndpoint: string): Project => ({
  expect: { toHaveScreenshot: { maxDiffPixelRatio: VISUAL_MAX_DIFF_PIXEL_RATIO } },
  name: VISUAL_PROJECT,
  snapshotPathTemplate: VISUAL_SNAPSHOT_PATH,
  testMatch: VISUAL_SPECS,
  use: {
    ...devices["Desktop Chrome"],
    colorScheme: VISUAL_COLOR_SCHEME,
    connectOptions: { exposeNetwork: "<loopback>", wsEndpoint },
    contextOptions: { reducedMotion: "reduce" },
    timezoneId: VISUAL_TIMEZONE,
  },
})

if (!TEST_HOSTS.includes(host)) {
  throw new Error(
    `The test build does not trust ${host}. Set PLAYWRIGHT_BASE_URL to http://${LOCAL_SERVER.HOST}:<port>, with port ${String(LOCAL_SERVER.PORT)} or a free port from ${String(TEST_SERVER_PORTS.FIRST)} to ${String(TEST_SERVER_PORTS.LAST)}.`,
  )
}

export const SERVER_PORT = port
export const SERVER_URL = appUrl
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
  globalSetup: "./e2e/global-setup.ts",
  projects: [
    { name: "chromium", testIgnore: VISUAL_SPECS, use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", testIgnore: VISUAL_SPECS, use: { ...devices["Desktop Safari"] } },
    ...(visualBrowser === undefined ? [] : [visualProject(visualBrowser)]),
  ],
  reporter: isCI ? [["github"], ["blob"]] : [["list"], ["html", { open: "on-failure" }]],
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
