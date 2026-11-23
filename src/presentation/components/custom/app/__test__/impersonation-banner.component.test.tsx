import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import type * as AuthSession from "~/src/integrations/better-auth/auth.session"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import type { stopImpersonatingUserMutation } from "~/src/modules/user/use-cases/stop-impersonating-user"
import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

import { ImpersonationBanner } from "~/src/presentation/components/custom/app/impersonation-banner"

import labels from "~/messages/en-US/components.custom.impersonation-banner.json"
import errorsMessages from "~/messages/en-US/errors.json"
import * as ROUTES from "~/src/routes"

const stop = vi.hoisted(() => vi.fn<NonNullable<typeof stopImpersonatingUserMutation.mutationFn>>())
const removeUserData = vi.hoisted(() => vi.fn<typeof AuthSession.removeUserData>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => ({ ...(await importOriginal()), removeUserData }))
vi.mock(import("~/src/modules/user/use-cases/stop-impersonating-user"), () => ({
  stopImpersonatingUserMutation: { mutationFn: stop, mutationKey: USER_MUTATION_KEYS.STOP_IMPERSONATING },
}))

const messages = getTestMessages("en-US")
const CUSTOMER_ID = "01900000-0000-7000-8000-000000000005"
const ADMIN_ID = "01900000-0000-7000-8000-000000000001"

const impersonated = () => {
  const fixture = createAuthSessionFixture({ userId: CUSTOMER_ID })
  return { ...fixture, session: { ...fixture.session, impersonatedBy: ADMIN_ID } }
}

const renderBanner = (session: ReturnType<typeof createAuthSessionFixture> | null) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <ImpersonationBanner />
    </IntlProvider>,
    { queryClient, router: createTestRouter(ROUTES.APP) },
  )
  return { ...result, user: userEvent.setup({ delay: null }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("impersonation banner", () => {
  it.each([
    ["a signed-out visitor", JSON_NULL],
    ["a session the user signed in to themselves", createAuthSessionFixture({ userId: CUSTOMER_ID })],
  ])("stays hidden for %s", (_kind, session) => {
    renderBanner(session)

    expect(screen.queryByRole("region", { name: labels.label })).not.toBeInTheDocument()
  })

  it("names the impersonated user and returns the admin to that user's profile", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof stop>>>()
    stop.mockReturnValueOnce(pending.promise)
    const { queryClient, router, user } = renderBanner(impersonated())
    const banner = screen.getByRole("region", { name: labels.label })
    expect(banner).toHaveTextContent(labels.message.replace("{name}", "Test User").replace("{email}", "test@example.com"))
    const button = screen.getByRole("button", { name: labels.stop })
    await user.click(button)
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true")
    })

    await act(async () => {
      pending.resolve({ session: createAuthSessionFixture().session, user: createAuthSessionFixture().user })
      await pending.promise
    })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`${ROUTES.ADMIN_USERS}/${CUSTOMER_ID}`)
    })
    expect(removeUserData).toHaveBeenCalledExactlyOnceWith(queryClient)
    expect(toast.success).toHaveBeenCalledWith(labels.stopped.replace("{name}", "Test User"))
  })

  it.each([
    ["a failure", new Error("Denied"), errorsMessages.codes.INTERNAL_ERROR],
    ["a missing permission", new AppError(ERROR_CODES.UNAUTHORIZED), errorsMessages.codes.UNAUTHORIZED],
  ])("reports %s and keeps the impersonation going", async (_kind, error, message) => {
    stop.mockRejectedValueOnce(error)
    const { router, user } = renderBanner(impersonated())
    await user.click(screen.getByRole("button", { name: labels.stop }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
    expect(removeUserData).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe(ROUTES.APP)
    expect(screen.getByRole("region", { name: labels.label })).toBeVisible()
  })
})
