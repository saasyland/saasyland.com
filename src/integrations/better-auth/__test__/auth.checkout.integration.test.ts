import { describe, expect, it } from "vite-plus/test"

import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { ROUTES } from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const SERVER_HEADERS = new Headers({ host: new URL(ORIGIN).host })

describe("Polar checkout endpoint", () => {
  it("is not reachable over HTTP, so every checkout passes the license check in startCheckout", async () => {
    const response = await auth.handler(
      new Request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.CHECKOUT}`, {
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
