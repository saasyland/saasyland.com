import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"
import { describe, expect, it, vi } from "vite-plus/test"

import { APP_STATEMENTS, ROLES, ac, grantsOf, hasPermission } from "~/src/integrations/better-auth/auth.access"
import { type AreaAccess, ROLE_CODES, ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"

import * as AREA_ACCESS from "~/src/areas/access.entries"
import { AUTH_ACCESS } from "~/src/areas/auth.access"

const AREAS: readonly AreaAccess[] = Object.values(AREA_ACCESS)

const DUPLICATE_AREA = { DUPLICATE_ACCESS: { grants: {}, statements: { admin: ["access"] } } }

describe("access statement composition", () => {
  it("holds every statement an area declares exactly once, in resource order", () => {
    const declared = AREAS.flatMap(({ statements }) => Object.entries(statements))

    expect(new Set(declared.map(([resource]) => resource)).size).toBe(declared.length)
    expect(Object.entries(APP_STATEMENTS)).toStrictEqual(declared.toSorted(([first], [second]) => first.localeCompare(second)))
  })

  it("lets an area grant only the statements and actions it declares", () => {
    for (const { grants, statements } of AREAS) {
      for (const [resource, actions] of Object.values(grants).flatMap((granted) => Object.entries(granted))) {
        expect(statements).toHaveProperty(resource, expect.arrayContaining([...actions]))
      }
    }
  })

  it.each(ROLE_VALUES)("gives the %s role every grant of every area and nothing else", (role) => {
    const granted = AREAS.flatMap(({ grants }) => Object.entries(grants[role] ?? {}))

    expect(Object.keys(grantsOf(role))).toHaveLength(granted.length)
    for (const [resource, actions] of granted) {
      expect(grantsOf(role)).toHaveProperty(resource, actions)
    }
  })

  it("leaves out the statements and grants of every area the project does not include", async () => {
    vi.resetModules()
    vi.doMock(import("~/src/areas/access.entries"), () => ({ AUTH_ACCESS }))

    const access = await import("~/src/integrations/better-auth/auth.access")

    expect(access.APP_STATEMENTS).toStrictEqual(AUTH_ACCESS.statements)
    expect(access.grantsOf(ROLE_CODES.ADMIN)).toStrictEqual(AUTH_ACCESS.statements)
    expect(access.grantsOf(ROLE_CODES.CUSTOMER)).toStrictEqual({})
    vi.doUnmock("~/src/areas/access.entries")
  })

  it("refuses two areas that declare the same statement", async () => {
    vi.resetModules()
    vi.doMock(import("~/src/areas/access.entries"), () => ({ AUTH_ACCESS, ...DUPLICATE_AREA }))

    await expect(import("~/src/integrations/better-auth/auth.access")).rejects.toThrow("Two areas declare the same access statement.")
    vi.doUnmock("~/src/areas/access.entries")
  })
})

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
