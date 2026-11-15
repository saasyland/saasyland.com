import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

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

  it("renders only the app chrome for a path without a page skeleton", () => {
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter("/app/unknown") })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
