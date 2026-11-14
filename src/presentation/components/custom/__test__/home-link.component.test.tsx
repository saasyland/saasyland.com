import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { HomeLink } from "~/src/presentation/components/custom/home-link"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const MODIFIERS = ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const

const scrollTo = vi.fn<(options: ScrollToOptions) => void>()

const renderHomeLink = (path: string) => renderWithRouter(<HomeLink />, { router: createTestRouter(path) })

const logo = () => screen.getByRole("link", { name: APP_NAME })

const clickPrevented = (init: MouseEventInit = {}): boolean => {
  let prevented = false
  const record = (event: MouseEvent): void => {
    prevented = event.defaultPrevented
    event.preventDefault()
  }
  document.addEventListener("click", record, { once: true })
  fireEvent.click(logo(), init)
  return prevented
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", scrollTo)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("logo on the landing page", () => {
  it("scrolls back to the top instead of reloading the page it is already on", async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderHomeLink(ROUTES.HOME)
    const load = vi.spyOn(router, "load")

    await user.click(logo())

    expect(logo()).toHaveAttribute("href", ROUTES.HOME)
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 })
    expect(load).not.toHaveBeenCalled()
    expect(router.history.location.pathname).toBe(ROUTES.HOME)
  })

  it("clears the section hash without adding a history entry or resetting the smooth scroll", async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderHomeLink(`${ROUTES.HOME}#pricing`)
    const entries = router.history.length

    await user.click(logo())

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 })
    await waitFor(() => {
      expect(router.state.location.hash).toBe("")
    })
    expect(router.history.location.hash).toBe("")
    expect(router.history.length).toBe(entries)
  })

  it.each(MODIFIERS)("leaves a click with %s to the browser so it can open a new tab", (modifier) => {
    const { router } = renderHomeLink(ROUTES.HOME)
    const load = vi.spyOn(router, "load")

    expect(clickPrevented({ [modifier]: true })).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
  })
})

describe("logo on another page", () => {
  it("navigates home as a normal link", async () => {
    const user = userEvent.setup({ delay: null })
    const { router } = renderHomeLink(ROUTES.BLOG)

    await user.click(logo())

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.HOME)
    })
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
