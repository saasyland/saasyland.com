import { describe, expect, it } from "vite-plus/test"

import { USER_STATUS } from "~/src/modules/user/user.constants"
import { getUserInitials, getUserStatus } from "~/src/modules/user/user.utils"

describe("user status helpers", () => {
  it("returns banned when the user is banned", () => {
    expect.hasAssertions()

    expect(getUserStatus({ banned: true, emailVerified: true })).toBe(USER_STATUS.BANNED)
    expect(getUserStatus({ banned: true, emailVerified: false })).toBe(USER_STATUS.BANNED)
  })

  it("returns pending when email is not verified", () => {
    expect.hasAssertions()

    expect(getUserStatus({ banned: false, emailVerified: false })).toBe(USER_STATUS.PENDING)
  })

  it("returns active when verified and not banned", () => {
    expect.hasAssertions()

    expect(getUserStatus({ banned: false, emailVerified: true })).toBe(USER_STATUS.ACTIVE)
  })
})

describe("user initials", () => {
  it.each([
    ["", "?"],
    ["  Grace  ", "GR"],
    ["Ada Lovelace", "AL"],
    ["Ada King Lovelace", "AK"],
  ])("uses meaningful initials for %j", (name, initials) => {
    expect(getUserInitials(name)).toBe(initials)
  })
})
