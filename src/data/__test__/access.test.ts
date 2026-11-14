import { describe, expect, it, vi } from "vite-plus/test"

import { ROLE_CODES, ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"

import { APP_STATEMENTS, type AreaAccess, grantsOf } from "~/src/data/access"
import * as AREA_ACCESS from "~/src/data/access.entries"
import { CORE_ACCESS } from "~/src/data/core.access"

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
    vi.doMock(import("~/src/data/access.entries"), () => ({ CORE_ACCESS }))

    const access = await import("~/src/data/access")

    expect(access.APP_STATEMENTS).toStrictEqual(CORE_ACCESS.statements)
    expect(access.grantsOf(ROLE_CODES.ADMIN)).toStrictEqual(CORE_ACCESS.statements)
    expect(access.grantsOf(ROLE_CODES.CUSTOMER)).toStrictEqual({})
    vi.doUnmock("~/src/data/access.entries")
  })

  it("refuses two areas that declare the same statement", async () => {
    vi.resetModules()
    vi.doMock(import("~/src/data/access.entries"), () => ({ CORE_ACCESS, ...DUPLICATE_AREA }))

    await expect(import("~/src/data/access")).rejects.toThrow("Two areas declare the same access statement.")
    vi.doUnmock("~/src/data/access.entries")
  })
})
