import { describe, expect, it } from "vite-plus/test"

import {
  ADMIN_ANALYTICS_REGION_ROWS,
  ADMIN_ROLE_ROWS,
  ADMIN_SIDEBAR_GROUPS,
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

  it("keeps every sidebar destination unique", () => {
    const urls = ADMIN_SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => item.url))
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe("admin status colors", () => {
  it("maps the meaningful states onto badge and dot tokens", () => {
    expect(ADMIN_STATUS_BADGE_CLASSES.emerald).toContain("text-ring")
    expect(ADMIN_STATUS_BADGE_CLASSES.rose).toContain("text-destructive")
    expect(ADMIN_STATUS_BADGE_CLASSES.neutral).toContain("text-muted-foreground")
    expect(ADMIN_STATUS_BADGE_CLASSES.amber).toContain("amber")
    expect(ADMIN_STATUS_DOT_CLASSES.emerald).toBe("bg-ring")
    expect(ADMIN_STATUS_DOT_CLASSES.rose).toBe("bg-destructive")
    expect(ADMIN_STATUS_DOT_CLASSES.amber).toBe("bg-amber-500")
    expect(ADMIN_STATUS_DOT_CLASSES.neutral).toContain("muted-foreground")
  })

  it("gives amber only to users waiting on verification", () => {
    expect(USER_STATUS_COLORS).toEqual({ active: "emerald", banned: "rose", pending: "amber" })
  })
})
