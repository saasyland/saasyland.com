import { QueryClient } from "@tanstack/react-query"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import type { updatePreferencesMutation } from "~/src/modules/user/use-cases/update-preferences"
import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

import { PreferencesCard, PreferencesCardPending } from "~/src/presentation/components/custom/preferences-card"

import preferencesCardMessages from "~/messages/en-US/components.custom.preferences-card.json"
import errorsMessages from "~/messages/en-US/errors.json"
import timezonesMessages from "~/messages/en-US/timezones.json"

const SAVED_TIMEZONE = "Europe/Warsaw"
const BROWSER_TIMEZONE = "Asia/Tokyo"
const UNLISTED_BROWSER_TIMEZONE = "Etc/GMT+5"

const save = vi.hoisted(() => vi.fn<NonNullable<typeof updatePreferencesMutation.mutationFn>>())
const sessionRequest = vi.hoisted(() => vi.fn())

vi.mock(import("~/src/modules/user/use-cases/update-preferences"), () => ({
  updatePreferencesMutation: { mutationFn: save, mutationKey: USER_MUTATION_KEYS.UPDATE_PREFERENCES },
}))
vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

const labels = preferencesCardMessages

const SystemDateTimeFormat = Intl.DateTimeFormat

const reportBrowserTimezone = (timeZone: string): void => {
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    class extends SystemDateTimeFormat {
      constructor(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
        super(locales, { ...options, timeZone: options?.timeZone ?? timeZone })
      }
    },
  )
}

const renderCard = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture())
  const result = renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={getTestMessages("en-US")} timeZone={I18N.DEFAULT_TIMEZONE}>
      <PreferencesCard />
    </IntlProvider>,
    { queryClient },
  )
  return { ...result, user: userEvent.setup({ delay: null }) }
}

const timezoneField = () => screen.getByRole("combobox", { name: labels.timezone.label })

const search = async (user: ReturnType<typeof userEvent.setup>, text: string): Promise<void> => {
  await user.click(timezoneField())
  fireEvent.change(timezoneField(), { target: { value: text } })
}

const saveButton = () => screen.getByRole("button", { name: labels.save })

beforeEach(() => {
  save.mockReset().mockResolvedValue({ status: true })
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("preferences card", () => {
  it("shows the saved time zone and saves another one found by search", async () => {
    const { queryClient, user } = renderCard()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    expect(await screen.findByRole("heading", { name: labels.title })).toBeVisible()
    expect(timezoneField()).toHaveValue(timezonesMessages[SAVED_TIMEZONE])
    expect(timezoneField()).toHaveAccessibleDescription(labels.timezone.description)

    await search(user, "Tokyo")
    await user.click(await screen.findByRole("option", { name: timezonesMessages[BROWSER_TIMEZONE] }))
    await user.click(saveButton())

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.saved)
    })
    expect(save).toHaveBeenCalledExactlyOnceWith({ timezone: BROWSER_TIMEZONE }, expect.anything())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEYS.CURRENT })
    expect(sessionRequest).toHaveBeenCalledOnce()
  })

  it("says so when no time zone matches the search", async () => {
    const { user } = renderCard()

    await search(user, "Atlantis")

    expect(await screen.findByText(labels.timezone.empty)).toBeVisible()
  })

  it("keeps the saved time zone when the search is abandoned", async () => {
    const { user } = renderCard()

    fireEvent.change(timezoneField(), { target: { value: "" } })
    fireEvent.blur(timezoneField())
    await user.click(saveButton())

    await waitFor(() => {
      expect(save).toHaveBeenCalledExactlyOnceWith({ timezone: SAVED_TIMEZONE }, expect.anything())
    })
  })

  it("keeps the save button pending until the session shows the new time zone", async () => {
    const refreshed = Promise.withResolvers<ReturnType<typeof createAuthSessionFixture>>()
    sessionRequest.mockReturnValue(refreshed.promise)
    const { user } = renderCard()

    await user.click(saveButton())

    await waitFor(() => {
      expect(saveButton()).toHaveAttribute("aria-disabled", "true")
    })
    expect(toast.success).not.toHaveBeenCalled()
    await act(async () => {
      refreshed.resolve(createAuthSessionFixture())
      await refreshed.promise
    })
    await waitFor(() => {
      expect(saveButton()).not.toHaveAttribute("aria-disabled")
    })
    expect(toast.success).toHaveBeenCalledWith(labels.saved)
  })

  it("fills in the time zone this browser reports", async () => {
    reportBrowserTimezone(BROWSER_TIMEZONE)
    const { user } = renderCard()

    await user.click(screen.getByRole("button", { name: labels.timezone.detect }))

    await waitFor(() => {
      expect(timezoneField()).toHaveValue(timezonesMessages[BROWSER_TIMEZONE])
    })
    await user.click(saveButton())
    await waitFor(() => {
      expect(save).toHaveBeenCalledExactlyOnceWith({ timezone: BROWSER_TIMEZONE }, expect.anything())
    })
  })

  it("explains a browser time zone that is not in the list and keeps the saved one", async () => {
    reportBrowserTimezone(UNLISTED_BROWSER_TIMEZONE)
    const { user } = renderCard()

    await user.click(screen.getByRole("button", { name: labels.timezone.detect }))

    expect(toast.error).toHaveBeenCalledWith(labels.timezone.unsupported.replace("{timezone}", UNLISTED_BROWSER_TIMEZONE))
    expect(timezoneField()).toHaveValue(timezonesMessages[SAVED_TIMEZONE])
  })

  it("reports a failed save and keeps the choice", async () => {
    save.mockRejectedValue(new AppError(ERROR_CODES.UNAUTHORIZED))
    const { user } = renderCard()

    await user.click(saveButton())

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.UNAUTHORIZED)
    })
    expect(sessionRequest).not.toHaveBeenCalled()
    expect(timezoneField()).toHaveValue(timezonesMessages[SAVED_TIMEZONE])
  })

  it("renders a skeleton with the card's header, field and footer", () => {
    const { container } = renderWithRouter(<PreferencesCardPending />)

    expect(container.querySelector("[data-slot=card-header]")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=card-footer]")).toBeInTheDocument()
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
  })
})
