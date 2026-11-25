import { screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { AppHeader } from "~/src/presentation/components/custom/app/header"

import shadcnSidebarMessages from "~/messages/en-US/components.shadcn.sidebar.json"
import sidebarMessages from "~/messages/en-US/pages.app.sidebar.json"
import { ROUTES } from "~/src/routes"

const TEST_ENTRY = await vi.hoisted(async () => {
  const { Settings } = await import("lucide-react")
  const { ROUTES: PATHS } = await import("~/src/routes")

  return { icon: Settings, label: "navigation.sample.app.settings", to: PATHS.APP.SETTINGS.INDEX } as const
})

const TEST_ENTRY_LABEL = "Sample settings"

vi.mock(import("~/src/data/navigation"), async (importOriginal) => ({
  ...(await importOriginal()),
  APP_NAVIGATION: [TEST_ENTRY],
}))

const messages = {
  components: { shadcn: { sidebar: shadcnSidebarMessages } },
  navigation: { sample: { app: { settings: TEST_ENTRY_LABEL } } },
  pages: { app: { sidebar: sidebarMessages } },
}

const renderHeader = (path: string) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <SidebarProvider>
        <AppHeader />
      </SidebarProvider>
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ addEventListener: vi.fn(), matches: false, media: query, removeEventListener: vi.fn() })),
  )
})

describe("AppHeader", () => {
  it("names the page of the menu entry for the current path", () => {
    renderHeader(ROUTES.APP.SETTINGS.INDEX)

    expect(screen.getByText(TEST_ENTRY_LABEL)).toBeVisible()
  })

  it("names no page for a path without a menu entry when no area adds the workspace home", () => {
    renderHeader(`${ROUTES.APP.INDEX}/unknown`)

    expect(screen.queryByText(TEST_ENTRY_LABEL)).toBeNull()
    expect(screen.getByRole("link", { name: sidebarMessages.navigation.website })).toHaveAttribute("href", ROUTES.HOME)
  })
})
