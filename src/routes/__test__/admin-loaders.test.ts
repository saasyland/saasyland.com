import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { auth } from "~/src/integrations/better-auth/auth.server"

import { TIME_BUCKET } from "~/src/modules/_core/utils/time-series"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { businessProfileQuery } from "~/src/modules/business-profile/use-cases/get-business-profile"
import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"
import { revenueQuery } from "~/src/modules/order/use-cases/get-revenue"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"

beforeEach(() => {
  vi.spyOn(auth.api, "listUserAccounts").mockResolvedValue([])
})

afterEach(() => vi.restoreAllMocks())

describe("admin route loaders", () => {
  it.each(["/admin", "/admin/settings"])("loads localized metadata for an authorized administrator at %s", async (path) => {
    expectLocalizedAdminPage(await loadAsAdmin(path))
  })

  it("starts every query /admin reads, and fills the streamed statistics and panels once they arrive", async () => {
    vi.spyOn(getUsersQuery, "queryFn")
    vi.spyOn(courseProgressQuery, "queryFn")
    vi.spyOn(newsletterSubscribersQuery, "queryFn")
    const router = await loadAsAdmin("/admin")
    const cached = router.options.context.queryClient
    await vi.waitFor(() => {
      expect(cached.isFetching()).toBe(0)
    })
    expectPrefetched(router, getUsersQuery, { ...EMPTY_PAGE, pendingVerification: 0 })
    expectPrefetched(router, courseProgressQuery, { learners: 0, rows: [] })
    expectPrefetched(router, newsletterSubscribersQuery, { total: 0 })
    expect(cached.getQueryData(revenueQuery().queryKey)).toStrictEqual({ bucket: TIME_BUCKET.DAY, currencies: [] })
    expect(cached.getQueryData(userSignupsQuery().queryKey)).toMatchObject({ bucket: TIME_BUCKET.DAY, total: 0 })
  })

  it("populates required query data before rendering /admin/settings", async () => {
    vi.spyOn(getActiveSessionsQuery, "queryFn")
    vi.spyOn(listAccountsQuery, "queryFn")
    vi.spyOn(businessProfileQuery, "queryFn")
    const router = await loadAsAdmin("/admin/settings")
    expectPrefetched(router, getActiveSessionsQuery, [])
    expectPrefetched(router, listAccountsQuery, [])
    expectPrefetched(router, businessProfileQuery, { address: "", logo: null, name: APP_NAME, supportEmail: CONTACT_EMAIL })
  })
})
