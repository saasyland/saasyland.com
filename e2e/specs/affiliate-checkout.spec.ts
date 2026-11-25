import { AFFONSO } from "../../src/integrations/affonso/affonso.constants"
import * as ROUTES from "../../src/routes"
import { expect, test } from "../fixtures/auth"
import { startedCheckouts } from "../fixtures/license"
import { checkoutOverlay } from "../fixtures/polar-checkout"
import { signUpAndVerify } from "../fixtures/sign-up"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const REFERRAL_ID = "e2e-referral"

test("a buyer whose visit through an affiliate link left Affonso's referral cookie carries the referral into the Polar checkout's metadata", async ({
  appPage,
  authPage,
  baseURL,
  context,
  page,
  request,
}) => {
  const { userId } = await signUpAndVerify({ authPage, page, request })
  await context.addCookies([{ name: AFFONSO.REFERRAL_COOKIE, url: baseURL ?? "", value: REFERRAL_ID }])

  await page.goto(ROUTES.APP_LICENSE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("button", { exact: true, name: "Get Core" }).click()
  await expect(checkoutOverlay(page)).toBeAttached()

  const [checkout] = await startedCheckouts(request, userId)
  expect(checkout?.metadata).toMatchObject({ [AFFONSO.METADATA_KEY]: REFERRAL_ID })
})
