import { describe, expect, it } from "vite-plus/test"

import { DEFAULT_ROLE_CODE, ROLES, ROLE_CODES, ROLE_VALUES, hasPermission } from "~/src/integrations/better-auth/auth.access"

describe("auth roles", () => {
  it("exposes a single catalog of role codes", () => {
    expect.hasAssertions()
    expect(ROLE_VALUES).toStrictEqual([ROLE_CODES.ADMIN, ROLE_CODES.CUSTOMER])
    expect(DEFAULT_ROLE_CODE).toBe(ROLE_CODES.CUSTOMER)
  })
})

describe("role permission config", () => {
  it("grants admins full app resource access", () => {
    expect.hasAssertions()

    const adminConfig = ROLES.admin
    const refundOrder = adminConfig.authorize({ order: ["refund"] })
    const createCategory = adminConfig.authorize({ category: ["create"] })
    const publishProduct = adminConfig.authorize({ product: ["publish"] })
    const manageSettings = adminConfig.authorize({ settings: ["manage"] })
    const adminConsole = adminConfig.authorize({ admin: ["access"] })

    expect(refundOrder.success).toBe(true)
    expect(createCategory.success).toBe(true)
    expect(publishProduct.success).toBe(true)
    expect(manageSettings.success).toBe(true)
    expect(adminConsole.success).toBe(true)
  })

  it("grants admins the default user and session management statements", () => {
    expect.hasAssertions()

    const adminConfig = ROLES.admin

    expect(adminConfig.authorize({ user: ["list"] }).success).toBe(true)
    expect(adminConfig.authorize({ user: ["ban"] }).success).toBe(true)
    expect(adminConfig.authorize({ session: ["revoke"] }).success).toBe(true)
  })

  it("denies customers app resource access", () => {
    expect.hasAssertions()

    const customerConfig = ROLES.customer
    const readOrder = customerConfig.authorize({ order: ["read"] })
    const createCategory = customerConfig.authorize({ category: ["create"] })
    const createProduct = customerConfig.authorize({ product: ["create"] })
    const manageSettings = customerConfig.authorize({ settings: ["manage"] })
    const adminConsole = customerConfig.authorize({ admin: ["access"] })

    expect(readOrder.success).toBe(false)
    expect(createCategory.success).toBe(false)
    expect(createProduct.success).toBe(false)
    expect(manageSettings.success).toBe(false)
    expect(adminConsole.success).toBe(false)
  })
})

describe("has permission", () => {
  it("returns true when the role grants the permission", () => {
    expect.hasAssertions()
    expect(hasPermission({ permission: { product: ["create"] }, role: ROLE_CODES.ADMIN })).toBe(true)
    expect(hasPermission({ permission: { user: ["list"] }, role: ROLE_CODES.ADMIN })).toBe(true)
  })

  it("returns false when the role does not grant the permission", () => {
    expect.hasAssertions()
    expect(hasPermission({ permission: { user: ["list"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { product: ["create"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { settings: ["manage"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { product: ["create"] }, role: "" })).toBe(false)
    expect(hasPermission({ permission: { product: ["create"] }, role: undefined })).toBe(false)
  })

  it("fails closed for unknown or composite role strings", () => {
    expect.hasAssertions()
    expect(hasPermission({ permission: { product: ["create"] }, role: "unknown-role" })).toBe(false)
    expect(hasPermission({ permission: { product: ["create"] }, role: `customer,${ROLE_CODES.ADMIN}` })).toBe(false)
  })
})
