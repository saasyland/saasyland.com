import { describe, expect, it } from "vite-plus/test"

import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { LICENSE_AUTH_PLUGINS } from "~/src/data/license.auth-plugins"

import { ROUTES } from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const SERVER_HEADERS = new Headers({ host: new URL(ORIGIN).host })

describe("the licence area's Polar plugin", () => {
  it("adds the Polar plugin to Better Auth", () => {
    expect(auth.options.plugins.map(({ id }) => id)).toContain(LICENSE_AUTH_PLUGINS[0].plugin.id)
  })

  it("closes the checkout endpoint to HTTP and exempts the webhooks from rate limiting", () => {
    expect(auth.options.disabledPaths).toStrictEqual([ROUTES.API_AUTH_POLAR.CHECKOUT])
    expect(auth.options.rateLimit.customRules).toHaveProperty([ROUTES.API_AUTH_POLAR.WEBHOOKS], false)
  })
})

describe("Polar checkout endpoint", () => {
  it("is not reachable over HTTP, so every checkout passes the license check in startCheckout", async () => {
    const response = await auth.handler(
      new Request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH_POLAR.CHECKOUT}`, {
        body: JSON.stringify({ slug: LICENSE_TIER.CORE }),
        headers: { "content-type": "application/json", origin: ORIGIN },
        method: "POST",
      }),
    )

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("stays available to the server, where it still requires a signed-in buyer", async () => {
    await expect(auth.api.checkout({ body: { slug: LICENSE_TIER.CORE }, headers: SERVER_HEADERS })).rejects.toThrow(
      "You must be logged in to checkout",
    )
  })
})
