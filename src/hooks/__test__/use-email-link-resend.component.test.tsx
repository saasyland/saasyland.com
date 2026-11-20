import type { ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { RESEND_COOLDOWN_SECONDS, VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import { useEmailLinkResend } from "~/src/hooks/use-email-link-resend"

const INPUT = { email: "ada@example.com" }

interface Sent {
  readonly sent: true
}

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      {children}
    </IntlProvider>
  </QueryClientProvider>
)

describe("useEmailLinkResend", () => {
  it("ignores another send while one is under way and during the cooldown that follows it", async () => {
    const request = Promise.withResolvers<Sent>()
    const mutationFn = vi.fn<(input: typeof INPUT) => Promise<Sent>>().mockReturnValue(request.promise)
    const { result } = renderHook(() => useEmailLinkResend({ mutationFn, mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL }), { wrapper })

    act(() => {
      result.current.send(INPUT)
    })
    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })
    act(() => {
      result.current.send(INPUT)
    })

    await act(async () => {
      request.resolve({ sent: true })
      await request.promise
    })
    await waitFor(() => {
      expect(result.current.outcome).toStrictEqual({ email: INPUT.email, sent: true })
    })
    expect(result.current.cooldownSeconds).toBe(RESEND_COOLDOWN_SECONDS)
    act(() => {
      result.current.send(INPUT)
    })

    expect(mutationFn).toHaveBeenCalledOnce()
  })
})
