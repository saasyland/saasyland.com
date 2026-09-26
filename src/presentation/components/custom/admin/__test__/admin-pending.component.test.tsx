import type { ReactElement } from "react"

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import {
  AdminPaymentsPending,
  AdminSettingsPending,
  AdminUsersAllPending,
  AdminUsersInvitationsPending,
  AdminUsersPending,
  AdminUsersRolesPending,
  AdminUsersSecurityPending,
} from "~/src/presentation/components/custom/admin/administration-pending"
import {
  AdminBlogCreatePending,
  AdminBlogPending,
  AdminLandingPagePending,
} from "~/src/presentation/components/custom/admin/content-pending"
import {
  AdminCourseCreatePending,
  AdminPricingModelsPending,
  AdminProductCreatePending,
  AdminProductsPending,
} from "~/src/presentation/components/custom/admin/offerings-pending"
import { AdminAnalyticsPending, AdminDashboardPending } from "~/src/presentation/components/custom/admin/overview-pending"

const markupOf = (ui: ReactElement) => {
  const { container, unmount } = render(ui)
  const markup = container.innerHTML
  unmount()
  return markup
}

const busyMarkup = (container: HTMLElement) => container.querySelector('[aria-busy="true"]')?.outerHTML

const breadcrumbDividers = (container: HTMLElement) =>
  [...container.querySelectorAll("span[aria-hidden]")].filter((span) => span.textContent === "/")

afterEach(cleanup)

describe("admin skeletons", () => {
  it.each([
    ["/admin", AdminPending, AdminDashboardPending],
    ["/admin/analytics", AdminPending, AdminAnalyticsPending],
    ["/admin/products", AdminPending, AdminProductsPending],
    ["/admin/products/create", AdminPending, AdminProductCreatePending],
    ["/admin/courses/create", AdminPending, AdminCourseCreatePending],
    ["/admin/pricing-models", AdminPending, AdminPricingModelsPending],
    ["/admin/blog", AdminPending, AdminBlogPending],
    ["/admin/blog/create", AdminPending, AdminBlogCreatePending],
    ["/admin/landing-page", AdminPending, AdminLandingPagePending],
    ["/admin/payments", AdminPending, AdminPaymentsPending],
    ["/de-DE/admin/settings", AdminPending, AdminSettingsPending],
    ["/admin/users", AdminPending, AdminUsersAllPending],
    ["/pl-PL/admin/users/all", AdminPending, AdminUsersAllPending],
    ["/admin/users/invitations", AdminPending, AdminUsersInvitationsPending],
    ["/admin/users/roles", AdminPending, AdminUsersRolesPending],
    ["/admin/users/security", AdminPending, AdminUsersSecurityPending],
    ["/admin/users/all", AdminUsersPending, AdminUsersAllPending],
    ["/ja-JP/admin/users/invitations", AdminUsersPending, AdminUsersInvitationsPending],
    ["/admin/users/roles", AdminUsersPending, AdminUsersRolesPending],
    ["/admin/users/security", AdminUsersPending, AdminUsersSecurityPending],
  ])("renders the skeleton of the page at %s", (path, Layout, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<Layout />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it.each([
    ["/admin/unknown", AdminPending],
    ["/admin/users/unknown", AdminUsersPending],
  ])("renders only the layout chrome at %s", (path, Layout) => {
    const { container } = renderWithRouter(<Layout />, { router: createTestRouter(path) })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/admin", 1],
    ["/admin/analytics", 1],
    ["/admin/products/create", 2],
    ["/pl-PL/admin/users/roles", 2],
    ["/admin/courses/create", 0],
  ])("draws the breadcrumb trail of %s", (path, dividers) => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path) })

    expect(breadcrumbDividers(container)).toHaveLength(dividers)
  })
})
