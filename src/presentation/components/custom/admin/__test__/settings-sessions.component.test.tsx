import { QueryClient } from "@tanstack/react-query"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import type { AuthActiveSession } from "~/src/integrations/better-auth/auth.types"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"

import { SettingsSessions } from "~/src/presentation/components/custom/admin/settings/sessions"

import pagesAdminSettingsMessages from "~/messages/en-US/pages.admin.settings.json"

const { revoke, revokeOthers } = vi.hoisted(() => ({
  revoke: vi.fn<(data: { sessionId: string }) => Promise<{ status: boolean }>>(),
  revokeOthers: vi.fn<() => Promise<{ status: boolean }>>(),
}))

vi.mock("~/src/modules/session/use-cases/revoke-session", () => ({ revokeSessionMutation: { mutationFn: revoke } }))
vi.mock("~/src/modules/session/use-cases/revoke-other-sessions", () => ({
  revokeOtherSessionsMutation: { mutationFn: revokeOthers },
}))

const labels = pagesAdminSettingsMessages.security.sessions
const now = new Date("2026-09-20T12:00:00Z")
const currentSession = createAuthSessionFixture()
const session: AuthActiveSession = {
  createdAt: now,
  expiresAt: now,
  id: "01900000-0000-7000-8000-000000000003",
  ipAddress: null,
  updatedAt: now,
  userAgent: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  revoke.mockResolvedValue({ status: true })
  revokeOthers.mockResolvedValue({ status: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const renderSessions = (
  sessions: AuthActiveSession[] = [session, { ...session, id: currentSession.session.id }],
  locale: "en-US" | "pl-PL" = "en-US",
) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, currentSession)
  queryClient.setQueryData(getActiveSessionsQuery.queryKey, sessions)
  const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const result = renderWithRouter(
    <IntlProvider locale={locale} messages={getTestMessages(locale)}>
      <SettingsSessions />
    </IntlProvider>,
    { queryClient },
  )
  return { ...result, invalidate }
}

describe("session revocation", () => {
  it("revokes only the selected session and refreshes session data", async () => {
    const { invalidate } = renderSessions()
    fireEvent.click(screen.getByRole("button", { name: labels.revoke }))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.feedback.revokeSuccess)
    })
    expect(revoke).toHaveBeenCalledWith({ sessionId: session.id }, expect.anything())
    expect(revokeOthers).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
  })

  it("shows a spinner and blocks repeat revocations until the request settles", async () => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    revoke.mockReturnValueOnce(pending.promise)
    renderSessions()
    const button = screen.getByRole("button", { name: labels.revoke })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    expect(button).not.toHaveTextContent(labels.revoke)
    expect(button.querySelector(".animate-spin")).toBeInTheDocument()
    fireEvent.click(button)
    expect(revoke).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(button).toBeEnabled()
    })
    expect(button).toHaveTextContent(labels.revoke)
    expect(button.querySelector(".animate-spin")).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith(labels.feedback.revokeSuccess)
  })

  it("disables logging out other sessions while it runs and refreshes on success", async () => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    revokeOthers.mockReturnValueOnce(pending.promise)
    const { invalidate } = renderSessions()
    const button = screen.getByRole("button", { name: labels.logoutAll })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.feedback.logoutAllSuccess)
    })
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
  })

  it.each(["single", "others"] as const)("shows a failed %s revocation without refreshing session data", async (kind) => {
    const mutation = kind === "single" ? revoke : revokeOthers
    mutation.mockRejectedValueOnce(new Error("Network unavailable"))
    const { invalidate } = renderSessions()
    fireEvent.click(screen.getByRole("button", { name: kind === "single" ? labels.revoke : labels.logoutAll }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })
    expect(invalidate).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: labels.logoutAll })).toBeEnabled()
  })
})

describe("active session details", () => {
  it("localizes session details in Polish", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(now)
    renderSessions([{ ...session, ipAddress: "", updatedAt: new Date(now.getTime() - 180_000), userAgent: "" }], "pl-PL")
    expect(screen.getByText("Nieznane urządzenie")).toBeInTheDocument()
    expect(screen.getByText(/Ostatnia aktywność: 3 minuty temu/u)).toBeInTheDocument()
  })

  it.each([
    { elapsed: 0, time: "now" },
    { elapsed: 180_000, time: "3 minutes ago" },
    { elapsed: 7_200_000, time: "2 hours ago" },
    { elapsed: 172_800_000, time: "2 days ago" },
  ])("shows $time for an inactive session", ({ elapsed, time }) => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(now)
    renderSessions([{ ...session, updatedAt: new Date(now.getTime() - elapsed), userAgent: "Firefox desktop" }])
    expect(screen.getByText(new RegExp(time, "u"))).toBeInTheDocument()
    expect(screen.getByText("Firefox desktop")).toBeInTheDocument()
  })

  it.each([
    { expected: "Unknown device", ipAddress: null, userAgent: null },
    { expected: "Unknown device", ipAddress: "", userAgent: "" },
    { expected: "192.0.2.1", ipAddress: "192.0.2.1", userAgent: "" },
    { expected: "iPhone mobile", ipAddress: "192.0.2.1", userAgent: "iPhone mobile" },
  ])("uses $expected as the device label", async ({ expected, ...device }) => {
    const { container } = renderSessions([{ ...session, ...device }])
    expect(screen.getByText(expected)).toBeInTheDocument()
    if (device.userAgent === "iPhone mobile") {
      expect(container.querySelector(".lucide-smartphone")).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole("button", { name: labels.revoke }))
    await waitFor(() => {
      expect(revoke).toHaveBeenCalledExactlyOnceWith({ sessionId: session.id }, expect.anything())
    })
  })

  it("marks the current session and prevents revoking it individually", () => {
    renderSessions([{ ...session, id: currentSession.session.id, ipAddress: "192.0.2.2", userAgent: "Current browser" }])
    expect(screen.getByText(labels.currentBadge)).toBeInTheDocument()
    expect(screen.getByText(/192\.0\.2\.2/u)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: labels.revoke })).not.toBeInTheDocument()
  })
})
