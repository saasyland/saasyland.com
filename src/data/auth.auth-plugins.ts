import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned"

import type { AuthPluginEntry } from "~/src/data/auth-plugins"

export const AUTH_AUTH_PLUGINS = [{ plugin: haveIBeenPwned(), rateLimitExemptPaths: [] }] as const satisfies readonly AuthPluginEntry[]
