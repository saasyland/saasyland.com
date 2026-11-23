import { describe, expect, it } from "vite-plus/test"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

describe("products access", () => {
  it("lets admins manage products and categories", () => {
    expect(hasPermission({ permission: { category: ["create", "delete"] }, role: ROLE_CODES.ADMIN })).toBe(true)
    expect(hasPermission({ permission: { product: ["create", "publish"] }, role: ROLE_CODES.ADMIN })).toBe(true)
  })

  it("keeps customers out of products and categories", () => {
    expect(hasPermission({ permission: { category: ["read"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { product: ["read"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
  })
})
