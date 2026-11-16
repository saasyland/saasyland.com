import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { polar, portal, webhooks } from "@polar-sh/better-auth"

import { polarCore } from "~/src/integrations/polar/polar.config"

import type { AuthPluginEntry } from "~/src/data/auth-plugins"
import { handlePolarEvent } from "~/src/data/polar-events"

import { ROUTES } from "~/src/routes"

export const POLAR_AUTH_PLUGINS = [
  {
    plugin: polar({
      client: polarCore,
      use: [portal(), webhooks({ onPayload: handlePolarEvent, secret: env.POLAR_WEBHOOK_SECRET })],
    }),
    rateLimitExemptPaths: [ROUTES.API_AUTH_POLAR.WEBHOOKS],
  },
] as const satisfies readonly AuthPluginEntry[]
