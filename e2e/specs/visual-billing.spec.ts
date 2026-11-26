import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { APP_MATRIX, visualName } from "../data/visual"
import { expect, test } from "../fixtures/auth"
import { expectScreen, openForScreenshots } from "../fixtures/visual"

const [, customer] = TEST_ACCOUNTS

for (const target of APP_MATRIX) {
  const { locale, viewport } = target

  test(`the billing page of a customer in ${locale} at ${String(viewport.width)}px matches its approved screenshot`, async ({
    authPage,
    page,
  }) => {
    await authPage.signIn(customer.email)
    await expect(page).not.toHaveURL(/\/auth\/sign-in/u)
    await openForScreenshots(page, { locale, path: ROUTES.APP.BILLING, viewport })

    await expectScreen(page, visualName("billing", target))
  })
}
