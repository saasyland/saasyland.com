import type { Route } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const TERMS_CHUNK = /\/assets\/_site\._marketing\.terms-[\w-]+\.js$/u

test(`${ROUTES.TERMS} renders its heading before JavaScript runs`, async ({ pageWithoutJavaScript }) => {
  await pageWithoutJavaScript.goto(ROUTES.TERMS)
  await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toBeVisible()
})

test("lets a visitor leave while its route code loads", async ({ appPage, page }) => {
  const chunk = Promise.withResolvers<Route>()
  await page.route(TERMS_CHUNK, (route) => {
    chunk.resolve(route)
  })
  await page.goto(ROUTES.TERMS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

  await appPage.leaveWhileLoading(await chunk.promise, ROUTES.PRIVACY)

  await expect(page).toHaveURL(ROUTES.PRIVACY)
  await appPage.waitForAppReady()
})

for (const path of [ROUTES.TERMS, ROUTES.PRIVACY]) {
  test(`${path} renders its legal document`, async ({ appPage, page }) => {
    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
}

for (const [name, path] of [
  ["Terms of Service", ROUTES.TERMS],
  ["Privacy Policy", ROUTES.PRIVACY],
] as const) {
  test(`the sign-up consent links ${path}`, async ({ appPage, page }) => {
    await page.goto(ROUTES.AUTH.SIGN_UP, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await page.getByRole("link", { exact: true, name }).click()

    await expect(page).toHaveURL(path)
    await expect(page.getByRole("heading", { exact: true, level: 1, name })).toBeVisible()
  })
}
