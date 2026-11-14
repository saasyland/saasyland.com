import { describe, expect, it } from "vite-plus/test"

import { DEFAULT_ROLE_CODE, ROLE_CODES, ROLE_VALUES, isRole } from "~/src/integrations/better-auth/auth.roles"

describe("auth roles", () => {
  it("exposes a single catalog of role codes", () => {
    expect(ROLE_VALUES).toStrictEqual([ROLE_CODES.ADMIN, ROLE_CODES.CUSTOMER])
    expect(DEFAULT_ROLE_CODE).toBe(ROLE_CODES.CUSTOMER)
  })

  it("recognises only the catalogued role codes", () => {
    expect(ROLE_VALUES.every((role) => isRole(role))).toBe(true)
    expect(isRole("unknown-role")).toBe(false)
    expect(isRole(`customer,${ROLE_CODES.ADMIN}`)).toBe(false)
    expect(isRole("")).toBe(false)
    expect(isRole(null)).toBe(false)
    expect(isRole(undefined)).toBe(false)
  })
})
