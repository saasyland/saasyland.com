import "@tanstack/react-start/server-only"

import { revokeAccountLicense } from "~/src/modules/license/use-cases/revoke-account-license"

import type { AuthPluginEntry } from "~/src/data/auth-plugins"

export const LICENSE_AUTH_PLUGINS = [
  {
    plugin: {
      id: "license-retention",
      init: () => ({ options: { databaseHooks: { user: { delete: { before: ({ id }) => revokeAccountLicense(id) } } } } }),
    },
    rateLimitExemptPaths: [],
  },
] as const satisfies readonly AuthPluginEntry[]
