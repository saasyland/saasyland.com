import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { SettingsPasswordFormClient } from "~/src/presentation/components/custom/admin/settings/components/settings-password-form-client"

const changePassword = vi.hoisted(() => vi.fn<(data: { currentPassword: string; newPassword: string }) => Promise<object>>())
vi.mock("~/src/modules/account/use-cases/change-password", () => ({ settingsChangePasswordMutation: { mutationFn: changePassword } }))

const messages = getTestMessages("en-US")
const labels = messages.pages.admin.settings.security.password

beforeEach(() => {
  changePassword.mockReset()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

const renderPasswordForm = () => {
  const router = createTestRouter()
  const invalidate = vi.spyOn(router, "invalidate").mockResolvedValue()
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <SettingsPasswordFormClient />
    </IntlProvider>,
    { router },
  )
  result.queryClient.setQueryData(SESSION_QUERY_KEYS.ALL, [])
  return { ...result, invalidate }
}

const fillPasswords = (confirmNewPassword = "NewPassword1!") => {
  for (const [label, value] of [
    [labels.confirm, confirmNewPassword],
    [labels.current, "OldPassword1!"],
    [labels.new, "NewPassword1!"],
  ] as const) {
    const field = screen.getByLabelText(label)
    fireEvent.change(field, { target: { value } })
    fireEvent.blur(field)
  }
}

describe("settings password change", () => {
  it("waits for the change, invalidates sessions, clears passwords and refreshes the router", async () => {
    const pending = Promise.withResolvers<object>()
    changePassword.mockReturnValueOnce(pending.promise)
    const { queryClient, invalidate } = renderPasswordForm()
    fillPasswords()
    const button = screen.getByRole("button", { name: labels.update })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: "OldPassword1!", newPassword: "NewPassword1!" }, expect.anything())
    await act(async () => {
      pending.resolve({})
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.feedback.updateSuccess)
    })
    expect(queryClient.getQueryState(SESSION_QUERY_KEYS.ALL)?.isInvalidated).toBe(true)
    expect(screen.getByLabelText(labels.current)).toHaveValue("")
    expect(screen.getByLabelText(labels.new)).toHaveValue("")
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it("keeps password values available to retry when the request fails", async () => {
    changePassword.mockRejectedValueOnce(new Error("Network unavailable"))
    const { invalidate } = renderPasswordForm()
    fillPasswords()
    fireEvent.click(screen.getByRole("button", { name: labels.update }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(screen.getByLabelText(labels.new)).toHaveValue("NewPassword1!")
    expect(screen.getByRole("button", { name: labels.update })).toBeEnabled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("rejects mismatched confirmation before calling the server", async () => {
    renderPasswordForm()
    fillPasswords("DifferentPassword1!")
    fireEvent.click(screen.getByRole("button", { name: labels.update }))
    await waitFor(() => {
      expect(screen.getByText(messages.auth.validations.passwordsMustMatch)).toBeInTheDocument()
    })
    expect(changePassword).not.toHaveBeenCalled()
  })
})
