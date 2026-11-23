import type { FetchEsque } from "@better-fetch/fetch"
import { describe, expect, it, vi } from "vite-plus/test"

import { authClient } from "~/src/integrations/better-auth/auth.client"

import type * as AuthRoutes from "~/src/areas/auth.shared"

import * as ROUTES from "~/src/routes"

const { SAMPLE_AUTH_BASE } = vi.hoisted(() => ({ SAMPLE_AUTH_BASE: "/sample/auth" }))

vi.mock("~/src/areas/auth.shared", async (importOriginal) => ({
  ...(await importOriginal<typeof AuthRoutes>()),
  API_AUTH_BASE: SAMPLE_AUTH_BASE,
}))

describe("Better Auth client", () => {
  it("sends its requests to the auth routes' base path on the page's origin", async () => {
    const customFetchImpl = vi.fn<FetchEsque>(() => Promise.resolve(Response.json(null)))

    await authClient.getSession({ fetchOptions: { customFetchImpl } })

    expect(ROUTES.API_AUTH_BASE).toBe(SAMPLE_AUTH_BASE)
    expect(customFetchImpl).toHaveBeenCalledWith(
      new URL(`${SAMPLE_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`, location.origin),
      expect.anything(),
    )
  })
})
