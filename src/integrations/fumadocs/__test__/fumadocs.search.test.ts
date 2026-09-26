import type * as SearchServer from "fumadocs-core/search/server"
import { createFromSource } from "fumadocs-core/search/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { search } from "~/src/integrations/fumadocs/fumadocs.search"
import { source } from "~/src/integrations/fumadocs/fumadocs.source"

const { gettingStarted } = vi.hoisted(() => ({
  gettingStarted: {
    contents: [{ content: "Clone the starter and install dependencies.", heading: "install" }],
    headings: [{ content: "Install", id: "install" }],
  },
}))

vi.mock("fumadocs-core/search/server", async (importOriginal) => {
  const actual = await importOriginal<typeof SearchServer>()
  return { ...actual, createFromSource: vi.fn(actual.createFromSource) }
})

vi.mock("collections/server", () => ({
  blog: [],
  docs: {
    toFumadocsSource: () => ({
      files: [
        {
          data: { description: "Set up the starter", structuredData: gettingStarted, title: "Getting started" },
          path: "getting-started.mdx",
          type: "page",
        },
        { data: { structuredData: gettingStarted, title: "Pierwsze kroki" }, path: "getting-started.pl-PL.mdx", type: "page" },
      ],
    }),
  },
}))

const [indexedSource, searchOptions] = vi.mocked(createFromSource).mock.calls[0] ?? []
const indexPage = searchOptions?.buildIndex

describe("docs search index", () => {
  it("indexes each page under its locale and url with an empty description when none is set", async () => {
    expect(indexedSource).toBe(source)
    const [english] = source.getPages("en-US")
    const [polish] = source.getPages("pl-PL")
    if (!english || !polish || !indexPage) {
      throw new Error("Missing docs pages or search index builder")
    }
    expect(await indexPage(english)).toStrictEqual({
      description: "Set up the starter",
      id: "en-US:/docs/getting-started",
      structuredData: gettingStarted,
      title: "Getting started",
      url: "/docs/getting-started",
    })
    expect(await indexPage(polish)).toStrictEqual({
      description: "",
      id: "pl-PL:/docs/getting-started",
      structuredData: gettingStarted,
      title: "Pierwsze kroki",
      url: "/docs/getting-started",
    })
  })

  it("keys pages from an unlocalized source by url alone", async () => {
    const page = { data: { title: "Standalone" }, path: "standalone.mdx", slugs: ["standalone"], type: "page", url: "/docs/standalone" }
    expect(await indexPage?.(page)).toMatchObject({ description: "", id: ":/docs/standalone", url: "/docs/standalone" })
  })

  it.each([
    { locale: "en-US", title: "Getting started" },
    { locale: "pl-PL", title: "Pierwsze kroki" },
  ])("finds the $locale page by its content under its locale-scoped id", async ({ locale, title }) => {
    expect(await search.search("dependencies", { locale })).toMatchObject([
      { content: title, id: `${locale}:/docs/getting-started`, type: "page", url: "/docs/getting-started" },
      { content: "Clone the starter and install <mark>dependencies</mark>.", type: "text", url: "/docs/getting-started#install" },
    ])
  })
})
