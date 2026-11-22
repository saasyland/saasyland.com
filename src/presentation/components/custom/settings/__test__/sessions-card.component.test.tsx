import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type { AuthActiveSession } from "~/src/integrations/better-auth/auth.types"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { SESSION_MUTATION_KEYS, SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import type * as RevokeOtherSessionsUseCase from "~/src/modules/session/use-cases/revoke-other-sessions"
import type * as RevokeSessionUseCase from "~/src/modules/session/use-cases/revoke-session"

import { SETTINGS_DATE, renderSettings } from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { SessionsCard } from "~/src/presentation/components/custom/settings/sessions-card"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import countriesMessages from "~/messages/en-US/countries.json"
import errorsMessages from "~/messages/en-US/errors.json"
import plAuthSecurityMessages from "~/messages/pl-PL/auth.security.json"
import plCountriesMessages from "~/messages/pl-PL/countries.json"

type Revoked = Awaited<ReturnType<NonNullable<typeof RevokeSessionUseCase.revokeSessionMutation.mutationFn>>>
type OthersRevoked = Awaited<ReturnType<NonNullable<typeof RevokeOtherSessionsUseCase.revokeOtherSessionsMutation.mutationFn>>>

const revokeMock = vi.hoisted(() => vi.fn<NonNullable<typeof RevokeSessionUseCase.revokeSessionMutation.mutationFn>>())
const revokeOthersMock = vi.hoisted(() => vi.fn<NonNullable<typeof RevokeOtherSessionsUseCase.revokeOtherSessionsMutation.mutationFn>>())

vi.mock(import("~/src/modules/session/use-cases/revoke-session"), () => ({
  revokeSessionMutation: { mutationFn: revokeMock, mutationKey: SESSION_MUTATION_KEYS.REVOKE },
}))
vi.mock(import("~/src/modules/session/use-cases/revoke-other-sessions"), () => ({
  revokeOtherSessionsMutation: { mutationFn: revokeOthersMock, mutationKey: SESSION_MUTATION_KEYS.REVOKE_OTHER },
}))

const labels = authSecurityMessages.sessions
const REVOKED = { status: true } satisfies Revoked & OthersRevoked
const THREE_MINUTES_MS = 180_000
const CHROME_ON_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
const SAFARI_ON_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
const FIREFOX_ON_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0"
const EDGE_ON_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
const COUNTRY = "PL"
const IP_ADDRESS = "192.0.2.1"
const CURRENT_SESSION_ID = createAuthSessionFixture().session.id

const activeSession = (fields: Partial<AuthActiveSession> = {}): AuthActiveSession => ({
  country: COUNTRY,
  createdAt: SETTINGS_DATE,
  expiresAt: SETTINGS_DATE,
  id: "01900000-0000-7000-8000-000000000003",
  ipAddress: IP_ADDRESS,
  updatedAt: new Date(SETTINGS_DATE.getTime() - THREE_MINUTES_MS),
  userAgent: CHROME_ON_MAC,
  ...fields,
})

const OTHER_SESSION = activeSession()
const CURRENT_SESSION = activeSession({ id: CURRENT_SESSION_ID, userAgent: EDGE_ON_WINDOWS })

const renderSessions = (sessions: readonly AuthActiveSession[], options: Parameters<typeof renderSettings>[1] = {}) =>
  renderSettings(<SessionsCard />, {
    ...options,
    seed: (queryClient) => {
      queryClient.setQueryData(getActiveSessionsQuery.queryKey, [...sessions], { updatedAt: SETTINGS_DATE.getTime() })
    },
  })

const rowOf = (device: string): HTMLElement => {
  const rows = screen.getAllByRole("listitem").filter((row) => within(row).queryByText(device) !== null)
  expect(rows).toHaveLength(1)
  const [row] = rows
  if (row === undefined) {
    throw new Error(`No session row shows ${device}`)
  }
  return row
}

const signOutLabel = (device: string): string => labels.revokeLabel.replace("{device}", device)

beforeEach(() => {
  revokeMock.mockReset().mockResolvedValue(REVOKED)
  revokeOthersMock.mockReset().mockResolvedValue(REVOKED)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("the sessions list", () => {
  it("lists this device first, active now and without a sign-out button of its own", () => {
    const later = activeSession({ id: "01900000-0000-7000-8000-000000000004", userAgent: FIREFOX_ON_LINUX })
    renderSessions([OTHER_SESSION, CURRENT_SESSION, later])

    const rows = screen.getAllByRole("listitem")
    expect(rows.map((row) => within(row).getByText(/ on /u).textContent)).toStrictEqual([
      "Edge on Windows",
      "Chrome on macOS",
      "Firefox on Linux",
    ])
    const [current] = rows
    if (current === undefined) {
      throw new Error("The list shows no session")
    }
    expect(within(current).getByText(labels.thisDevice)).toBeVisible()
    expect(within(current).getByText(new RegExp(labels.activeNow, "u"))).toBeVisible()
    expect(within(current).queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getAllByText(labels.thisDevice)).toHaveLength(1)
    expect(screen.getByRole("button", { name: labels.revokeOthers })).toBeEnabled()
    expect(screen.queryByText(labels.noOthers)).not.toBeInTheDocument()
  })

  it("says no other device is signed in and offers no bulk sign-out when this is the only session", () => {
    renderSessions([CURRENT_SESSION])

    expect(screen.getByText(labels.noOthers)).toBeVisible()
    expect(screen.queryByRole("button", { name: labels.revokeOthers })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: labels.revoke })).not.toBeInTheDocument()
  })

  it("treats every session as another device when the current session is gone", () => {
    renderSessions([OTHER_SESSION, CURRENT_SESSION], { session: null })

    expect(screen.queryByText(labels.thisDevice)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: signOutLabel("Chrome on macOS") })).toBeVisible()
    expect(screen.getByRole("button", { name: signOutLabel("Edge on Windows") })).toBeVisible()
    expect(screen.getByRole("button", { name: labels.revokeOthers })).toBeVisible()
  })

  it("shows when each device signed in", () => {
    renderSessions([CURRENT_SESSION])
    const t = createTranslator({
      formats: I18N.FORMATS,
      locale: "en-US",
      messages: { auth: { security: authSecurityMessages } },
      namespace: "auth.security.sessions",
      timeZone: I18N.DEFAULT_TIMEZONE,
    })

    expect(screen.getByText(t("signedIn", { date: SETTINGS_DATE }))).toBeVisible()
  })
})

describe("naming a session's device", () => {
  it.each([
    { device: "Chrome on macOS", isMobile: false, userAgent: CHROME_ON_MAC },
    { device: "Safari on iOS", isMobile: true, userAgent: SAFARI_ON_IPHONE },
    { device: "Firefox", isMobile: false, userAgent: "Firefox/133.0" },
    { device: "Linux", isMobile: false, userAgent: "Mozilla/5.0 (X11; Linux x86_64)" },
    { device: labels.unknownDevice, isMobile: false, userAgent: "curl/8.7.1" },
    { device: labels.unknownDevice, isMobile: false, userAgent: null },
  ])("names $userAgent $device and signs out only that session", async ({ device, isMobile, userAgent }) => {
    renderSessions([CURRENT_SESSION, activeSession({ userAgent })])
    const row = rowOf(device)

    expect(row.querySelector(".lucide-smartphone") !== null).toBe(isMobile)
    expect(row.querySelector(".lucide-laptop") !== null).toBe(!isMobile)
    fireEvent.click(within(row).getByRole("button", { name: signOutLabel(device) }))

    await waitFor(() => {
      expect(revokeMock).toHaveBeenCalledExactlyOnceWith({ sessionId: OTHER_SESSION.id }, expect.anything())
    })
  })
})

describe("a session's location and activity", () => {
  it.each([
    { country: COUNTRY, details: `${countriesMessages.PL} · ${IP_ADDRESS} · Active 3 minutes ago`, ipAddress: IP_ADDRESS },
    { country: null, details: `${labels.unknownLocation} · Active 3 minutes ago`, ipAddress: null },
    { country: COUNTRY, details: `${countriesMessages.PL} · Active 3 minutes ago`, ipAddress: "" },
  ])("shows $details", ({ country, details, ipAddress }) => {
    renderSessions([CURRENT_SESSION, activeSession({ country, ipAddress })])

    expect(within(rowOf("Chrome on macOS")).getByText(details)).toBeVisible()
  })

  it.each([
    { elapsed: THREE_MINUTES_MS, time: "3 minutes ago" },
    { elapsed: 7_200_000, time: "2 hours ago" },
    { elapsed: 172_800_000, time: "2 days ago" },
  ])("counts $time from when the sessions were read", ({ elapsed, time }) => {
    const updatedAt = new Date(SETTINGS_DATE.getTime() - elapsed)
    renderSessions([activeSession({ updatedAt })])

    expect(screen.getByText(new RegExp(`Active ${time}$`, "u"))).toBeVisible()
  })

  it("localizes the device, the country and the activity in Polish", () => {
    const sessions = [activeSession({ ipAddress: null, userAgent: null }), activeSession({ id: CURRENT_SESSION_ID })]
    renderSessions(sessions, { locale: "pl-PL", messages: getTestMessages("pl-PL") })
    const polish = plAuthSecurityMessages.sessions

    expect(screen.getByText(polish.unknownDevice)).toBeVisible()
    const lastActive = polish.activeAgo.replace("{time}", "3 minuty temu")
    const device = polish.device.replace("{browser}", "Chrome").replace("{os}", "macOS")

    expect(screen.getByText(`${plCountriesMessages.PL} · ${lastActive}`)).toBeVisible()
    expect(screen.getByText(device)).toBeVisible()
    expect(screen.getByText(`${plCountriesMessages.PL} · ${IP_ADDRESS} · ${polish.activeNow}`)).toBeVisible()
  })
})

describe("signing out a device", () => {
  it("signs out the selected session and refreshes the sessions", async () => {
    const { invalidate } = renderSessions([CURRENT_SESSION, OTHER_SESSION])
    fireEvent.click(screen.getByRole("button", { name: signOutLabel("Chrome on macOS") }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.revoked)
    })
    expect(revokeMock).toHaveBeenCalledWith({ sessionId: OTHER_SESSION.id }, expect.anything())
    expect(revokeOthersMock).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
  })

  it("marks the sign-out as pending and blocks repeats until the request settles", async () => {
    const pending = Promise.withResolvers<Revoked>()
    revokeMock.mockReturnValueOnce(pending.promise)
    renderSessions([CURRENT_SESSION, OTHER_SESSION])
    const button = screen.getByRole("button", { name: signOutLabel("Chrome on macOS") })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true")
    })
    expect(button).toHaveAttribute("data-pending", "true")
    fireEvent.click(button)
    expect(revokeMock).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve(REVOKED)
      await pending.promise
    })
    await waitFor(() => {
      expect(button).not.toHaveAttribute("aria-disabled")
    })
    expect(button).not.toHaveAttribute("data-pending")
    expect(toast.success).toHaveBeenCalledWith(labels.revoked)
  })

  it("signs out every other device, blocking the button while it runs", async () => {
    const pending = Promise.withResolvers<OthersRevoked>()
    revokeOthersMock.mockReturnValueOnce(pending.promise)
    const { invalidate } = renderSessions([CURRENT_SESSION, OTHER_SESSION])
    const button = screen.getByRole("button", { name: labels.revokeOthers })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true")
    })

    await act(async () => {
      pending.resolve(REVOKED)
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.othersRevoked)
    })
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: SESSION_QUERY_KEYS.ALL })
  })

  it.each([
    { button: signOutLabel("Chrome on macOS"), mutation: revokeMock },
    { button: labels.revokeOthers, mutation: revokeOthersMock },
  ])("reports a failed $button without refreshing the sessions", async ({ button, mutation }) => {
    mutation.mockRejectedValueOnce(new Error("Network unavailable"))
    const { invalidate } = renderSessions([CURRENT_SESSION, OTHER_SESSION])
    fireEvent.click(screen.getByRole("button", { name: button }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(invalidate).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: labels.revokeOthers })).toBeEnabled()
  })
})
