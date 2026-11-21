import { staticClient } from "fumadocs-core/search/client/orama-static"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createContentDirectory, mdx } from "~/src/platform/testing/lib/content-directory"

import {
  BLOG_DIRECTORY,
  DOCS_DIRECTORY,
  collectBreadcrumbs,
  createContentIndexes,
  readingTimeMinutes,
  tableOfContents,
} from "~/src/integrations/fumadocs/fumadocs.indexes"

import { BLOG_TAG } from "~/src/data/blog"

const SEARCH_INDEX_URL = "/assets/search-index.json"
const WORDS_PER_MINUTE = 220

const DOCS = {
  [`${DOCS_DIRECTORY}/meta.en-US.json`]: JSON.stringify({ pages: ["index", "guide"], title: "Documentation" }),
  [`${DOCS_DIRECTORY}/meta.pl-PL.json`]: JSON.stringify({ pages: ["index", "guide"], title: "Dokumentacja" }),
  [`${DOCS_DIRECTORY}/index.en-US.mdx`]: mdx({ title: "Docs" }, "Welcome to the documentation.\n"),
  [`${DOCS_DIRECTORY}/index.pl-PL.mdx`]: mdx({ title: "Dokumentacja" }, "Witamy w dokumentacji.\n"),
  [`${DOCS_DIRECTORY}/unlisted.en-US.mdx`]: mdx({ title: "Unlisted" }, "A page that no meta file lists.\n"),
  [`${DOCS_DIRECTORY}/guide/meta.en-US.json`]: JSON.stringify({ icon: "Rocket", pages: ["install"], title: "Guide" }),
  [`${DOCS_DIRECTORY}/guide/meta.pl-PL.json`]: JSON.stringify({ icon: "Rocket", pages: ["install"], title: "Przewodnik" }),
  [`${DOCS_DIRECTORY}/guide/install.en-US.mdx`]: mdx(
    { description: "Install the starter", title: "Install" },
    "## Clone the repository\n\nClone the starter and install dependencies.\n",
  ),
  [`${DOCS_DIRECTORY}/guide/install.pl-PL.mdx`]: mdx(
    { description: "Instalacja startera", title: "Instalacja" },
    "## Sklonuj repozytorium\n\nSklonuj starter i zainstaluj zależności.\n",
  ),
}

const BLOG = {
  [`${BLOG_DIRECTORY}/newer.en-US.mdx`]: mdx(
    {
      authorImage: "/images/blog/authors/ada.webp",
      authorName: "Ada",
      authorUrl: "https://github.com/ada",
      date: "2026-09-02",
      description: "Newer description",
      excerpt: "Newer excerpt",
      tags: [BLOG_TAG.STACK],
      title: "Newer",
    },
    `## Start with \`bun\` and **care**\n\n${"word ".repeat(660)}\n\n### Ship <Badge>it</Badge>\n\nDone.\n`,
  ),
  [`${BLOG_DIRECTORY}/older.en-US.mdx`]: mdx(
    {
      authorName: "Grace",
      date: "2025-01-01",
      description: "Older description",
      faq: [{ answer: "Because.", question: "Why?" }],
      image: "/older.webp",
      title: "Older",
      updated: "2026-01-01",
    },
    "Three short words\n",
  ),
  [`${BLOG_DIRECTORY}/draft.en-US.mdx`]: mdx({ authorName: "Ada", date: "2026-12-01", published: false, title: "Draft" }, "Draft text.\n"),
  [`${BLOG_DIRECTORY}/newer.ja-JP.mdx`]: mdx(
    { authorName: "Ada", date: "2026-09-02", title: "日本語" },
    `${"認証と請求の仕組みを学びます。".repeat(100)}\n`,
  ),
}

const searchWith = (exported: unknown, query: string) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(exported))),
  )

  return staticClient({ from: `${SEARCH_INDEX_URL}?${crypto.randomUUID()}` }).search(query)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("docs index", () => {
  it("serializes each locale's page tree and keys its pages by slug", async () => {
    const indexes = await createContentIndexes(createContentDirectory(DOCS))
    const english = await indexes.docs("en-US")
    const polish = await indexes.docs("pl-PL")

    expect(english.tree).toMatchObject({ $fumadocs_loader: "page-tree", data: { name: "Documentation" } })
    expect(polish.tree).toMatchObject({ data: { name: "Dokumentacja" } })
    expect(JSON.stringify(english.tree)).toContain("<svg")
    expect(english.pages).toStrictEqual({
      "": { description: "", locale: "en-US", path: "index.en-US.mdx", pathname: "/docs", section: undefined, title: "Docs" },
      "guide/install": {
        description: "Install the starter",
        locale: "en-US",
        path: "guide/install.en-US.mdx",
        pathname: "/docs/guide/install",
        section: "Guide",
        title: "Install",
      },
      unlisted: {
        description: "",
        locale: "en-US",
        path: "unlisted.en-US.mdx",
        pathname: "/docs/unlisted",
        section: undefined,
        title: "Unlisted",
      },
    })
    expect(polish.pages["guide/install"]).toStrictEqual({
      description: "Instalacja startera",
      locale: "pl-PL",
      path: "guide/install.pl-PL.mdx",
      pathname: "/docs/guide/install",
      section: "Przewodnik",
      title: "Instalacja",
    })
  })

  it("falls back to the default locale's page when a translation is missing", async () => {
    const { docs } = await createContentIndexes(createContentDirectory(DOCS))

    const { pages } = await docs("pl-PL")

    expect(pages["unlisted"]).toMatchObject({ locale: "pl-PL", path: "unlisted.en-US.mdx", title: "Unlisted" })
  })
})

describe("blog index", () => {
  it("lists a locale's published posts newest first with their frontmatter", async () => {
    const { blog } = await createContentIndexes(createContentDirectory(BLOG))
    const posts = await blog("en-US")

    expect(posts.map(({ title }) => title)).toStrictEqual(["Newer", "Older"])
    expect(posts[0]).toMatchObject({
      authorImage: "/images/blog/authors/ada.webp",
      authorName: "Ada",
      authorUrl: "https://github.com/ada",
      date: "2026-09-02",
      description: "Newer description",
      faq: undefined,
      image: undefined,
      path: "newer.en-US.mdx",
      summary: "Newer excerpt",
      tags: [BLOG_TAG.STACK],
      updated: undefined,
      url: "/blog/newer",
    })
    expect(posts[1]).toMatchObject({
      authorImage: undefined,
      authorUrl: undefined,
      faq: [{ answer: "Because.", question: "Why?" }],
      image: "/older.webp",
      summary: "Older description",
      tags: [],
      updated: "2026-01-01",
    })
  })

  it("gives each post its plain-text table of contents and reading time", async () => {
    const { blog } = await createContentIndexes(createContentDirectory(BLOG))
    const [newer, older] = await blog("en-US")

    expect(newer?.toc).toStrictEqual([
      { depth: 2, title: "Start with bun and care", url: "#start-with-bun-and-care" },
      { depth: 3, title: "Ship it", url: "#ship-it" },
    ])
    expect(newer?.readingTimeMinutes).toBe(3)
    expect(older).toMatchObject({ readingTimeMinutes: 1, toc: [] })
  })

  it("counts words in Japanese prose without spaces", async () => {
    const { blog } = await createContentIndexes(createContentDirectory(BLOG))
    const [post] = await blog("ja-JP")

    expect(post?.url).toBe("/blog/newer")
    expect(post?.readingTimeMinutes).toBeGreaterThan(1)
  })

  it("dates a post whose frontmatter holds a date", async () => {
    const { blog } = await createContentIndexes(
      createContentDirectory({
        [`${BLOG_DIRECTORY}/dated.en-US.mdx`]:
          "---\ntitle: Dated\nauthorName: Ada\ndate: !!timestamp 2026-09-01\nupdated: !!timestamp 2026-10-01\n---\n",
      }),
    )

    expect(await blog("en-US")).toMatchObject([{ date: "2026-09-01T00:00:00.000Z", updated: "2026-10-01T00:00:00.000Z" }])
  })
})

describe("reading time and table of contents", () => {
  it("estimates one minute per 220 words, and never less than a minute", () => {
    expect(readingTimeMinutes({ content: "word ".repeat(WORDS_PER_MINUTE * 2), locale: "en-US" })).toBe(2)
    expect(readingTimeMinutes({ content: "## Heading only", locale: "en-US" })).toBe(1)
  })

  it("lists headings with the ids the compiled page gives them", async () => {
    await expect(tableOfContents("## One\n\n### Two [#custom]\n")).resolves.toStrictEqual([
      { depth: 2, title: "One", url: "#one" },
      { depth: 3, title: "Two", url: "#custom" },
    ])
  })
})

describe("search index", () => {
  it("indexes each locale's pages on their own, with their breadcrumbs, headings and text", async () => {
    const { search } = await createContentIndexes(createContentDirectory(DOCS))
    const [english, polish] = await Promise.all([search("en-US"), search("pl-PL")])

    expect(await searchWith(english, "dependencies")).toMatchObject([
      { breadcrumbs: ["Documentation", "Guide"], content: "Install", type: "page", url: "/docs/guide/install" },
      { content: "Clone the starter and install dependencies.", type: "text", url: "/docs/guide/install#clone-the-repository" },
    ])
    expect(await searchWith(english, "zależności")).toStrictEqual([])
    expect(await searchWith(polish, "zależności")).toMatchObject([
      { breadcrumbs: ["Dokumentacja", "Przewodnik"], content: "Instalacja", url: "/docs/guide/install" },
      { content: "Sklonuj starter i zainstaluj zależności.", type: "text" },
    ])
    expect(await searchWith(english, "unlisted")).toMatchObject([{ breadcrumbs: [], content: "Unlisted", url: "/docs/unlisted" }])
  })
})

describe("breadcrumbs", () => {
  it("names a page by the folders and separators above it, like Fumadocs search", () => {
    const install = { name: "Install", type: "page" as const, url: "/docs/guide/install" }
    const overview = { name: "Overview", type: "page" as const, url: "/docs/guide" }
    const breadcrumbs = collectBreadcrumbs({
      children: [
        { name: "Start", type: "page", url: "/docs" },
        { name: "Basics", type: "separator" },
        { children: [install], index: overview, name: "Guide", type: "folder" },
        { name: "", type: "separator" },
        { children: [{ name: "Deep", type: "page", url: "/docs/deep" }], name: "", type: "folder" },
        { name: "Again", type: "page", url: "/docs" },
      ],
      name: "Documentation",
    })

    expect(Object.fromEntries(breadcrumbs)).toStrictEqual({
      "/docs": ["Documentation"],
      "/docs/deep": ["Documentation"],
      "/docs/guide": ["Documentation", "Basics", "Guide"],
      "/docs/guide/install": ["Documentation", "Basics", "Guide"],
    })
  })
})
