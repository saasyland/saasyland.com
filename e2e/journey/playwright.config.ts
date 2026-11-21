import { defineConfig, devices } from "@playwright/test"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "../../src/modules/_core/constants/api"
import { LICENSE_TIERS } from "../../src/modules/license/license.constants"
import type { AppOptions } from "../fixtures/test"

const isCI = Boolean(process.env["CI"])

const JOURNEY_TIMEOUT_MS = 600_000

export default defineConfig<AppOptions>({
  expect: {
    timeout: 30_000,
  },
  forbidOnly: isCI,
  fullyParallel: true,
  outputDir: "../../test-results/journey",
  projects: [{ name: "journey", use: { ...devices["Desktop Chrome"] } }],
  reporter: [[isCI ? "github" : "list"], ["html", { open: "never", outputFolder: "../../playwright-report/journey" }]],
  retries: 0,
  testDir: ".",
  timeout: JOURNEY_TIMEOUT_MS,
  use: {
    baseURL: `https://${DEPLOYED_HOSTS[ENVIRONMENT.PREVIEW]}`,
    navigationTimeout: 60_000,
    polarCheckoutDouble: false,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  workers: LICENSE_TIERS.length,
})
