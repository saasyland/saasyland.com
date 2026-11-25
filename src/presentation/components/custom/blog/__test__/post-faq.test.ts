import { type MessageFormatElement, type SelectElement, isSelectElement, parse } from "@formatjs/icu-messageformat-parser"
import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import { readFileSync, readdirSync } from "node:fs"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { CLI_INIT_COMMAND } from "~/src/data/cli"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import { formatPostText, postTextValues } from "~/src/lib/post-text"

const BLOG_DIR = "content/blog"
const POST_FAQ = "<PostFaq entries={frontmatter.faq} />"
const LOCALE_PATTERN = /\.(?<locale>[a-z]{2}-[A-Z]{2})\.mdx$/u
const STATUS_ARGUMENTS = ["generation", "billingGeneration", "affiliateProgram"] as const
const OTHER_OPTION = "other"
const TEXT_KEY = "text"

const entrySchema = zod.object({ answer: zod.string(), question: zod.string() })

const postSchema = zod.object({
  description: zod.string(),
  excerpt: zod.string().default(""),
  faq: zod.array(entrySchema),
  title: zod.string(),
})

const posts = readdirSync(BLOG_DIR).map((file) => {
  const source = readFileSync(`${BLOG_DIR}/${file}`, "utf8")
  const { content, data } = frontmatter(source)
  const { description, excerpt, faq, title } = postSchema.parse(data)

  return { content, description, excerpt, faq, file, locale: LOCALE_PATTERN.exec(file)?.groups?.["locale"] ?? "", title }
})

type StatusArgument = (typeof STATUS_ARGUMENTS)[number]

const statusSelects = (text: string, argument: StatusArgument): SelectElement[] =>
  parse(text).filter((node: MessageFormatElement): node is SelectElement => isSelectElement(node) && node.value === argument)

interface StatusFormat {
  readonly argument: StatusArgument
  readonly locale: string
  readonly status: FeatureStatus
  readonly text: string
}

const formatWithStatus = ({ argument, locale, status, text }: StatusFormat): string =>
  createTranslator({ locale, messages: { [TEXT_KEY]: text } })(TEXT_KEY, { ...postTextValues(locale), [argument]: status })

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

  it.each(posts)(
    "$file writes its description and excerpt as plain text, because the blog shows them as written",
    ({ description, excerpt }) => {
      for (const text of [description, excerpt]) {
        expect(text).not.toMatch(/[{}]/u)
      }
    },
  )

  it.each(STATUS_ARGUMENTS)("words every sentence that changes with %s for both statuses", (argument) => {
    const texts = posts.flatMap(({ faq, file, locale, title }) =>
      [title, ...faq.flatMap(({ answer, question }) => [question, answer])]
        .filter((text) => statusSelects(text, argument).length > 0)
        .map((text) => ({ file, locale, text })),
    )

    expect(texts.length).toBeGreaterThan(0)

    for (const { file, locale, text } of texts) {
      const available = formatWithStatus({ argument, locale, status: FEATURE_STATUS.AVAILABLE, text })
      const arriving = formatWithStatus({ argument, locale, status: FEATURE_STATUS.ARRIVING, text })

      for (const select of statusSelects(text, argument)) {
        expect(Object.keys(select.options).toSorted(), file).toStrictEqual([FEATURE_STATUS.AVAILABLE, OTHER_OPTION])
      }
      expect(available, file).not.toBe(arriving)
      expect(`${available}${arriving}`, file).not.toMatch(/[{}`]/u)
      expect(arriving, file).not.toContain(CLI_INIT_COMMAND)
    }
  })
})
