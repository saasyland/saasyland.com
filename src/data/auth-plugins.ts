import type { BetterAuthPlugin } from "better-auth"

import * as AREA_AUTH_PLUGINS from "~/src/data/auth-plugins.entries"

export interface AuthPluginEntry {
  readonly disabledPaths: readonly string[]
  readonly plugin: BetterAuthPlugin
  readonly rateLimitExemptPaths: readonly string[]
}

const ENTRIES = Object.values(AREA_AUTH_PLUGINS).flat()

export const AUTH_PLUGINS = ENTRIES.map(({ plugin }) => plugin)

export const DISABLED_AUTH_PATHS = ENTRIES.flatMap(({ disabledPaths }) => disabledPaths)

export const RATE_LIMIT_EXEMPT_AUTH_PATHS = ENTRIES.flatMap(({ rateLimitExemptPaths }) => rateLimitExemptPaths)
