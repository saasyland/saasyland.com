import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { AUTH_APP_OVERVIEW } from "~/src/data/auth.app-overview"

import { AppPending } from "~/src/presentation/components/custom/app/app-pending"
import { AppSettingsPending } from "~/src/presentation/components/custom/app/auth-pending"

afterEach(cleanup)

describe("customer app skeletons", () => {
  it.each(["/app/settings", "/ja-JP/app/settings"])("renders the settings skeleton at %s", (path) => {
    const page = markupOf(<AppSettingsPending />)
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("draws only the page header and the next steps on the overview when no area adds a section to it", async () => {
    vi.resetModules()
    vi.doMock(import("~/src/data/app-overview.entries"), () => ({ AUTH_APP_OVERVIEW }))
    const { AppOverviewPending } = await import("~/src/presentation/components/custom/app/auth-pending")

    const { container } = render(<AppOverviewPending />)

    expect(container.querySelector('[aria-busy="true"]')?.children).toHaveLength(2)
    vi.doUnmock("~/src/data/app-overview.entries")
  })

  it("renders only the app chrome for a path without a page skeleton", () => {
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter("/app/unknown") })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
