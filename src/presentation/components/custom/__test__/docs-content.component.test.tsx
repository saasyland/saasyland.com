import { Suspense } from "react"

import { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { DOCS_CONTENT_ID } from "~/src/data/navigation.constants"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

import fumadocsMessages from "~/messages/en-US/fumadocs.json"

vi.mock("collections/browser", async () => {
  const { createClientLoader } = await import("fumadocs-mdx/runtime/browser")
  const { createElement } = await import("react")
  const page = (toc: { depth: number; title: string; url: string }[]) => ({
    default: () => createElement("p", null, "Compiled MDX body"),
    frontmatter: { description: "Start your project", title: "Getting started" },
    structuredData: { contents: [], headings: [] },
    toc,
  })
  const entries = {
    "getting-started.mdx": () => Promise.resolve(page([])),
    "guide.mdx": () => Promise.resolve(page([{ depth: 2, title: "Install", url: "#install" }])),
  }
  return {
    default: {
      docs: {
        createClientLoader: (options: Parameters<typeof createClientLoader<ReturnType<typeof page>>>[1]) =>
          createClientLoader(entries, options),
      },
    },
  }
})

class Observer {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", Observer)
  vi.stubGlobal("ResizeObserver", Observer)
  Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: () => [] })
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(Element.prototype, "getAnimations")
})

const DocsContent = ({ path }: Readonly<{ path: string }>) => docsContent.useContent(path)

const renderContent = async (path: string) => {
  await docsContent.preload(path)
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <RootProvider theme={{ enabled: false }}>
        <DocsLayout tree={{ children: [], name: "Docs" }}>
          <Suspense>
            <DocsContent path={path} />
          </Suspense>
        </DocsLayout>
      </RootProvider>
    </IntlProvider>,
  )
}

it("renders a documentation page with its title, description and MDX body", async () => {
  await renderContent("getting-started.mdx")
  expect(await screen.findByRole("heading", { name: "Getting started" })).toBeInTheDocument()
  expect(screen.getByText("Start your project")).toBeInTheDocument()
  expect(screen.getByText("Compiled MDX body")).toBeInTheDocument()
  expect(screen.getByRole("article")).toHaveAttribute("id", DOCS_CONTENT_ID)
})

it("keeps the id that the docs layout's skip link, its first link, jumps to", async () => {
  await renderContent("getting-started.mdx")
  const article = await screen.findByRole("article")
  const [skipLink] = screen.getAllByRole("link")

  expect(article).toHaveAttribute("id", DOCS_CONTENT_ID)
  expect(skipLink).toHaveAttribute("href", `#${DOCS_CONTENT_ID}`)
})

it("lists a page's headings in a table of contents at its top on narrow screens, and in no sticky bar", async () => {
  await renderContent("guide.mdx")
  expect(await screen.findByRole("heading", { name: "Getting started" })).toBeInTheDocument()
  expect(document.querySelector("[data-toc-popover]")).not.toBeInTheDocument()
  expect(screen.getByRole("navigation").querySelector('a[href="#install"]')).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Table of Contents" })).toHaveAttribute("aria-expanded", "false")
  expect(screen.getByRole("button", { name: "Table of Contents" }).closest(String.raw`.xl\:hidden`)).toBeInTheDocument()
})

it("lists a page's headings beside the article in the table of contents the blog uses, with none current before the page is measured", async () => {
  await renderContent("guide.mdx")
  const toc = within(await screen.findByRole("navigation", { name: fumadocsMessages.tableOfContents }))

  expect(toc.getByRole("link", { name: "Install" })).toHaveAttribute("href", "#install")
  expect(toc.getByRole("link", { name: "Install" })).toHaveClass("pl-4", "border-l")
  expect(toc.queryByRole("link", { current: "location" })).not.toBeInTheDocument()
  expect(document.querySelector("#nd-toc-placeholder")).not.toBeInTheDocument()
})

it("keeps the table of contents column for a page without headings", async () => {
  await renderContent("getting-started.mdx")
  await screen.findByRole("heading", { name: "Getting started" })

  expect(document.querySelector("#nd-toc-placeholder")).toBeInTheDocument()
  expect(document.querySelector("#nd-toc")).not.toBeInTheDocument()
})
