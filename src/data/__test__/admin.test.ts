import { describe, expect, it } from "vite-plus/test"

import { USER_STATUS } from "~/src/modules/user/user.constants"

import {
  ADMIN_ANALYTICS_REGION_ROWS,
  ADMIN_ROLE_ROWS,
  ADMIN_STATUS_BADGE_CLASSES,
  ADMIN_STATUS_DOT_CLASSES,
  USER_STATUS_COLORS,
} from "~/src/data/admin"

describe("admin mock data", () => {
  it("exports role and analytics fixtures", () => {
    expect.hasAssertions()
    expect(ADMIN_ROLE_ROWS.length).toBeGreaterThan(0)
    expect(ADMIN_ANALYTICS_REGION_ROWS.length).toBeGreaterThan(0)
  })
})

describe("admin status colors", () => {
  it("maps the meaningful states onto badge and dot tokens", () => {
    expect(ADMIN_STATUS_BADGE_CLASSES.emerald).toContain("dark:text-ring")
    expect(ADMIN_STATUS_BADGE_CLASSES.rose).toContain("bg-destructive/10")
    expect(ADMIN_STATUS_BADGE_CLASSES.neutral).toContain("text-muted-foreground")
    expect(ADMIN_STATUS_BADGE_CLASSES.amber).toContain("amber")
    expect(ADMIN_STATUS_DOT_CLASSES.emerald).toBe("bg-ring")
    expect(ADMIN_STATUS_DOT_CLASSES.rose).toBe("bg-destructive")
    expect(ADMIN_STATUS_DOT_CLASSES.amber).toBe("bg-amber-500")
    expect(ADMIN_STATUS_DOT_CLASSES.neutral).toContain("muted-foreground")
  })

  it("gives amber only to users waiting on verification", () => {
    expect(USER_STATUS_COLORS).toEqual({ [USER_STATUS.ACTIVE]: "emerald", [USER_STATUS.BANNED]: "rose", [USER_STATUS.PENDING]: "amber" })
  })
})
