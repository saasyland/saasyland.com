import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth"

import { polarCore } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_PRODUCTS } from "~/src/integrations/polar/polar.constants"

import { licenseWebhookHandlers } from "~/src/modules/license/license.webhooks"

import type { AuthPluginEntry } from "~/src/data/auth-plugins"

import { ROUTES } from "~/src/routes"

export const LICENSE_AUTH_PLUGINS = [
  {
    disabledPaths: [ROUTES.API_AUTH_POLAR.CHECKOUT],
    plugin: polar({
      client: polarCore,
      use: [
        checkout({ authenticatedUsersOnly: true, products: POLAR_CHECKOUT_PRODUCTS }),
        portal(),
        webhooks({ ...licenseWebhookHandlers, secret: env.POLAR_WEBHOOK_SECRET }),
      ],
    }),
    rateLimitExemptPaths: [ROUTES.API_AUTH_POLAR.WEBHOOKS],
  },
] as const satisfies readonly AuthPluginEntry[]
