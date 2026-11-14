import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"
import { describe, expect, it } from "vite-plus/test"

import { ROLES, ac, hasPermission } from "~/src/integrations/better-auth/auth.access"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import { APP_STATEMENTS, grantsOf } from "~/src/data/access"

describe("role permission config", () => {
  it("checks every statement Better Auth and the areas declare", () => {
    expect(ac.statements).toStrictEqual({ ...defaultStatements, ...APP_STATEMENTS })
  })

  it("grants admins what the areas grant them and Better Auth's user and session management", () => {
    expect(ROLES.admin.statements).toStrictEqual({ ...grantsOf(ROLE_CODES.ADMIN), ...adminAc.statements })
    expect(ROLES.admin.authorize({ user: ["list"] }).success).toBe(true)
    expect(ROLES.admin.authorize({ user: ["ban"] }).success).toBe(true)
    expect(ROLES.admin.authorize({ session: ["revoke"] }).success).toBe(true)
  })

  it("grants customers only what the areas grant them", () => {
    expect(ROLES.customer.statements).toStrictEqual(grantsOf(ROLE_CODES.CUSTOMER))
    expect(ROLES.customer.authorize({ user: ["list"] }).success).toBe(false)
  })
})

describe("has permission", () => {
  it("returns true when the role grants the permission", () => {
    expect(hasPermission({ permission: { admin: ["access"] }, role: ROLE_CODES.ADMIN })).toBe(true)
    expect(hasPermission({ permission: { settings: ["manage"] }, role: ROLE_CODES.ADMIN })).toBe(true)
    expect(hasPermission({ permission: { user: ["list"] }, role: ROLE_CODES.ADMIN })).toBe(true)
  })

  it("returns false when the role does not grant the permission", () => {
    expect(hasPermission({ permission: { admin: ["access"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { settings: ["manage"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { user: ["list"] }, role: ROLE_CODES.CUSTOMER })).toBe(false)
    expect(hasPermission({ permission: { admin: ["access"] }, role: "" })).toBe(false)
    expect(hasPermission({ permission: { admin: ["access"] }, role: undefined })).toBe(false)
  })

  it("fails closed for unknown or composite role strings", () => {
    expect(hasPermission({ permission: { admin: ["access"] }, role: "unknown-role" })).toBe(false)
    expect(hasPermission({ permission: { admin: ["access"] }, role: `customer,${ROLE_CODES.ADMIN}` })).toBe(false)
  })
})
