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
const GENERATION_ARGUMENT = "generation"
const OTHER_OPTION = "other"
const TEXT_KEY = "text"

const entrySchema = zod.object({ answer: zod.string(), question: zod.string() })

const postSchema = zod.object({ faq: zod.array(entrySchema), title: zod.string() })

const posts = readdirSync(BLOG_DIR).map((file) => {
  const source = readFileSync(`${BLOG_DIR}/${file}`, "utf8")
  const { content, data } = frontmatter(source)
  const { faq, title } = postSchema.parse(data)

  return { content, faq, file, locale: LOCALE_PATTERN.exec(file)?.groups?.["locale"] ?? "", title }
})

const generationSelects = (text: string): SelectElement[] =>
  parse(text).filter((node: MessageFormatElement): node is SelectElement => isSelectElement(node) && node.value === GENERATION_ARGUMENT)

const formatWithGeneration = ({ generation, locale, text }: { generation: FeatureStatus; locale: string; text: string }): string =>
  createTranslator({ locale, messages: { [TEXT_KEY]: text } })(TEXT_KEY, { ...postTextValues(locale), generation })

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

  it("words every sentence that changes when project generation ships for both statuses", () => {
    const texts = posts.flatMap(({ faq, file, locale, title }) =>
      [title, ...faq.flatMap(({ answer, question }) => [question, answer])]
        .filter((text) => generationSelects(text).length > 0)
        .map((text) => ({ file, locale, text })),
    )

    expect(texts.length).toBeGreaterThan(0)

    for (const { file, locale, text } of texts) {
      const available = formatWithGeneration({ generation: FEATURE_STATUS.AVAILABLE, locale, text })
      const arriving = formatWithGeneration({ generation: FEATURE_STATUS.ARRIVING, locale, text })

      for (const select of generationSelects(text)) {
        expect(Object.keys(select.options).toSorted(), file).toStrictEqual([FEATURE_STATUS.AVAILABLE, OTHER_OPTION])
      }
      expect(available, file).not.toBe(arriving)
      expect(`${available}${arriving}`, file).not.toMatch(/[{}`]/u)
      expect(arriving, file).not.toContain(CLI_INIT_COMMAND)
    }
  })
})
