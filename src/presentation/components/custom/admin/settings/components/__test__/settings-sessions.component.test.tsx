import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type { AuthActiveSession } from "~/src/integrations/better-auth/auth.types"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { AdminActiveSessionRowClient } from "~/src/presentation/components/custom/admin/components/admin-active-session-row-client"
import { SettingsSessionsCardClient } from "~/src/presentation/components/custom/admin/settings/components/settings-sessions-card-client"

const { revoke, revokeOthers } = vi.hoisted(() => ({
  revoke: vi.fn<(data: { token: string }) => Promise<{ status: boolean }>>(),
  revokeOthers: vi.fn<() => Promise<{ status: boolean }>>(),
}))

vi.mock("~/src/modules/session/use-cases/revoke-session", () => ({ settingsRevokeSessionMutation: { mutationFn: revoke } }))
vi.mock("~/src/modules/session/use-cases/revoke-other-sessions", () => ({
  settingsRevokeOtherSessionsMutation: { mutationFn: revokeOthers },
}))

const messages = getTestMessages("en-US")
const labels = messages.pages.admin.settings.security.sessions
const { session } = createAuthSessionFixture()
const now = new Date("2026-09-20T12:00:00Z")

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

const renderSessions = () => {
  const router = createTestRouter()
  const invalidate = vi.spyOn(router, "invalidate").mockResolvedValue()
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <SettingsSessionsCardClient currentSessionId="current" sessions={[session, { ...session, id: "current", token: "current-token" }]} />
    </IntlProvider>,
    { router },
  )
  result.queryClient.setQueryData(SESSION_QUERY_KEYS.ALL, [session])
  return { ...result, invalidate }
}

describe("session revocation", () => {
  it("revokes only the selected session and refreshes session data", async () => {
    const { queryClient, invalidate } = renderSessions()
    fireEvent.click(screen.getByRole("button", { name: labels.revoke }))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.feedback.revokeSuccess)
    })
    expect(revoke).toHaveBeenCalledWith({ token: session.token }, expect.anything())
    expect(revokeOthers).not.toHaveBeenCalled()
    expect(queryClient.getQueryState(SESSION_QUERY_KEYS.ALL)?.isInvalidated).toBe(true)
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it("disables revocation while logging out other sessions and refreshes on success", async () => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    revokeOthers.mockReturnValueOnce(pending.promise)
    const { queryClient, invalidate } = renderSessions()
    const button = screen.getByRole("button", { name: labels.logoutAll })
    fireEvent.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    await act(async () => {
      pending.resolve({ status: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.feedback.logoutAllSuccess)
    })
    expect(queryClient.getQueryState(SESSION_QUERY_KEYS.ALL)?.isInvalidated).toBe(true)
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it.each(["single", "others"] as const)("shows a failed %s revocation without invalidating session data", async (kind) => {
    const mutation = kind === "single" ? revoke : revokeOthers
    mutation.mockRejectedValueOnce(new Error("Network unavailable"))
    const { queryClient, invalidate } = renderSessions()
    fireEvent.click(screen.getByRole("button", { name: kind === "single" ? labels.revoke : labels.logoutAll }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })
    expect(queryClient.getQueryState(SESSION_QUERY_KEYS.ALL)?.isInvalidated).toBe(false)
    expect(invalidate).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: labels.logoutAll })).toBeEnabled()
  })
})

const renderSession = (overrides: Partial<AuthActiveSession> = {}, currentSessionId?: string) => {
  const onRevoke = vi.fn<(token: string) => void>()
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <AdminActiveSessionRowClient
        currentSessionId={currentSessionId}
        isPending={false}
        onRevoke={onRevoke}
        session={{ ...session, ...overrides }}
      />
    </IntlProvider>,
  )
  return { ...result, onRevoke }
}

describe("active session details", () => {
  it.each([
    { elapsed: 0, time: "just now" },
    { elapsed: 180_000, time: "3 min" },
    { elapsed: 7_200_000, time: "2 h" },
    { elapsed: 172_800_000, time: "2 d" },
  ])("shows $time for an inactive session", ({ elapsed, time }) => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(now)
    renderSession({ updatedAt: new Date(now.getTime() - elapsed), userAgent: "Firefox desktop" })
    expect(screen.getByText(new RegExp(time, "u"))).toBeInTheDocument()
    expect(screen.getByText("Firefox desktop")).toBeInTheDocument()
  })

  it.each([
    { expected: "Unknown device", ipAddress: undefined, userAgent: undefined },
    { expected: "Unknown device", ipAddress: null, userAgent: null },
    { expected: "Unknown device", ipAddress: "", userAgent: "" },
    { expected: "192.0.2.1", ipAddress: "192.0.2.1", userAgent: "" },
    { expected: "iPhone mobile", ipAddress: "192.0.2.1", userAgent: "iPhone mobile" },
  ])("uses $expected as the device label", ({ expected, ...device }) => {
    const { container, onRevoke } = renderSession(device)
    expect(screen.getByText(expected)).toBeInTheDocument()
    if (device.userAgent === "iPhone mobile") {
      expect(container.querySelector(".lucide-smartphone")).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole("button", { name: labels.revoke }))
    expect(onRevoke).toHaveBeenCalledExactlyOnceWith(session.token)
  })

  it("marks the current session and prevents revoking it individually", () => {
    renderSession({ ipAddress: "192.0.2.2", userAgent: "Current browser" }, session.id)
    expect(screen.getByText(labels.currentBadge)).toBeInTheDocument()
    expect(screen.getByText(/192\.0\.2\.2/u)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: labels.revoke })).not.toBeInTheDocument()
  })
})
