import { describe, expect, it } from "vite-plus/test"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

describe("orders access", () => {
  it("lets admins read, update and refund orders", () => {
    expect(hasPermission({ permission: { order: ["read", "update", "refund"] }, role: ROLE_CODES.ADMIN })).toBe(true)
  })

  it("keeps customers out of orders", () => {
    expect(hasPermission({ permission: { order: ["read"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
  })
})
