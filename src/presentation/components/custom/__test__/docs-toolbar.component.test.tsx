import { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { DocsToolbar } from "~/src/presentation/components/custom/docs-toolbar"

import contentNavigationMessages from "~/messages/en-US/navigation.content.json"

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

it("puts the docs search and sidebar toggle in a labelled navigation, so the site header stays the only banner", () => {
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <RootProvider theme={{ enabled: false }}>
        <DocsLayout slots={{ header: DocsToolbar }} tree={{ children: [], name: "Docs" }}>
          <p>Documentation content</p>
        </DocsLayout>
      </RootProvider>
    </IntlProvider>,
  )

  const toolbar = screen.getByRole("navigation", { name: contentNavigationMessages.header.docs })
  expect(within(toolbar).getByRole("button", { name: "Open Sidebar" })).toBeInTheDocument()
  expect(toolbar.querySelector(":scope > header")).toBeInTheDocument()
})
