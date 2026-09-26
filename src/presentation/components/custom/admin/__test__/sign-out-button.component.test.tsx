import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { Menu } from "react-aria-components"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SignOutButton } from "~/src/presentation/components/custom/admin/sign-out-button"

import commonMessages from "~/messages/en-US/common.json"
import { ROUTES } from "~/src/routes"

const signOut = vi.hoisted(() => vi.fn<() => Promise<{ success: boolean }>>())
vi.mock("~/src/modules/account/use-cases/sign-out-user", () => ({ signOutUserMutation: { mutationFn: signOut } }))

const messages = getTestMessages("en-US")
const labels = commonMessages

beforeEach(() => {
  signOut.mockReset()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => vi.restoreAllMocks())

const renderSignOut = () => {
  const router = createTestRouter()
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
  const clearCache = vi.spyOn(router, "clearCache")
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <Menu aria-label="Account">
        <SignOutButton />
      </Menu>
    </IntlProvider>,
    { router },
  )
  result.queryClient.setQueryData(["private-data"], { secret: "cached" })
  return { ...result, clearCache, navigate }
}

describe("sign out", () => {
  it("disables repeat requests, clears private caches and replaces history with sign in", async () => {
    const pending = Promise.withResolvers<{ success: boolean }>()
    signOut.mockReturnValueOnce(pending.promise)
    const { clearCache, navigate, queryClient } = renderSignOut()
    fireEvent.click(screen.getByRole("menuitem", { name: labels.signOut }))
    const pendingItem = await screen.findByRole("menuitem", { name: labels.signingOut })
    expect(pendingItem).toHaveAttribute("aria-disabled", "true")
    fireEvent.click(pendingItem)
    expect(signOut).toHaveBeenCalledOnce()
    await act(async () => {
      pending.resolve({ success: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith({ replace: true, to: ROUTES.SIGN_IN })
    })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(clearCache).toHaveBeenCalledOnce()
    expect(toast.success).toHaveBeenCalledWith(labels.signedOut)
  })

  it("keeps the current page and cache intact when sign out fails", async () => {
    signOut.mockRejectedValueOnce(new Error("Connection lost"))
    const { clearCache, navigate, queryClient } = renderSignOut()
    fireEvent.click(screen.getByRole("menuitem", { name: labels.signOut }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })
    expect(screen.getByRole("menuitem", { name: labels.signOut })).not.toHaveAttribute("aria-disabled", "true")
    expect(navigate).not.toHaveBeenCalled()
    expect(clearCache).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(["private-data"])).toEqual({ secret: "cached" })
  })
})
