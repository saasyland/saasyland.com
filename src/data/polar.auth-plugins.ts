import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { polar, portal, webhooks } from "@polar-sh/better-auth"

import { requireVerifiedEmail } from "~/src/integrations/better-auth/auth.hooks"
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
  {
    plugin: {
      hooks: {
        before: [
          {
            handler: requireVerifiedEmail,
            matcher: ({ path }) => path?.startsWith(ROUTES.API_AUTH_POLAR.CUSTOMER) === true,
          },
        ],
      },
      id: "polar-verified-customer",
    },
    rateLimitExemptPaths: [],
  },
] as const satisfies readonly AuthPluginEntry[]
