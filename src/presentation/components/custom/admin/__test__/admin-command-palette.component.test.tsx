import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { SearchHit } from "~/src/modules/_core/utils/search"
import { searchCoursesQuery } from "~/src/modules/course/use-cases/search-courses"
import { searchLessonsQuery } from "~/src/modules/lesson/use-cases/search-lessons"
import { searchOrdersQuery } from "~/src/modules/order/use-cases/search-orders"
import { searchUsersQuery } from "~/src/modules/user/use-cases/search-users"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminCommandPalette } from "~/src/presentation/components/custom/admin/admin-command-palette"

import authNavigation from "~/messages/en-US/navigation.auth.json"
import coursesNavigation from "~/messages/en-US/navigation.courses.json"
import paymentsNavigation from "~/messages/en-US/navigation.payments.json"
import labels from "~/messages/en-US/pages.admin.json"
import * as ROUTES from "~/src/routes"

const copy = labels.components.commandPalette
const RECENT_STORAGE_KEY = "admin-command-palette-recent"
const ADA: SearchHit = { detail: "ada@example.test", id: "user-ada", title: "Ada Lovelace", to: `${ROUTES.ADMIN_USERS}/user-ada` }

const seedSearch = (
  text: string,
  hits: { readonly courses?: SearchHit[]; readonly orders?: SearchHit[]; readonly users?: SearchHit[] },
) => {
  const queryClient = adminQueryClient()
  const locale = I18N.DEFAULT_LOCALE
  const seeds = [
    () => queryClient.setQueryData(searchUsersQuery({ text }).queryKey, hits.users ?? []),
    () => queryClient.setQueryData(searchOrdersQuery({ text }).queryKey, hits.orders ?? []),
    () => queryClient.setQueryData(searchCoursesQuery({ locale, text }).queryKey, hits.courses ?? []),
    () => queryClient.setQueryData(searchLessonsQuery({ locale, text }).queryKey, []),
  ]
  for (const seed of seeds) {
    seed()
  }
  return queryClient
}

const renderPalette = (queryClient = adminQueryClient()) => {
  const { router } = renderAdmin(<AdminCommandPalette />, { queryClient })
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
  const preloadRoute = vi.spyOn(router, "preloadRoute").mockResolvedValue(undefined)
  return { navigate, preloadRoute, user: userEvent.setup({ delay: null }) }
}

const openPalette = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: copy.title }))
  return screen.findByRole("dialog")
}

afterEach(() => {
  globalThis.localStorage.clear()
  vi.restoreAllMocks()
})

describe("admin command palette", () => {
  it("opens from its button with the quick actions and every page, and a footer naming the keys", async () => {
    const { user } = renderPalette()

    const dialog = await openPalette(user)

    expect(within(dialog).getByRole("searchbox", { name: copy.placeholder })).toHaveFocus()
    expect(within(dialog).getByRole("menuitem", { name: coursesNavigation.command.newCourse })).toBeVisible()
    expect(within(dialog).getByRole("menuitem", { name: authNavigation.command.viewSite })).toBeVisible()
    expect(within(dialog).getByRole("menuitem", { name: /^Settings/u })).toBeVisible()
    expect(within(dialog).queryByText(copy.groups.recent)).toBeNull()
    expect(within(dialog).getByText(copy.keys.navigate)).toBeInTheDocument()
    expect(within(dialog).getByText(copy.keys.open)).toBeInTheDocument()
    expect(within(dialog).getByText(copy.keys.close)).toBeInTheDocument()
  })

  it("toggles with Ctrl+K or ⌘K and shows the modifier of the visitor's platform", async () => {
    vi.spyOn(globalThis.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
    renderPalette()

    expect(screen.getByRole("button", { name: copy.title })).toHaveTextContent("⌘")
    fireEvent.keyDown(document, { ctrlKey: true, key: "k" })
    expect(await screen.findByRole("dialog")).toBeVisible()
    fireEvent.keyDown(document, { key: "K", metaKey: true })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    fireEvent.keyDown(document, { key: "k" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows Ctrl on other platforms", () => {
    renderPalette()

    expect(screen.getByRole("button", { name: copy.title })).toHaveTextContent("Ctrl")
  })

  it("finds a user on the server, opens the profile and lists it under recent the next time", async () => {
    const { navigate, user } = renderPalette(seedSearch("ada", { users: [ADA] }))

    const dialog = await openPalette(user)
    await user.keyboard("ada")
    const hit = await within(dialog).findByRole("menuitem", { name: /Ada Lovelace/u })
    expect(hit).toHaveTextContent(ADA.detail)
    expect(within(dialog).getByText(authNavigation.search.users)).toBeVisible()
    await user.click(hit)

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ href: ADA.to })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })

    const reopened = await openPalette(user)
    expect(within(reopened).getByText(copy.groups.recent)).toBeVisible()
    expect(within(reopened).getAllByRole("menuitem")[0]).toHaveAccessibleName(/Ada Lovelace/u)
  })

  it("moves through results with the arrow keys and opens an order with Enter", async () => {
    const order: SearchHit = { detail: "ord_ada · Core", id: "ord_ada", title: "Ada Lovelace", to: `${ROUTES.ADMIN_ORDERS}/ord_ada` }
    const { navigate, user } = renderPalette(seedSearch("ord_ada", { orders: [order] }))

    const dialog = await openPalette(user)
    await user.keyboard("ord_ada")
    await within(dialog).findByRole("menuitem", { name: /ord_ada/u })
    expect(within(dialog).getByText(paymentsNavigation.search.orders)).toBeVisible()
    expect(within(dialog).queryByText(copy.groups.pages)).toBeNull()
    await user.keyboard("{ArrowDown}{Enter}")

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ href: order.to })
  })

  it("loads a result's page when the pointer rests on it", async () => {
    const order: SearchHit = { detail: "ord_ada · Core", id: "ord_ada", title: "Ada Lovelace", to: `${ROUTES.ADMIN_ORDERS}/ord_ada` }
    const { preloadRoute, user } = renderPalette(seedSearch("ord_ada", { orders: [order] }))

    const dialog = await openPalette(user)
    await user.keyboard("ord_ada")
    await user.hover(await within(dialog).findByRole("menuitem", { name: /ord_ada/u }))

    expect(preloadRoute).toHaveBeenCalledExactlyOnceWith({ to: order.to })
  })

  it("keeps the pages and actions that match beside the records, and drops the records below two letters", async () => {
    const course: SearchHit = { detail: "shipping", id: "course-1", title: "Shipping", to: `${ROUTES.ADMIN_COURSES}/course-1` }
    const { user } = renderPalette(seedSearch("sh", { courses: [course] }))

    const dialog = await openPalette(user)
    await user.keyboard("sh")
    expect(await within(dialog).findByRole("menuitem", { name: /Shipping/u })).toBeVisible()
    expect(within(dialog).getByText(coursesNavigation.search.courses)).toBeVisible()
    await user.keyboard("{Backspace}")

    await waitFor(() => {
      expect(within(dialog).queryByRole("menuitem", { name: /Shipping/u })).toBeNull()
    })
  })

  it("says what it is doing while it searches and when nothing matches", async () => {
    const { user } = renderPalette()

    const dialog = await openPalette(user)
    await user.keyboard("zz-nothing")

    expect(within(dialog).getAllByText(copy.searching).length).toBeGreaterThan(0)
    expect(await within(dialog).findByText(copy.empty.replace("{query}", "zz-nothing"))).toBeVisible()
    expect(within(dialog).getByText(copy.emptyHint)).toBeVisible()
  })

  it("searches no records the signed-in role may not read", async () => {
    const queryClient = seedSearch("ada", { users: [ADA] })
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))
    const { user } = renderPalette(queryClient)

    const dialog = await openPalette(user)
    await user.keyboard("ada")

    expect(await within(dialog).findByText(copy.empty.replace("{query}", "ada"))).toBeVisible()
  })
})

describe("admin command palette history", () => {
  it("lists recent pages and records with their own icons and ignores a damaged or foreign history", async () => {
    globalThis.localStorage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify([
        { detail: "", group: "pages", title: "Settings", to: ROUTES.ADMIN_SETTINGS },
        { detail: ADA.detail, group: "auth.users", title: ADA.title, to: ADA.to },
        { detail: "", group: "retired", title: "Old page", to: "/admin/retired" },
      ]),
    )
    const { navigate, user } = renderPalette()

    const dialog = await openPalette(user)
    const recent = within(dialog).getAllByRole("menuitem").slice(0, 3)
    expect(recent.map((item) => item.textContent)).toStrictEqual(["Settings", `${ADA.title}${ADA.detail}`, "Old page"])
    await user.click(recent[1] ?? dialog)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ href: ADA.to })
    expect(JSON.parse(globalThis.localStorage.getItem(RECENT_STORAGE_KEY) ?? "[]")).toMatchObject([
      { to: ADA.to },
      { to: ROUTES.ADMIN_SETTINGS },
      { to: "/admin/retired" },
    ])
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })

    globalThis.localStorage.setItem(RECENT_STORAGE_KEY, "{")
    const reopened = await openPalette(user)
    expect(within(reopened).queryByText(copy.groups.recent)).toBeNull()
    await user.keyboard("{Escape}")

    globalThis.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([{ title: "No path" }]))
    const again = await openPalette(user)
    expect(within(again).queryByText(copy.groups.recent)).toBeNull()
  })

  it("still opens a page when the browser refuses to store the history", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    const { navigate, user } = renderPalette()

    const dialog = await openPalette(user)
    await user.click(within(dialog).getByRole("menuitem", { name: /^Settings/u }))

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ href: ROUTES.ADMIN_SETTINGS })
  })
})

describe("admin command palette sessions", () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "getAnimations")
    vi.unstubAllGlobals()
  })

  it("opens a fresh palette when the shortcut comes while the last one is still animating out", async () => {
    vi.stubGlobal(
      "CSSTransition",
      class {
        readonly transitionProperty = "opacity"
      },
    )
    Object.defineProperty(HTMLElement.prototype, "getAnimations", {
      configurable: true,
      value: () => [{ finished: Promise.withResolvers().promise, playState: "running" }],
    })
    const { navigate, user } = renderPalette()

    const dialog = await openPalette(user)
    await user.keyboard("sett")
    await user.click(within(dialog).getByRole("menuitem", { name: /^Settings/u }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ href: ROUTES.ADMIN_SETTINGS })
    fireEvent.keyDown(document, { ctrlKey: true, key: "k" })

    const search = await screen.findByRole("searchbox", { name: copy.placeholder })
    expect(search).toHaveValue("")
    expect(search).toHaveFocus()
    expect(screen.getByText(copy.groups.recent)).toBeVisible()
  })
})
