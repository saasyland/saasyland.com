import { describe, expect, it } from "vite-plus/test"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

describe("courses access", () => {
  it("lets admins manage courses and videos", () => {
    expect(hasPermission({ permission: { course: ["create", "delete"] }, role: ROLE_CODES.ADMIN })).toBe(true)
    expect(hasPermission({ permission: { video: ["read", "delete"] }, role: ROLE_CODES.ADMIN })).toBe(true)
  })

  it("keeps customers out of course and video management", () => {
    expect(hasPermission({ permission: { course: ["read"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { video: ["read"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
  })
})
