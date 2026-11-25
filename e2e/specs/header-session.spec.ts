import type { Locator, Page } from "@playwright/test"

import navigationMessages from "../../messages/en-US/components.custom.navigation.json" with { type: "json" }
import authNavigation from "../../messages/en-US/navigation.auth.json" with { type: "json" }
import polishNavigationMessages from "../../messages/pl-PL/components.custom.navigation.json" with { type: "json" }
import polishAuthNavigation from "../../messages/pl-PL/navigation.auth.json" with { type: "json" }
import signInPage from "../../messages/en-US/pages.auth.sign-in.json" with { type: "json" }
import { LOCAL_SERVER_ORIGIN } from "../../src/data/local-server"
import { LAST_LOGIN_METHOD_COOKIE } from "../../src/integrations/better-auth/auth.constants"
import { SESSION_ATTRIBUTE, SESSION_COOKIE_NAMES } from "../../src/modules/session/session.rewrite"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import { APP_NAVIGATION_WAIT_UNTIL, type BasePage, turnOnDataSaver } from "../pages/base-page"

const [admin, customer] = TEST_ACCOUNTS
const [SESSION_COOKIE] = SESSION_COOKIE_NAMES
const SERVER_FUNCTION_PATH = "/_serverFn/"
const DESKTOP_VIEWPORT = { height: 900, width: 1440 }
const PIXEL_DIGITS = 1
const POLISH_HOME = "/pl-PL"

const LOCALES = [
  { home: ROUTES.HOME, labels: authNavigation.header, navigation: navigationMessages.ariaLabel },
  { home: POLISH_HOME, labels: polishAuthNavigation.header, navigation: polishNavigationMessages.ariaLabel },
] as const

const signInThroughTheApi = async (page: Page, email: string, baseURL: string | undefined): Promise<void> => {
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email, password: TEST_PASSWORD },
    headers: { "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::`, Origin: baseURL ?? LOCAL_SERVER_ORIGIN },
  })
  expect(signedIn.ok()).toBe(true)
}

const signOutThroughTheApi = async (page: Page, baseURL: string | undefined): Promise<void> => {
  const signedOut = await page.request.post("/api/auth/sign-out", { data: {}, headers: { Origin: baseURL ?? LOCAL_SERVER_ORIGIN } })
  expect(signedOut.ok()).toBe(true)
}

const keepCookieOfEndedSession = async (page: Page, baseURL: string | undefined): Promise<void> => {
  await signInThroughTheApi(page, customer.email, baseURL)
  const cookies = await page.context().cookies()
  await signOutThroughTheApi(page, baseURL)
  await page.context().addCookies(cookies.filter(({ name }) => name === SESSION_COOKIE))
}

const headerOf = (page: Page, name: string = navigationMessages.ariaLabel): Locator => page.getByRole("navigation", { name })

const linkBoxes = async (page: Page, name?: string): Promise<{ readonly width: number; readonly x: number }[]> =>
  headerOf(page, name)
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => ({ width: link.getBoundingClientRect().width, x: link.getBoundingClientRect().x })))

const rounded = (boxes: readonly { width: number; x: number }[]): string[] =>
  boxes.map(({ width, x }) => `${x.toFixed(PIXEL_DIGITS)} ${width.toFixed(PIXEL_DIGITS)}`)

const expectSameBoxes = (actual: readonly { width: number; x: number }[], expected: readonly { width: number; x: number }[]): void => {
  expect(rounded(actual)).toStrictEqual(rounded(expected))
}

const labelInsets = async (page: Page, name?: string): Promise<string[]> =>
  headerOf(page, name)
    .getByRole("link")
    .evaluateAll(
      (links, digits) =>
        links.map((link) => {
          const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT)
          const label = document.createRange()
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (text.parentElement?.checkVisibility()) {
              label.selectNodeContents(text)
              break
            }
          }
          return (link.getBoundingClientRect().width - label.getBoundingClientRect().width).toFixed(digits)
        }),
      PIXEL_DIGITS,
    )

const expectTextLinksSpacedAlike = async (page: Page, name?: string): Promise<void> => {
  const textLinks = (await labelInsets(page, name)).slice(1, -1)
  expect(textLinks).toStrictEqual(textLinks.map(() => textLinks[0]))
}

const serverFunctionRequests = (page: Page): string[] => {
  const requests: string[] = []
  page.on("request", (request) => {
    if (request.url().includes(SERVER_FUNCTION_PATH)) requests.push(request.url())
  })
  return requests
}

const openQuietly = async (page: Page, appPage: BasePage, path: string): Promise<void> => {
  await page.addInitScript(turnOnDataSaver)
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.waitForLoadState("networkidle")
}

test.describe("the header's account link", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
  })

  test("says Your account before any script runs for a signed-in visitor, and Sign in for everyone else", async ({
    baseURL,
    pageWithoutJavaScript,
  }) => {
    await pageWithoutJavaScript.setViewportSize(DESKTOP_VIEWPORT)
    for (const path of [ROUTES.HOME, ROUTES.COURSES]) {
      await pageWithoutJavaScript.goto(path)
      await expect(headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.signIn })).toBeVisible()
      await expect(headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.account })).toHaveCount(0)
    }

    await signInThroughTheApi(pageWithoutJavaScript, customer.email, baseURL)

    for (const path of [ROUTES.HOME, ROUTES.COURSES]) {
      const response = await pageWithoutJavaScript.goto(path)
      expect(response?.headers()["cache-control"]).toBe("private, no-cache")
      expect(response?.headers()["vary"]).toContain("Cookie")
      await expect(pageWithoutJavaScript.locator("html")).toHaveAttribute(SESSION_ATTRIBUTE, "")
      await expect(headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.account })).toBeVisible()
      await expect(headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.signIn })).toHaveCount(0)
      await expect(
        pageWithoutJavaScript.getByRole("contentinfo").getByRole("link", { exact: true, name: authNavigation.footer.account }),
      ).toBeVisible()
    }
  })

  for (const locale of LOCALES) {
    test(`keeps every header link in place at ${locale.home} while the page loads, signed out and signed in, and spaces the account link like the others`, async ({
      appPage,
      baseURL,
      page,
      pageWithoutJavaScript,
    }) => {
      await pageWithoutJavaScript.setViewportSize(DESKTOP_VIEWPORT)
      await pageWithoutJavaScript.goto(locale.home)
      const signedOut = await linkBoxes(pageWithoutJavaScript, locale.navigation)
      await expectTextLinksSpacedAlike(pageWithoutJavaScript, locale.navigation)
      await signInThroughTheApi(pageWithoutJavaScript, customer.email, baseURL)
      await pageWithoutJavaScript.goto(locale.home)
      await expect(headerOf(pageWithoutJavaScript, locale.navigation).getByRole("link", { exact: true, name: locale.labels.account })).toBeVisible()
      const firstPaint = await linkBoxes(pageWithoutJavaScript, locale.navigation)
      await expectTextLinksSpacedAlike(pageWithoutJavaScript, locale.navigation)

      await openQuietly(page, appPage, locale.home)
      expectSameBoxes(await linkBoxes(page, locale.navigation), signedOut)
      await signInThroughTheApi(page, customer.email, baseURL)
      await page.goto(locale.home, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      const account = headerOf(page, locale.navigation).getByRole("link", { exact: true, name: locale.labels.account })
      await expect(account).toHaveAttribute("href", new RegExp(`${ROUTES.APP.INDEX}$`, "u"))

      expectSameBoxes(await linkBoxes(page, locale.navigation), firstPaint)
    })
  }

  test("asks for no session after sign-out, though the browser keeps the last sign-in method, and asks once while signed in", async ({
    appPage,
    baseURL,
    page,
  }) => {
    await signInThroughTheApi(page, customer.email, baseURL)
    const requests = serverFunctionRequests(page)
    await openQuietly(page, appPage, ROUTES.HOME)
    expect(requests).toHaveLength(1)

    await signOutThroughTheApi(page, baseURL)
    expect((await page.context().cookies()).map(({ name }) => name)).toContain(LAST_LOGIN_METHOD_COOKIE)
    requests.length = 0
    for (const path of [ROUTES.HOME, ROUTES.DOCS.INDEX, ROUTES.BLOG.INDEX]) {
      await openQuietly(page, appPage, path)
      await expect(headerOf(page).getByRole("link", { exact: true, name: authNavigation.header.signIn })).toBeVisible()
    }
    expect(requests).toStrictEqual([])
  })

  test("turns Your account back to Sign in once the check finds that the session behind the cookie has ended, laid out as for any signed-out visitor, and asks no more after", async ({
    appPage,
    baseURL,
    page,
    pageWithoutJavaScript,
  }) => {
    await pageWithoutJavaScript.setViewportSize(DESKTOP_VIEWPORT)
    await pageWithoutJavaScript.goto(ROUTES.HOME)
    const signedOut = await linkBoxes(pageWithoutJavaScript)
    await keepCookieOfEndedSession(page, baseURL)
    const requests = serverFunctionRequests(page)

    await openQuietly(page, appPage, ROUTES.HOME)

    await expect(page.locator("html")).not.toHaveAttribute(SESSION_ATTRIBUTE)
    await expect(headerOf(page).getByRole("link", { exact: true, name: authNavigation.header.signIn })).toHaveAttribute("href", ROUTES.AUTH.SIGN_IN)
    expectSameBoxes(await linkBoxes(page), signedOut)
    await expectTextLinksSpacedAlike(page)
    expect(requests).toHaveLength(1)
    expect((await page.context().cookies()).map(({ name }) => name)).not.toContain(SESSION_COOKIE)

    await openQuietly(page, appPage, ROUTES.DOCS.INDEX)
    expect(requests).toHaveLength(1)
  })

  test("leads a visitor whose session has ended from Your account, pressed before any script runs, to the sign-in form, which clears the cookie", async ({
    baseURL,
    pageWithoutJavaScript,
  }) => {
    await pageWithoutJavaScript.setViewportSize(DESKTOP_VIEWPORT)
    await keepCookieOfEndedSession(pageWithoutJavaScript, baseURL)
    await pageWithoutJavaScript.goto(ROUTES.HOME)

    await headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.account }).click()

    await expect(pageWithoutJavaScript).toHaveURL(ROUTES.AUTH.SIGN_IN)
    await expect(pageWithoutJavaScript.getByRole("heading", { level: 1, name: signInPage.form.title })).toBeVisible()
    await pageWithoutJavaScript.goto(ROUTES.HOME)
    await expect(headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.signIn })).toBeVisible()
  })

  test("leads a signed-in admin from Your account, pressed before any script runs, to the admin console", async ({
    baseURL,
    pageWithoutJavaScript,
  }) => {
    await pageWithoutJavaScript.setViewportSize(DESKTOP_VIEWPORT)
    await signInThroughTheApi(pageWithoutJavaScript, admin.email, baseURL)
    await pageWithoutJavaScript.goto(ROUTES.HOME)

    await headerOf(pageWithoutJavaScript).getByRole("link", { exact: true, name: authNavigation.header.account }).click()

    await expect(pageWithoutJavaScript).toHaveURL(ROUTES.ADMIN.INDEX)
  })

  test("leads a signed-in customer from Your account, pressed while the session is still loading, to the workspace", async ({
    appPage,
    baseURL,
    page,
  }) => {
    await signInThroughTheApi(page, customer.email, baseURL)
    const held = Promise.withResolvers<void>()
    await page.route(`**${SERVER_FUNCTION_PATH}**`, async (route) => {
      await held.promise
      await route.continue()
    })
    await page.addInitScript(turnOnDataSaver)
    await page.goto(ROUTES.HOME, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const account = headerOf(page).getByRole("link", { exact: true, name: authNavigation.header.account })
    await expect(account).toHaveAttribute("href", ROUTES.AUTH.SIGN_IN)

    await account.click()
    held.resolve()

    await expect(page).toHaveURL(ROUTES.APP.INDEX)
  })
})
