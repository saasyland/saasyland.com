import { Suspense } from "react"

import { getRequest } from "@tanstack/react-start/server"
import { screen } from "@testing-library/react"
import { TreeContextProvider } from "fumadocs-ui/contexts/tree"
import { RootProvider } from "fumadocs-ui/provider/tanstack"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const { getPage } = vi.hoisted(() => ({
  getPage: vi.fn<
    (slugs: string[], locale: string) => { data: { title: string; description?: string }; path: string; url: string } | undefined
  >(() => ({
    data: { description: "Start your project", title: "Getting started" },
    path: "coverage-guide.mdx",
    url: "/docs/getting-started",
  })),
}))

vi.mock("~/src/integrations/fumadocs/fumadocs.source", () => ({ source: { getPage } }))

vi.mock("collections/browser", async () => {
  const { createClientLoader } = await import("fumadocs-mdx/runtime/browser")
  const { createElement } = await import("react")
  const document = {
    default: () => createElement("p", null, "Compiled MDX body"),
    frontmatter: { description: "Start your project", title: "Getting started" },
    toc: [],
  }
  const entries = { "coverage-guide.mdx": () => Promise.resolve(document) }
  return {
    default: {
      docs: {
        createClientLoader: (options: Parameters<typeof createClientLoader<typeof document>>[1]) => createClientLoader(entries, options),
      },
    },
  }
})

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const DocsContent = ({ path }: { readonly path: string }) => docsContent.useContent(path)

describe("documentation loader", () => {
  it("preloads and renders the requested MDX page with its title and description", async () => {
    const page = await loadDocsPage("getting-started")
    expect(getPage).toHaveBeenCalledExactlyOnceWith(["getting-started"], "en-US")
    expect(page).toEqual({
      description: "Start your project",
      locale: "en-US",
      path: "coverage-guide.mdx",
      pathname: "/docs/getting-started",
      title: "Getting started",
    })
    renderWithRouter(
      <RootProvider theme={{ enabled: false }}>
        <TreeContextProvider tree={{ children: [], name: "Docs" }}>
          <Suspense>
            <DocsContent path={page.path} />
          </Suspense>
        </TreeContextProvider>
      </RootProvider>,
    )
    expect(await screen.findByRole("heading", { name: "Getting started" })).toBeInTheDocument()
    expect(screen.getByText("Start your project")).toBeInTheDocument()
    expect(screen.getByText("Compiled MDX body")).toBeInTheDocument()
  })

  it("loads the docs index and normalizes a missing description", async () => {
    getPage.mockReturnValueOnce({ data: { title: "Docs" }, path: "coverage-guide.mdx", url: "/docs" })
    await expect(loadDocsPage()).resolves.toMatchObject({ description: "", pathname: "/docs", title: "Docs" })
    expect(getPage).toHaveBeenCalledExactlyOnceWith([], "en-US")
  })

  it("returns not found without preloading a missing document", async () => {
    getPage.mockReturnValueOnce(undefined)
    await expect(loadDocsPage("missing")).rejects.toMatchObject({ isNotFound: true })
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
})
