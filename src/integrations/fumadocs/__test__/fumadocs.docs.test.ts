import { notFound } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ROBOTS, buildTitle } from "~/src/lib/seo"

import notFoundMessages from "~/messages/en-US/errors.not-found.json"
import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const { loadDocsIndex, preload } = vi.hoisted(() => {
  const page = {
    description: "Start your project",
    path: "getting-started.en-US.mdx",
    pathname: "/docs/getting-started",
    section: "Basics",
    title: "Getting started",
  }

  return {
    loadDocsIndex: vi.fn((locale: string) =>
      Promise.resolve({
        pages: {
          "": { description: "", locale, path: `index.${locale}.mdx`, pathname: "/docs", section: undefined, title: "Docs" },
          "getting-started": { ...page, locale },
        },
        tree: { $fumadocs_loader: "page-tree", data: { children: [], name: "Docs" } },
      }),
    ),
    preload: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
  }
})

vi.mock("virtual:content-indexes", () => ({ loadDocsIndex }))
vi.mock("~/src/presentation/components/custom/docs-content", () => ({ docsContent: { preload } }))

afterEach(() => {
  vi.clearAllMocks()
})

describe("documentation loader", () => {
  it("finds the requested page in the locale's docs index and preloads its MDX content", async () => {
    await expect(loadDocsPage("getting-started")).resolves.toStrictEqual({
      description: "Start your project",
      locale: "en-US",
      path: "getting-started.en-US.mdx",
      pathname: "/docs/getting-started",
      section: "Basics",
      title: "Getting started",
    })
    expect(loadDocsIndex).toHaveBeenCalledExactlyOnceWith("en-US")
    expect(preload).toHaveBeenCalledExactlyOnceWith("getting-started.en-US.mdx")
  })

  it("loads the docs home without a splat", async () => {
    await expect(loadDocsPage()).resolves.toMatchObject({ description: "", pathname: "/docs", section: undefined, title: "Docs" })
    expect(preload).toHaveBeenCalledExactlyOnceWith("index.en-US.mdx")
  })

  it.each(["missing", "constructor", "getting-started/extra"])("returns not found for %s without preloading", async (splat) => {
    await expect(loadDocsPage(splat)).rejects.toMatchObject({ isNotFound: true })
    expect(preload).not.toHaveBeenCalled()
  })

  it("loads the docs index of the page's locale", async () => {
    vi.mocked(getRequest).mockReturnValueOnce(new Request("http://127.0.0.1:3000/pl-PL/docs/getting-started"))
    await expect(loadDocsPage("getting-started")).resolves.toMatchObject({ locale: "pl-PL" })
    expect(loadDocsIndex).toHaveBeenCalledExactlyOnceWith("pl-PL")
  })
})

describe("documentation head", () => {
  it("describes the docs index before any page data has loaded", async () => {
    const { meta } = await docsHead({ loaderData: undefined, match: { error: undefined } })
    expect(meta).toContainEqual({ title: APP_NAME })
    expect(meta).toContainEqual({ content: "", name: "description" })
    expect(meta).toContainEqual({ content: "article", property: "og:type" })
    expect(meta).toContainEqual({ content: `${APP_URL}${ROUTES.DOCS}`, property: "og:url" })
    expect(meta).toContainEqual({ content: "en_US", property: "og:locale" })
  })

  it("names the section of a docs page beside its title", async () => {
    const { meta } = await docsHead({ loaderData: await loadDocsPage("getting-started"), match: { error: undefined } })
    expect(meta).toContainEqual({ content: "Basics", property: "article:section" })
    expect(meta).toContainEqual({ content: "Getting started", property: "og:title" })
  })

  it("titles a missing docs page as not found and keeps it out of search results", async () => {
    const head = await docsHead({ loaderData: undefined, match: { error: notFound() } })

    expect(head).toStrictEqual({
      meta: [
        { title: buildTitle({ locale: I18N.DEFAULT_LOCALE, title: notFoundMessages.metadata.title }) },
        { content: notFoundMessages.metadata.description, name: "description" },
        { content: ROBOTS.NOINDEX, name: "robots" },
      ],
    })
  })
})
