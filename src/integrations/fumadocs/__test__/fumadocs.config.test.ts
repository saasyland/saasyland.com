import { describe, expect, it } from "vite-plus/test"

import config, { blog, docs } from "~/src/integrations/fumadocs/fumadocs.config"

import { rehypeOmitRenderedContent } from "~/scripts/deployed-worker"

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
})

describe("MDX options", () => {
  it("runs the deployed Worker plugin after the default rehype plugins", () => {
    const { mdxOptions } = config
    if (typeof mdxOptions !== "object" || typeof mdxOptions.rehypePlugins !== "function") {
      throw new TypeError("Missing rehype plugins")
    }
    expect(mdxOptions.rehypePlugins([])).toEqual([rehypeOmitRenderedContent])
  })
})
