import { describe, expect, it } from "vite-plus/test"

import { blogSchema } from "~/src/integrations/fumadocs/fumadocs.schema"

import { BLOG_AUTHOR } from "~/src/data/blog"

const POST = { author: BLOG_AUTHOR.PIOTR_BOROWIECKI, title: "Release" } as const

describe("blog post author", () => {
  it("accepts an author BLOG_AUTHORS describes and refuses any other", () => {
    expect(blogSchema.safeParse({ ...POST, date: "2026-08-15" }).success).toBe(true)
    expect(blogSchema.safeParse({ ...POST, author: "someone-else", date: "2026-08-15" }).success).toBe(false)
    expect(blogSchema.safeParse({ date: "2026-08-15", title: "Release" }).success).toBe(false)
  })
})

describe("blog post dates", () => {
  it.each([
    { date: "2026-08-15", updated: undefined },
    { date: "2026-08-15", updated: "2026-08-15" },
    { date: "2026-08-15", updated: "2026-11-17" },
  ])("accepts a post published on $date and updated on $updated", ({ date, updated }) => {
    expect(blogSchema.safeParse({ ...POST, date, updated }).success).toBe(true)
  })

  it("refuses an update earlier than the first publication", () => {
    const { error } = blogSchema.safeParse({ ...POST, date: "2026-11-17", updated: "2026-08-15" })

    expect(error?.issues).toMatchObject([{ message: "updated is earlier than date, the first publication", path: ["updated"] }])
  })

  it.each(["15 August 2026", "2026-08-15T10:00:00Z", "2026-13-01"])("refuses %s, which is not a calendar date", (date) => {
    expect(blogSchema.safeParse({ ...POST, date }).success).toBe(false)
  })
})
