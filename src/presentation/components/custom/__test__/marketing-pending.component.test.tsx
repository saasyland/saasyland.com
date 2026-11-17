import { RouterContextProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import {
  expectMarketingSkeleton,
  renderMarketingPending,
  stubMarketingObservers,
} from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { HomePending } from "~/src/presentation/components/custom/core-pending"
import { MarketingPending } from "~/src/presentation/components/custom/marketing-pending"

import navigationMessages from "~/messages/en-US/components.custom.navigation.json"

stubMarketingObservers()

const renderPendingPage = async ({ underHeader }: { readonly underHeader: boolean }) => {
  const root = createRootRoute()
  const page = createRoute({ getParentRoute: () => root, path: "/", staticData: { underHeader } })
  const router = createRouter({ history: createMemoryHistory({ initialEntries: ["/"] }), routeTree: root.addChildren([page]) })
  await router.load()

  render(
    <RouterContextProvider router={router}>
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <MarketingPending />
      </IntlProvider>
    </RouterContextProvider>,
  )
}

describe("path-aware skeletons", () => {
  it("renders only the layout chrome at a path without a page skeleton", () => {
    const { container } = renderMarketingPending("/unknown")

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each(["/", "/pl-PL"])("renders the landing page skeleton at %s", (path) => {
    expectMarketingSkeleton(path, HomePending)
  })
})

describe("the fixed site header", () => {
  it("opens with the skip link and then the site header", () => {
    const { container } = renderMarketingPending("/unknown")
    const [skipLink, header] = container.children

    expect(skipLink).toBe(screen.getByRole("link", { name: navigationMessages.skipToContent }))
    expect(header).toBe(screen.getByRole("banner"))
    expect(within(screen.getByRole("banner")).getByRole("navigation", { name: navigationMessages.ariaLabel })).toBeVisible()
  })

  it("starts the skeleton of a page below the header", async () => {
    await renderPendingPage({ underHeader: false })

    expect(screen.getByRole("main")).toHaveClass("pt-header")
  })

  it("lets the skeleton of a page that draws under the header start at the top", async () => {
    await renderPendingPage({ underHeader: true })

    expect(screen.getByRole("main")).not.toHaveClass("pt-header")
  })
})
