import { describe, expect, it } from "vite-plus/test"

import { changelogEntries } from "~/src/integrations/fumadocs/fumadocs.changelog"
import config, { blog, docs } from "~/src/integrations/fumadocs/fumadocs.config"

describe("content schema", () => {
  it("loads the documentation and blog from their content directories", () => {
    expect(docs.docs.dir).toBe("./content/docs")
    expect(blog.dir).toBe("./content/blog")
  })

  it("accepts dates, defaults published posts and rejects incomplete FAQs", () => {
    const { schema } = blog
    if (!schema || typeof schema === "function" || !("safeParse" in schema)) {
      throw new Error("Missing blog schema")
    }
    expect(schema.parse({ authorName: "Author", date: new Date("2026-09-01"), title: "Release" })).toMatchObject({ published: true })
    expect(schema.safeParse({ authorName: "Author", date: "2026-09-01", faq: [{ question: "Why?" }], title: "Release" }).success).toBe(
      false,
    )
  })

  it.each([
    { authorImage: "/images/blog/authors/author.webp", isValid: true },
    { authorImage: "https://avatars.githubusercontent.com/u/1", isValid: false },
    { authorImage: "//avatars.githubusercontent.com/u/1", isValid: false },
  ])("accepts $authorImage as the author's image: $isValid", ({ authorImage, isValid }) => {
    const { schema } = blog
    if (!schema || typeof schema === "function" || !("safeParse" in schema)) {
      throw new Error("Missing blog schema")
    }
    expect(schema.safeParse({ authorImage, authorName: "Author", date: "2026-09-01", title: "Release" }).success).toBe(isValid)
  })

  it("accepts an author profile only as a URL", () => {
    const { schema } = blog
    if (!schema || typeof schema === "function" || !("safeParse" in schema)) {
      throw new Error("Missing blog schema")
    }
    const post = { authorName: "Author", date: "2026-09-01", title: "Release" }
    expect(schema.safeParse({ ...post, authorUrl: "https://github.com/author" }).success).toBe(true)
    expect(schema.safeParse({ ...post, authorUrl: "github.com/author" }).success).toBe(false)
  })
})

describe("MDX options", () => {
  it("highlights code with the GitHub themes and adds no rehype plugin", () => {
    expect(config.mdxOptions).toStrictEqual({
      rehypeCodeOptions: {
        colorReplacements: { "github-dark": { "#6a737d": "#78828c" }, "github-light": { "#e36209": "#c55300" } },
        themes: { dark: "github-dark", light: "github-light" },
      },
    })
  })
})

describe("plugins", () => {
  it("puts the changelog entries on the page that asks for them", () => {
    expect(config.plugins).toStrictEqual([changelogEntries])
  })
})
