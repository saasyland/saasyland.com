import { Suspense } from "react"

import { screen } from "@testing-library/react"
import { TreeContextProvider } from "fumadocs-ui/contexts/tree"
import { RootProvider } from "fumadocs-ui/provider/tanstack"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { blogLoader } from "~/src/integrations/fumadocs/fumadocs.blog.loader"
import { docsLoader, getDocsTree, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

const { getPage, getPageTree, serializePageTree } = vi.hoisted(() => ({
  getPage: vi.fn<
    (slugs: string[], locale: string) => { data: { title: string; description?: string }; path: string; url: string } | undefined
  >(() => ({
    data: { description: "Start your project", title: "Getting started" },
    path: "coverage-guide.mdx",
    url: "/docs/getting-started",
  })),
  getPageTree: vi.fn(() => ({ children: [{ name: "Getting started", type: "page", url: "/docs/getting-started" }], name: "Docs" })),
  serializePageTree: vi.fn((tree: unknown) => Promise.resolve(tree)),
}))

vi.mock("~/src/integrations/fumadocs/fumadocs.source", () => ({ source: { getPage, getPageTree, serializePageTree } }))

vi.mock("collections/browser", async () => {
  const { createClientLoader } = await import("fumadocs-mdx/runtime/browser")
  const { createElement } = await import("react")
  const document = {
    default: () => createElement("p", null, "Compiled MDX body"),
    frontmatter: { description: "Start your project", full: true, title: "Getting started" },
    toc: [],
  }
  const entries = { "coverage-guide.mdx": () => Promise.resolve(document) }
  return {
    default: {
      blog: {
        createClientLoader: (options: Parameters<typeof createClientLoader<typeof document>>[1]) => createClientLoader(entries, options),
      },
      docs: {
        createClientLoader: (options: Parameters<typeof createClientLoader<typeof document, { path: string }>>[1]) =>
          createClientLoader(entries, options),
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

describe("documentation loader", () => {
  it("serializes the locale's navigation tree", async () => {
    const result = await getDocsTree()
    expect(result.tree).toEqual(getPageTree())
    expect(getPageTree).toHaveBeenCalledWith("en-US")
    expect(serializePageTree).toHaveBeenCalledOnce()
  })

  it("preloads and renders the requested MDX page with its title and description", async () => {
    const page = await loadDocsPage("getting-started")
    expect(getPage).toHaveBeenCalledExactlyOnceWith(["getting-started"], "en-US")
    expect(page).toEqual({
      description: "Start your project",
      path: "coverage-guide.mdx",
      pathname: "/docs/getting-started",
      title: "Getting started",
    })
    const Page = docsLoader.getComponent(page.path)
    renderWithRouter(
      <RootProvider theme={{ enabled: false }}>
        <TreeContextProvider tree={{ children: [], name: "Docs" }}>
          <Suspense>
            <Page path={page.path} />
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
})

const BlogContent = () => blogLoader.useContent("coverage-guide.mdx")

it("renders blog MDX through the shared component map", async () => {
  await blogLoader.preload("coverage-guide.mdx")
  renderWithRouter(
    <Suspense>
      <BlogContent />
    </Suspense>,
  )
  expect(await screen.findByText("Compiled MDX body")).toBeInTheDocument()
})
