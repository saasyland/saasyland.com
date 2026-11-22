import { describe, expect, it } from "vite-plus/test"

import { USER_STATUS } from "~/src/modules/user/user.constants"

import { USER_STATUS_BADGES } from "~/src/data/admin"

describe("admin status badges", () => {
  it("gives the warning tone only to users waiting on verification", () => {
    expect(USER_STATUS_BADGES).toEqual({
      [USER_STATUS.ACTIVE]: "accent",
      [USER_STATUS.BANNED]: "destructive",
      [USER_STATUS.PENDING]: "warning",
    })
  })
})
