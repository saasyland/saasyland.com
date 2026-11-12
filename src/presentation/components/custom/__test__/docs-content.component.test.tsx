import { Suspense } from "react"

import { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

vi.mock("collections/browser", async () => {
  const { createClientLoader } = await import("fumadocs-mdx/runtime/browser")
  const { createElement } = await import("react")
  const document = {
    default: () => createElement("p", null, "Compiled MDX body"),
    frontmatter: { description: "Start your project", title: "Getting started" },
    structuredData: { contents: [], headings: [] },
    toc: [],
  }
  const entries = { "getting-started.mdx": () => Promise.resolve(document) }
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
})

const DocsContent = () => docsContent.useContent("getting-started.mdx")

it("renders a documentation page with its title, description and MDX body", async () => {
  await docsContent.preload("getting-started.mdx")
  renderWithRouter(
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout tree={{ children: [], name: "Docs" }}>
        <Suspense>
          <DocsContent />
        </Suspense>
      </DocsLayout>
    </RootProvider>,
  )
  expect(await screen.findByRole("heading", { name: "Getting started" })).toBeInTheDocument()
  expect(screen.getByText("Start your project")).toBeInTheDocument()
  expect(screen.getByText("Compiled MDX body")).toBeInTheDocument()
})
