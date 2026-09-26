import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { SettingsPasswordForm } from "~/src/presentation/components/custom/admin/settings/password-form"

import authValidationsMessages from "~/messages/en-US/auth.validations.json"
import pagesAdminSettingsMessages from "~/messages/en-US/pages.admin.settings.json"

const changePassword = vi.hoisted(() => vi.fn<(data: { currentPassword: string; newPassword: string }) => Promise<object>>())
vi.mock("~/src/modules/account/use-cases/change-password", () => ({ changePasswordMutation: { mutationFn: changePassword } }))

const messages = getTestMessages("en-US")
const labels = pagesAdminSettingsMessages.security.password

beforeEach(() => {
  changePassword.mockReset()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

const renderPasswordForm = () => {
  const result = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages}>
      <SettingsPasswordForm />
    </IntlProvider>,
  )
  result.queryClient.setQueryData(SESSION_QUERY_KEYS.ALL, [])
  return result
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
  it("waits for the change, invalidates sessions and clears passwords", async () => {
    const pending = Promise.withResolvers<object>()
    changePassword.mockReturnValueOnce(pending.promise)
    const { queryClient } = renderPasswordForm()
    fillPasswords()
    const button = screen.getByRole("button", { name: labels.update })
    fireEvent.click(button)
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true")
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
  })

  it("keeps password values available to retry when the request fails", async () => {
    changePassword.mockRejectedValueOnce(new Error("Network unavailable"))
    const { queryClient } = renderPasswordForm()
    fillPasswords()
    fireEvent.click(screen.getByRole("button", { name: labels.update }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(screen.getByLabelText(labels.new)).toHaveValue("NewPassword1!")
    expect(screen.getByRole("button", { name: labels.update })).toBeEnabled()
    expect(queryClient.getQueryState(SESSION_QUERY_KEYS.ALL)?.isInvalidated).toBe(false)
  })

  it("rejects mismatched confirmation before calling the server", async () => {
    renderPasswordForm()
    fillPasswords("DifferentPassword1!")
    fireEvent.click(screen.getByRole("button", { name: labels.update }))
    await waitFor(() => {
      expect(screen.getByText(authValidationsMessages.passwordsMustMatch)).toBeInTheDocument()
    })
    expect(changePassword).not.toHaveBeenCalled()
  })
})
