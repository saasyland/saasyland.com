import { describe, expect, it } from "vite-plus/test"

import { auth } from "~/src/integrations/better-auth/auth.server"

import { LICENSE_AUTH_PLUGINS } from "~/src/data/license.auth-plugins"

import { ROUTES } from "~/src/routes"

describe("the licence area's Polar plugin", () => {
  it("adds the Polar plugin to Better Auth", () => {
    expect(auth.options.plugins.map(({ id }) => id)).toContain(LICENSE_AUTH_PLUGINS[0].plugin.id)
  })

  it("exempts the webhooks from rate limiting and closes no path", () => {
    expect(auth.options.disabledPaths).toStrictEqual([])
    expect(auth.options.rateLimit.customRules).toHaveProperty([ROUTES.API_AUTH_POLAR.WEBHOOKS], false)
  })

  it("adds no checkout endpoint, so every checkout passes the licence check and carries the account's email in startCheckout", () => {
    expect(auth.api).not.toHaveProperty("checkout")
    expect(auth.api).toHaveProperty("portal")
    expect(auth.api).toHaveProperty("polarWebhooks")
  })
})
