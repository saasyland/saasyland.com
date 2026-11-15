import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { formatPostText } from "~/src/lib/post-text"

const BLOG_DIR = "content/blog"
const POST_FAQ = "<PostFaq entries={frontmatter.faq} />"
const LOCALE_PATTERN = /\.(?<locale>[a-z]{2}-[A-Z]{2})\.mdx$/u

const entrySchema = zod.object({ answer: zod.string(), question: zod.string() })

const postSchema = zod.object({ faq: zod.array(entrySchema), title: zod.string() })

const posts = readdirSync(BLOG_DIR).map((file) => {
  const source = readFileSync(`${BLOG_DIR}/${file}`, "utf8")
  const { content, data } = frontmatter(source)
  const { faq, title } = postSchema.parse(data)

  return { content, faq, file, locale: LOCALE_PATTERN.exec(file)?.groups?.["locale"] ?? "", title }
})

describe("blog FAQs", () => {
  it.each(posts)("$file writes its FAQ once, in the frontmatter, and renders it with PostFaq", ({ content, faq }) => {
    expect(faq.length).toBeGreaterThan(0)
    expect(content).toContain(POST_FAQ)
    expect(content).not.toContain("<Accordion")
  })

  it.each(posts)("$file formats its title and every question and answer with the values the code defines", ({ faq, locale, title }) => {
    for (const text of [title, ...faq.flatMap(({ answer, question }) => [question, answer])]) {
      const formatted = formatPostText({ locale, text })

      expect(formatted).not.toMatch(/[{}`]/u)
      expect(formatted).not.toBe("text")
    }
  })
})
