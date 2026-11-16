import type { ReactNode } from "react"

import { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { getRequest } from "@tanstack/react-start/server"
import { screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { useFumadocsI18n } from "~/src/hooks/use-fumadocs-i18n"

import { DocsToolbar } from "~/src/presentation/components/custom/docs-toolbar"

import fumadocsMessages from "~/messages/pl-PL/fumadocs.json"
import contentNavigationMessages from "~/messages/pl-PL/navigation.content.json"

const POLISH = "pl-PL"
const GUIDE = "Przewodnik"
const TREE = { children: [{ name: GUIDE, type: "page" as const, url: "/docs/guide" }], name: contentNavigationMessages.header.docs }

const FumadocsRoot = ({ children }: Readonly<{ children: ReactNode }>) => {
  const i18n = useFumadocsI18n()

  return (
    <RootProvider i18n={i18n} theme={{ enabled: false }}>
      {children}
    </RootProvider>
  )
}

const renderToolbar = (path: string) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  renderWithRouter(
    <IntlProvider locale={POLISH} messages={getTestMessages(POLISH)} timeZone="UTC">
      <FumadocsRoot>
        <DocsLayout slots={{ header: DocsToolbar }} tree={TREE}>
          <p>Documentation content</p>
        </DocsLayout>
      </FumadocsRoot>
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

  return within(screen.getByRole("navigation", { name: contentNavigationMessages.header.docs }))
}

beforeEach(() => {
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

it("puts the one docs menu button, the current page and the search in a bar named after the docs, in the page's language", () => {
  const toolbar = renderToolbar(`/${POLISH}/docs/guide`)

  expect(toolbar.getByRole("button", { name: fumadocsMessages.sidebar.open })).toHaveAttribute("aria-controls", "nd-sidebar-mobile")
  expect(toolbar.getByRole("button", { name: fumadocsMessages.search.open })).toBeInTheDocument()
  expect(toolbar.getByText(GUIDE)).toBeInTheDocument()
  expect(toolbar.getAllByRole("button")).toHaveLength(2)
})

it("names the docs when the address matches no page", () => {
  const toolbar = renderToolbar(`/${POLISH}/docs/missing`)

  expect(toolbar.getByText(contentNavigationMessages.header.docs)).toBeInTheDocument()
})
