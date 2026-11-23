import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { AppPending } from "~/src/presentation/components/custom/app/app-pending"
import { AppDeleteAccountPending, AppSettingsPending } from "~/src/presentation/components/custom/app/auth-pending"

import { routeTree } from "~/src/routeTree.gen"

afterEach(cleanup)

describe("customer app skeletons", () => {
  it.each(["/app/settings", "/ja-JP/app/settings"])("renders the settings skeleton at %s", (path) => {
    const page = markupOf(<AppSettingsPending />)
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter(path, routeTree) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("renders the account deletion skeleton on the page the deletion link opens", () => {
    const page = markupOf(<AppDeleteAccountPending />)
    const { container } = renderWithRouter(<AppPending />, {
      router: createTestRouter("/app/settings/delete-account?token=abc", routeTree),
    })

    expect(busyMarkup(container)).toBe(page)
  })

  it("draws only the page header and the next steps on the overview when no area adds a section to it", async () => {
    vi.resetModules()
    vi.doMock("~/src/areas/browser.entries", () => ({ CORE_BROWSER: { name: "core" } }))
    const { AppOverviewPending } = await import("~/src/presentation/components/custom/app/auth-pending")

    const { container } = render(<AppOverviewPending />)

    expect(container.querySelector('[aria-busy="true"]')?.children).toHaveLength(2)
    vi.doUnmock("~/src/areas/browser.entries")
  })

  it("renders only the app chrome for a path without a page skeleton", () => {
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter("/app/unknown", routeTree) })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
