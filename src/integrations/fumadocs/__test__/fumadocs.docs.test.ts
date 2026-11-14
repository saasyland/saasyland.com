import { getRequest } from "@tanstack/react-start/server"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const { getPage, getPageTree, preload } = vi.hoisted(() => ({
  getPage: vi.fn<
    (slugs: string[], locale: string) => { data: { title: string; description?: string }; path: string; url: string } | undefined
  >(() => ({
    data: { description: "Start your project", title: "Getting started" },
    path: "getting-started.mdx",
    url: "/docs/getting-started",
  })),
  getPageTree: vi.fn(() => ({
    $id: "root",
    children: [
      {
        $id: "getting-started",
        children: [{ $id: "page", name: "Getting started", type: "page" as const, url: "/docs/getting-started" }],
        name: "Basics",
        type: "folder" as const,
      },
    ],
    name: "Docs",
  })),
  preload: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
}))

vi.mock("~/src/integrations/fumadocs/fumadocs.source", () => ({ source: { getPage, getPageTree } }))
vi.mock("~/src/presentation/components/custom/docs-content", () => ({ docsContent: { preload } }))

afterEach(() => {
  vi.clearAllMocks()
})

describe("documentation loader", () => {
  it("loads the requested page and preloads its MDX content", async () => {
    await expect(loadDocsPage("getting-started")).resolves.toEqual({
      description: "Start your project",
      locale: "en-US",
      path: "getting-started.mdx",
      pathname: "/docs/getting-started",
      section: "Basics",
      title: "Getting started",
    })
    expect(getPage).toHaveBeenCalledExactlyOnceWith(["getting-started"], "en-US")
    expect(getPageTree).toHaveBeenCalledExactlyOnceWith("en-US")
    expect(preload).toHaveBeenCalledExactlyOnceWith("getting-started.mdx")
  })

  it("loads the docs index and normalizes a missing description", async () => {
    getPage.mockReturnValueOnce({ data: { title: "Docs" }, path: "index.mdx", url: "/docs" })
    await expect(loadDocsPage()).resolves.toMatchObject({ description: "", pathname: "/docs", section: undefined, title: "Docs" })
    expect(getPage).toHaveBeenCalledExactlyOnceWith([], "en-US")
  })

  it("returns not found without preloading a missing document", async () => {
    getPage.mockReturnValueOnce(undefined)
    await expect(loadDocsPage("missing")).rejects.toMatchObject({ isNotFound: true })
    expect(preload).not.toHaveBeenCalled()
  })

  it("loads the page's locale when the server function request carries another locale's cookie", async () => {
    vi.mocked(getRequest)
      .mockReturnValueOnce(new Request("http://127.0.0.1:3000/pl-PL/docs/getting-started"))
      .mockReturnValue(new Request("http://127.0.0.1:3000/_serverFn/docs-page", { headers: { cookie: `${I18N.COOKIE_NAME}=en-US` } }))
    await expect(loadDocsPage("getting-started")).resolves.toMatchObject({ locale: "pl-PL" })
    expect(getPage).toHaveBeenCalledExactlyOnceWith(["getting-started"], "pl-PL")
  })
})

describe("documentation head", () => {
  it("describes the docs index before any page data has loaded", () => {
    const { meta } = docsHead({ loaderData: undefined })
    expect(meta).toContainEqual({ title: APP_NAME })
    expect(meta).toContainEqual({ content: "", name: "description" })
    expect(meta).toContainEqual({ content: "article", property: "og:type" })
    expect(meta).toContainEqual({ content: `${APP_URL}${ROUTES.DOCS}`, property: "og:url" })
    expect(meta).toContainEqual({ content: "en_US", property: "og:locale" })
  })

  it("names the section of a docs page beside its title", async () => {
    const { meta } = docsHead({ loaderData: await loadDocsPage("getting-started") })
    expect(meta).toContainEqual({ content: "Basics", property: "article:section" })
    expect(meta).toContainEqual({ content: "Getting started", property: "og:title" })
  })
})
