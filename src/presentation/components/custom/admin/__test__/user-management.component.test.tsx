import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthUserMutationResult } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"

import type { banUserMutation } from "~/src/modules/user/use-cases/ban-user"
import type { deleteUserMutation } from "~/src/modules/user/use-cases/delete-user"
import { getUsersPageQuery, getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import type { setUserPasswordMutation } from "~/src/modules/user/use-cases/set-user-password"
import type { unbanUserMutation } from "~/src/modules/user/use-cases/unban-user"
import { USER_MUTATION_KEYS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { Route as UsersRoute } from "~/src/routes/admin.users.all"

import { adminQueryClient, adminUser, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import pagesAdminUsersMessages from "~/messages/en-US/pages.admin.users.json"

const ban = vi.hoisted(() => vi.fn<NonNullable<typeof banUserMutation.mutationFn>>())
const unban = vi.hoisted(() => vi.fn<NonNullable<typeof unbanUserMutation.mutationFn>>())
const remove = vi.hoisted(() => vi.fn<NonNullable<typeof deleteUserMutation.mutationFn>>())
const resetPassword = vi.hoisted(() => vi.fn<NonNullable<typeof setUserPasswordMutation.mutationFn>>())

vi.mock(import("~/src/modules/user/use-cases/ban-user"), () => ({
  banUserMutation: { mutationFn: ban, mutationKey: USER_MUTATION_KEYS.BAN },
}))
vi.mock(import("~/src/modules/user/use-cases/unban-user"), () => ({
  unbanUserMutation: { mutationFn: unban, mutationKey: USER_MUTATION_KEYS.UNBAN },
}))
vi.mock(import("~/src/modules/user/use-cases/delete-user"), () => ({
  deleteUserMutation: { mutationFn: remove, mutationKey: USER_MUTATION_KEYS.DELETE },
}))
vi.mock(import("~/src/modules/user/use-cases/set-user-password"), () => ({
  setUserPasswordMutation: { mutationFn: resetPassword, mutationKey: USER_MUTATION_KEYS.SET_PASSWORD },
}))

const labels = pagesAdminUsersMessages

const renderUser = (banned = false, users = [adminUser({ banned })]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: users, total: users.length })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const Page = UsersRoute.options.component
  if (!Page) {
    throw new Error("Missing users page")
  }
  return { ...renderAdmin(<Page />, { queryClient }), invalidateQueries, user: userEvent.setup() }
}

const chooseAction = async (user: ReturnType<typeof userEvent.setup>, action: string) => {
  await user.click(screen.getByRole("button", { name: labels.actions.row.menu }))
  await user.click(screen.getByRole("menuitem", { name: action }))
}

beforeEach(() => {
  vi.clearAllMocks()
  ban.mockResolvedValue(createAuthUserMutationResult())
  unban.mockResolvedValue(createAuthUserMutationResult())
  remove.mockResolvedValue({ success: true })
  resetPassword.mockResolvedValue({ status: true })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("admin user management", () => {
  it("renders user details and supports individual and page selection", async () => {
    renderUser(false, [
      adminUser(),
      adminUser({ emailVerified: false, id: "pending", image: "https://example.com/grace.jpg", name: "Grace", twoFactorEnabled: true }),
      adminUser({ banned: true, id: "banned", image: "https://example.com/linus.jpg", name: "Linus" }),
      adminUser({ banned: true, id: "nameless", name: "" }),
    ])
    expect(screen.getAllByText("ada@example.com")[0]).toBeVisible()
    expect(screen.getByRole("img", { name: "Grace" })).toHaveAttribute("src", "https://example.com/grace.jpg")
    const [first] = screen.getAllByRole("checkbox", { name: labels.table.selectRow })
    if (!first) {
      throw new Error("Missing row checkbox")
    }
    await userEvent.click(first)
    expect(first).toBeChecked()
    const all = screen.getByRole("checkbox", { name: labels.table.selectAll })
    expect(all).toBePartiallyChecked()
    await userEvent.click(all)
    expect(
      screen
        .getAllByRole("checkbox", { name: labels.table.selectRow })
        .every(
          (checkbox) => checkbox.getAttribute("aria-checked") === "true" || (checkbox instanceof HTMLInputElement && checkbox.checked),
        ),
    ).toBe(true)
  })

  it.each([false, true])("updates a user's banned state (initially banned: %s)", async (banned) => {
    const { user, invalidateQueries } = renderUser(banned)
    await chooseAction(user, banned ? labels.actions.row.unban : labels.actions.row.ban)
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(banned ? labels.actions.feedback.unbanSuccess : labels.actions.feedback.banSuccess)
    })
    expect(banned ? unban : ban).toHaveBeenCalledWith({ userId: "ada" }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
  })

  it("reports a failed ban without reporting success", async () => {
    ban.mockRejectedValueOnce(new Error("Denied"))
    const { user, invalidateQueries } = renderUser()
    await chooseAction(user, labels.actions.row.ban)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it("requires confirmation to delete and disables confirmation while saving", async () => {
    const pending = Promise.withResolvers<{ success: boolean }>()
    remove.mockReturnValueOnce(pending.promise)
    const { user, invalidateQueries } = renderUser()
    await chooseAction(user, labels.actions.row.delete)
    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toHaveTextContent("Ada Lovelace")
    expect(remove).not.toHaveBeenCalled()
    const confirmation = within(dialog).getByRole("button", { name: labels.actions.deleteDialog.confirm })
    await user.click(confirmation)
    await waitFor(() => {
      expect(confirmation).toBeDisabled()
    })
    await act(async () => {
      pending.resolve({ success: true })
      await pending.promise
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.deleteSuccess)
    })
    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("reports deletion errors and preserves the user", async () => {
    remove.mockRejectedValueOnce(new Error("Denied"))
    const { user } = renderUser()
    await chooseAction(user, labels.actions.row.delete)
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: labels.actions.deleteDialog.confirm }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce()
    })
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
  })

  it("cancels a password reset without sending a request", async () => {
    const { user } = renderUser()
    await chooseAction(user, labels.actions.row.resetPassword)
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: labels.actions.resetPasswordDialog.cancel }))
    expect(resetPassword).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it.each([false, true])("submits a validated password reset and reports the outcome (error: %s)", async (fails) => {
    const pending = Promise.withResolvers<{ status: boolean }>()
    resetPassword.mockReturnValueOnce(pending.promise)
    const { user, invalidateQueries } = renderUser()
    await chooseAction(user, labels.actions.row.resetPassword)
    const dialog = screen.getByRole("dialog")
    const input = within(dialog).getByLabelText(labels.actions.resetPasswordDialog.password)
    await user.type(input, "Stronger1!")
    fireEvent.blur(input)
    const submit = within(dialog).getByRole("button", { name: labels.actions.resetPasswordDialog.confirm })
    await user.click(submit)
    await waitFor(() => {
      expect(submit).toHaveAttribute("aria-disabled", "true")
    })
    expect(resetPassword).toHaveBeenCalledWith({ newPassword: "Stronger1!", userId: "ada" }, expect.anything())
    await act(async () => {
      if (fails) {
        pending.reject(new Error("Denied"))
      } else {
        pending.resolve({ status: true })
      }
      await pending.promise.catch(() => {})
    })
    if (fails) {
      expect(toast.error).toHaveBeenCalledOnce()
      expect(invalidateQueries).not.toHaveBeenCalled()
    } else {
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(labels.actions.feedback.resetPasswordSuccess)
      })
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: USER_QUERY_KEYS.ALL })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    }
  })
})

describe("server user pagination", () => {
  it("requests another server page and resets to page one when sorting changes", async () => {
    const queryClient = adminQueryClient()
    const firstPage = Array.from({ length: 10 }, (_, index) => adminUser({ id: `first-${index}`, name: `Member ${index}` }))
    queryClient.setQueryData(getUsersQuery.queryKey, { pendingVerification: 0, rows: firstPage, total: 11 })
    queryClient.setQueryData(getUsersPageQuery({ pageIndex: 1 }).queryKey, {
      pendingVerification: 0,
      rows: [adminUser({ name: "Last member" })],
      total: 11,
    })
    for (const desc of [false, true]) {
      queryClient.setQueryData(getUsersPageQuery({ sorting: [{ desc, id: "user" }] }).queryKey, {
        pendingVerification: 0,
        rows: [adminUser({ name: "Sorted member" })],
        total: 11,
      })
    }
    const Page = UsersRoute.options.component
    if (!Page) {
      throw new Error("Missing users page")
    }
    renderAdmin(<Page />, { queryClient })
    await userEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(await screen.findByText("Last member")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /^User/u }))
    expect(await screen.findByText("Sorted member")).toBeVisible()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
  })
})
