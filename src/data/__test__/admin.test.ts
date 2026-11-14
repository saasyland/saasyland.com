import { describe, expect, it } from "vite-plus/test"

import { ADMIN_STATUS_BADGE_CLASSES, ADMIN_STATUS_DOT_CLASSES } from "~/src/data/admin"

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
})
