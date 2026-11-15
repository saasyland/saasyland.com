import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

import { faqValues, formatFaqAnswer } from "~/src/presentation/components/custom/blog/post-faq"

const BLOG_DIR = "content/blog"
const POST_FAQ = "<PostFaq entries={frontmatter.faq} />"
const LOCALE_PATTERN = /\.(?<locale>[a-z]{2}-[A-Z]{2})\.mdx$/u

const entrySchema = zod.object({ answer: zod.string(), question: zod.string() })

const faqSchema = zod.object({ faq: zod.array(entrySchema) })

const posts = readdirSync(BLOG_DIR).map((file) => {
  const source = readFileSync(`${BLOG_DIR}/${file}`, "utf8")
  const { content, data } = frontmatter(source)

  return { content, faq: faqSchema.parse(data).faq, file, locale: LOCALE_PATTERN.exec(file)?.groups?.["locale"] ?? "" }
})

describe("blog FAQs", () => {
  it.each(posts)("$file writes its FAQ once, in the frontmatter, and renders it with PostFaq", ({ content, faq }) => {
    expect(faq.length).toBeGreaterThan(0)
    expect(content).toContain(POST_FAQ)
    expect(content).not.toContain("<Accordion")
  })

  it.each(posts)("$file formats every answer with the values the code defines", ({ faq, locale }) => {
    const values = faqValues((amount) => new Intl.NumberFormat(locale, CURRENCY_FORMAT).format(amount))

    for (const { answer } of faq) {
      const formatted = formatFaqAnswer({ answer, locale, values })

      expect(formatted).not.toMatch(/[{}`]/u)
      expect(formatted).not.toBe("answer")
    }
  })
})
