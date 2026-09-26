import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vite-plus/test"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { UserWidget } from "~/src/presentation/components/custom/admin/user-widget"

import commonMessages from "~/messages/en-US/common.json"
import pagesAdminMessages from "~/messages/en-US/pages.admin.json"

vi.mock(import("~/src/hooks/use-mobile"), () => ({
  useIsMobile: () => false,
}))

describe("user widget", () => {
  it("opens the account menu with settings and sign out only", async () => {
    expect.hasAssertions()

    renderAdmin(
      <SidebarProvider>
        <UserWidget />
      </SidebarProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: /Test User/u }))

    const items = await screen.findAllByRole("menuitem")

    expect(items.map((item) => item.textContent)).toStrictEqual([pagesAdminMessages.components.userWidget.settings, commonMessages.signOut])
    expect(screen.getAllByText("Test User")).toHaveLength(1)
  })
})
