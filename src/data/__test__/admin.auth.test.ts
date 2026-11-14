import { describe, expect, it } from "vite-plus/test"

import { USER_STATUS } from "~/src/modules/user/user.constants"

import { ADMIN_ROLE_ROWS, USER_STATUS_COLORS } from "~/src/data/admin"

describe("admin user data", () => {
  it("exports the role rows", () => {
    expect(ADMIN_ROLE_ROWS.length).toBeGreaterThan(0)
  })

  it("gives amber only to users waiting on verification", () => {
    expect(USER_STATUS_COLORS).toEqual({ [USER_STATUS.ACTIVE]: "emerald", [USER_STATUS.BANNED]: "rose", [USER_STATUS.PENDING]: "amber" })
  })
})
