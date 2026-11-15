import { describe, expect, it, vi } from "vite-plus/test"

import { clientAddress } from "~/src/integrations/better-auth/auth.middleware"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"

vi.mock(import("better-auth/api"), async (importOriginal) => ({ ...(await importOriginal()), getIP: () => null }))

describe("client address without a resolvable IP", () => {
  it("shares one unknown bucket instead of skipping the limit", () => {
    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "203.0.113.1" }))).toBe("unknown")
  })
})
