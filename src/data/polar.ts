import type { Environment } from "@polar-sh/sdk/2026-10"

export const POLAR_SERVER = {
  PRODUCTION: "production",
  SANDBOX: "sandbox",
} as const satisfies Record<string, Environment>

export const POLAR_DASHBOARD_HOSTS = {
  [POLAR_SERVER.PRODUCTION]: "polar.sh",
  [POLAR_SERVER.SANDBOX]: "sandbox.polar.sh",
} as const satisfies Record<Environment, string>

export const POLAR_ORGANIZATION_SLUG = "saasyland"
