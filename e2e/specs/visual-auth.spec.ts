import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { APP_MATRIX, visualName } from "../data/visual"
import { expect, test } from "../fixtures/auth"
import { expectRegion, expectScreen, openForScreenshots } from "../fixtures/visual"

const [admin, customer] = TEST_ACCOUNTS

const SIGN_IN_PAGE = /\/auth\/sign-in/u

const ADMIN_SCREENS = [
  { name: "admin-dashboard", path: ROUTES.ADMIN.INDEX },
  { name: "admin-settings", path: ROUTES.ADMIN.SETTINGS },
] as const

for (const target of APP_MATRIX) {
  const { locale, viewport } = target

  test(`the header of a signed-in visitor in ${locale} at ${String(viewport.width)}px matches its approved screenshot`, async ({
    authPage,
    page,
  }) => {
    await authPage.signIn(customer.email)
    await expect(page).not.toHaveURL(SIGN_IN_PAGE)
    await openForScreenshots(page, { locale, path: ROUTES.HOME, viewport })

    await expectRegion(page, page.getByRole("banner"), visualName("header-signed-in", target))
  })

  test(`the admin dashboard and settings in ${locale} at ${String(viewport.width)}px match their approved screenshots`, async ({
    authPage,
    page,
  }) => {
    await authPage.signIn(admin.email)
    await expect(page).not.toHaveURL(SIGN_IN_PAGE)

    for (const { name, path } of ADMIN_SCREENS) {
      await openForScreenshots(page, { locale, path, viewport })
      await expectScreen(page, visualName(name, target))
    }
  })
}
