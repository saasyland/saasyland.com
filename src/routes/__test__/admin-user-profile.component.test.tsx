import { QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { SESSION_MUTATION_KEYS, SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { listUserSessionsQuery } from "~/src/modules/session/use-cases/list-user-sessions"
import type { revokeUserSessionMutation } from "~/src/modules/session/use-cases/revoke-user-session"
import type { revokeUserSessionsMutation } from "~/src/modules/session/use-cases/revoke-user-sessions"
import type { deleteUserMutation } from "~/src/modules/user/use-cases/delete-user"
import { getUserQuery } from "~/src/modules/user/use-cases/get-user"
import { USER_MUTATION_KEYS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"

import { Route as ProfileRoute } from "~/src/routes/admin.users.$userId"

import { USER_PROFILE_SECTIONS } from "~/src/data/user-profile"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminMessages, adminQueryClient } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

type UserSession = Awaited<ReturnType<NonNullable<ReturnType<typeof listUserSessionsQuery>["queryFn"]>>>[number]

const revokeSession = vi.hoisted(() => vi.fn<NonNullable<typeof revokeUserSessionMutation.mutationFn>>())
const revokeSessions = vi.hoisted(() => vi.fn<NonNullable<typeof revokeUserSessionsMutation.mutationFn>>())
const remove = vi.hoisted(() => vi.fn<NonNullable<typeof deleteUserMutation.mutationFn>>())

vi.mock(import("~/src/modules/session/use-cases/revoke-user-session"), () => ({
  revokeUserSessionMutation: { mutationFn: revokeSession, mutationKey: SESSION_MUTATION_KEYS.REVOKE_USER },
}))
vi.mock(import("~/src/modules/session/use-cases/revoke-user-sessions"), () => ({
  revokeUserSessionsMutation: { mutationFn: revokeSessions, mutationKey: SESSION_MUTATION_KEYS.REVOKE_USER_SESSIONS },
}))
vi.mock(import("~/src/modules/user/use-cases/delete-user"), () => ({
  deleteUserMutation: { mutationFn: remove, mutationKey: USER_MUTATION_KEYS.DELETE },
}))

const labels = pagesAdminUsersMessages
const sessionLabels = labels.profile.sessions
const FORBIDDEN = new AppError(ERROR_CODES.FORBIDDEN)
const SIGNED_IN = new Date("2025-01-01T12:00:00Z")
const SESSIONS_READ_AT = new Date("2025-01-01T12:05:00Z")

const session = (overrides: Partial<UserSession> = {}): UserSession => ({
  createdAt: SIGNED_IN,
  expiresAt: new Date("2025-01-08T12:00:00Z"),
  id: "laptop-session",
  ipAddress: "192.0.2.1",
  updatedAt: SIGNED_IN,
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) Firefox/140.0",
  userId: "ada",
  ...overrides,
})

const SESSIONS = [
  session(),
  session({ id: "phone-session", ipAddress: "", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }),
  session({ id: "unknown-session", ipAddress: "", userAgent: "" }),
]

beforeAll(() =>
  Promise.all(
    USER_PROFILE_SECTIONS.map(async ({ Section }) => {
      await Section.preload?.()
    }),
  ),
)

const renderProfile = async ({ sessions = SESSIONS, user = adminUser() }: { sessions?: UserSession[]; user?: User["select"] } = {}) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
  queryClient.setQueryData(getUserQuery({ userId: user.id }).queryKey, user)
  queryClient.setQueryData(listUserSessionsQuery({ userId: user.id }).queryKey, sessions, { updatedAt: SESSIONS_READ_AT.getTime() })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  const list = createRoute({ component: () => <p>{labels.title}</p>, getParentRoute: () => root, path: ROUTES.ADMIN_USERS_ALL })
  Object.assign(ProfileRoute.options, {
    getParentRoute: () => root,
    id: "/admin/users/$userId",
    loader: () => ({ locale: "en-US", pathname: `${ROUTES.ADMIN_USERS}/${user.id}`, title: user.name }),
    path: "/admin/users/$userId",
  })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [`${ROUTES.ADMIN_USERS}/${user.id}`] }),
    rewrite: LOCALE_REWRITE,
    routeTree: root.addChildren([list, ProfileRoute]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={adminMessages} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { invalidateQueries, router, user: userEvent.setup({ delay: null }) }
}

const sessionRow = (device: string): HTMLElement => {
  const row = screen.getByText(device).closest("li")
  if (!row) {
    throw new Error(`Missing session on ${device}`)
  }
  return row
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  revokeSession.mockResolvedValue({ success: true })
  revokeSessions.mockResolvedValue({ success: true })
  remove.mockResolvedValue({ success: true })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("user profile", () => {
  it("shows who the user is, how their account is set up and where they are signed in", async () => {
    await renderProfile({ user: adminUser({ emailVerified: false, twoFactorEnabled: true }) })

    expect(screen.getByRole("heading", { level: 2, name: "Ada Lovelace" })).toBeVisible()
    expect(screen.getByText("ada@example.com")).toBeVisible()
    const details = screen.getByRole("heading", { name: labels.profile.details }).closest("[data-slot=card]")
    if (!(details instanceof HTMLElement)) {
      throw new TypeError("Missing account details")
    }
    expect(within(details).getByText(labels.table.headers.role).nextElementSibling).toHaveTextContent(labels.filters.role.options.customer)
    expect(within(details).getByText(labels.table.headers.status).nextElementSibling).toHaveTextContent(
      labels.filters.status.options.pending,
    )
    expect(within(details).getByText(labels.table.headers.emailVerified).nextElementSibling).toHaveTextContent(labels.table.booleans.no)
    expect(within(details).getByText(labels.table.headers.twoFactorEnabled).nextElementSibling).toHaveTextContent(labels.table.booleans.yes)
    expect(within(details).getByText(labels.table.headers.timezone).nextElementSibling).toHaveTextContent("Europe/Warsaw")
    expect(within(details).getByText(labels.table.headers.createdAt).nextElementSibling).toHaveTextContent("Jan 1, 2025")
    expect(screen.getByText(sessionLabels.description.replace("{name}", "Ada Lovelace"))).toBeVisible()
    expect(sessionRow("Firefox on macOS")).toHaveTextContent("Jan 1, 2025")
    expect(sessionRow("iOS")).toBeVisible()
    expect(sessionRow(authSecurityMessages.sessions.unknownDevice)).toBeVisible()
    expect(screen.getByRole("button", { name: labels.actions.row.menu.replace("{name}", "Ada Lovelace") })).toBeVisible()
  })

  it("shows the user's picture when they have one", async () => {
    await renderProfile({ user: adminUser({ image: "https://example.com/ada.png" }) })

    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveAttribute("src", "https://example.com/ada.png")
  })

  it("prints a role it does not know as it is stored", async () => {
    await renderProfile({ user: Object.assign(adminUser(), { role: "external-role" }) })

    expect(screen.getByText("external-role")).toBeVisible()
  })

  it("tells how long ago each session was active when the sessions were read", async () => {
    await renderProfile()

    expect(
      within(sessionRow(authSecurityMessages.sessions.unknownDevice)).getByText("Signed in Jan 1, 2025 · active 5 minutes ago"),
    ).toBeVisible()
  })

  it("says when the user has no session and offers nothing to revoke", async () => {
    await renderProfile({ sessions: [] })

    expect(screen.getByText(sessionLabels.empty)).toBeVisible()
    expect(screen.getByRole("button", { name: sessionLabels.revokeAll })).toBeDisabled()
  })
})

describe("revoking sessions", () => {
  it("revokes one session and refreshes the user's sessions", async () => {
    const { invalidateQueries, user } = await renderProfile()
    await user.click(within(sessionRow(authSecurityMessages.sessions.unknownDevice)).getByRole("button", { name: sessionLabels.revoke }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(sessionLabels.feedback.revokeSuccess)
    })
    expect(revokeSession).toHaveBeenCalledWith({ sessionId: "unknown-session" }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.USER })
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s when revoking one session", async (_kind, error, message) => {
    revokeSession.mockRejectedValueOnce(error)
    const { invalidateQueries, user } = await renderProfile()
    await user.click(within(sessionRow(authSecurityMessages.sessions.unknownDevice)).getByRole("button", { name: sessionLabels.revoke }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it("signs the user out everywhere only after confirmation", async () => {
    const { invalidateQueries, user } = await renderProfile()
    await user.click(screen.getByRole("button", { name: sessionLabels.revokeAll }))
    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toHaveTextContent(sessionLabels.revokeAllDialog.description.replace("{name}", "Ada Lovelace"))
    expect(revokeSessions).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: sessionLabels.revokeAllDialog.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(sessionLabels.feedback.revokeAllSuccess.replace("{name}", "Ada Lovelace"))
    })
    expect(revokeSessions).toHaveBeenCalledWith({ userId: "ada" }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.USER })
  })

  it("keeps every session when the confirmation is cancelled", async () => {
    const { user } = await renderProfile()
    await user.click(screen.getByRole("button", { name: sessionLabels.revokeAll }))
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: sessionLabels.revokeAllDialog.cancel }))

    expect(revokeSessions).not.toHaveBeenCalled()
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", FORBIDDEN, errorsMessages.codes.FORBIDDEN],
  ])("reports %s when revoking every session", async (_kind, error, message) => {
    revokeSessions.mockRejectedValueOnce(error)
    const { invalidateQueries, user } = await renderProfile()
    await user.click(screen.getByRole("button", { name: sessionLabels.revokeAll }))
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: sessionLabels.revokeAllDialog.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

describe("deleting from the profile", () => {
  it("returns to the users list once the user is gone", async () => {
    const { invalidateQueries, router, user } = await renderProfile()
    await user.click(screen.getByRole("button", { name: labels.actions.row.menu.replace("{name}", "Ada Lovelace") }))
    await user.click(screen.getByRole("menuitem", { name: labels.actions.row.delete }))
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: labels.actions.deleteDialog.confirm }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.ADMIN_USERS_ALL)
    })
    expect(remove).toHaveBeenCalledWith({ userId: "ada" }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: USER_QUERY_KEYS.ALL })
    expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.deleteSuccess)
  })
})
