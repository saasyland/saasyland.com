import type { Locator, Page } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { expect, test } from "../fixtures/auth"
import type { AuthPage } from "../pages/auth-page"
import { APP_NAVIGATION_WAIT_UNTIL, type BasePage } from "../pages/base-page"

const [admin] = TEST_ACCOUNTS

const WINDOW = { height: 720, width: 1280 } as const

const MENU_WINDOW_WIDTH = 768

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] }, viewport: WINDOW })

interface Box {
  left: number
  width: number
}

interface PageFixtures {
  appPage: BasePage
  page: Page
}

const boxOf = async (locator: Locator): Promise<Box> =>
  locator.evaluate((element) => {
    const { left, width } = element.getBoundingClientRect()
    return { left, width }
  })

const hiddenHeight = async (scroller: Locator): Promise<number> =>
  scroller.evaluate((element) => element.scrollHeight - element.clientHeight)

const isScrollLocked = async (page: Page): Promise<boolean> =>
  page.evaluate(() => [document.documentElement, document.body].some((element) => getComputedStyle(element).overflowY === "hidden"))

const heading = (page: Page): Locator => page.locator("h1")

const openDocs = async ({ appPage, page }: PageFixtures): Promise<void> => {
  await page.goto(ROUTES.DOCS)
  await appPage.waitForAppReady()
  expect(await hiddenHeight(page.locator("html")), "the docs page scrolls").toBeGreaterThan(0)
}

const openLegalPage = async ({ appPage, page }: PageFixtures): Promise<void> => {
  await page.goto(ROUTES.TERMS)
  await appPage.waitForAppReady()
}

const openAdminPage = async ({ appPage, authPage, page }: PageFixtures & { authPage: AuthPage }, path: string): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const growPastPage = async (page: Page, scroller: Locator): Promise<void> => {
  const hidden = await hiddenHeight(scroller)
  expect(hidden, "the page scrolls in the starting window").toBeGreaterThan(0)
  await page.setViewportSize({ height: WINDOW.height + hidden, width: WINDOW.width })
  await expect.poll(async () => hiddenHeight(scroller), { message: "the page fits the taller window" }).toBe(0)
}

const expectPageToStayWhenItFits = async (page: Page, scroller: Locator): Promise<void> => {
  const scrolling = await boxOf(heading(page))
  await growPastPage(page, scroller)
  expect(await boxOf(heading(page))).toEqual(scrolling)
}

const expectPageToStayWhileOpen = async (page: Page, trigger: Locator, overlay: Locator): Promise<void> => {
  const closed = await boxOf(heading(page))
  await trigger.click()
  await expect(overlay).toBeVisible()
  await expect.poll(async () => isScrollLocked(page)).toBe(true)
  expect(await boxOf(heading(page))).toEqual(closed)
}

test("a public page keeps its column in place whether or not it scrolls", async ({ appPage, page }) => {
  await openLegalPage({ appPage, page })
  await expectPageToStayWhenItFits(page, page.locator("html"))
})

test("an auth page keeps its form in place whether or not it scrolls", async ({ appPage, page }) => {
  await page.goto(ROUTES.SIGN_UP)
  await appPage.waitForAppReady()
  await expectPageToStayWhenItFits(page, page.locator("html"))
})

test("an admin page keeps its content in place whether or not it scrolls, and the workspace fills the window", async ({
  appPage,
  authPage,
  page,
}) => {
  await openAdminPage({ appPage, authPage, page }, ROUTES.ADMIN_SETTINGS)
  await expectPageToStayWhenItFits(page, page.locator("[data-page-scroller]"))
  expect(await boxOf(page.locator("body"))).toEqual({ left: 0, width: WINDOW.width })
})

test("the window keeps the scrollbar's room on a page that fits", async ({ appPage, browserName, page }) => {
  test.skip(browserName !== "chromium", "WebKit on macOS draws overlay scrollbars, which take no room")
  await openLegalPage({ appPage, page })
  await growPastPage(page, page.locator("html"))
  expect((await boxOf(page.locator("body"))).width).toBeLessThan(WINDOW.width)
})

test("opening the docs search leaves the docs page in place", async ({ appPage, page }) => {
  await openDocs({ appPage, page })
  await expectPageToStayWhileOpen(page, page.getByRole("button", { name: /^Search/u }), page.getByRole("dialog"))
})

test("opening the language select leaves the docs page in place", async ({ appPage, page }) => {
  await openDocs({ appPage, page })
  await expectPageToStayWhileOpen(page, page.getByRole("button", { name: /Choose a language/u }), page.getByRole("listbox"))
})

test("opening and closing the site menu leaves the page in place", async ({ appPage, page }) => {
  await page.setViewportSize({ height: WINDOW.height, width: MENU_WINDOW_WIDTH })
  await page.goto(ROUTES.LICENCE)
  await appPage.waitForAppReady()
  expect(await hiddenHeight(page.locator("html")), "the licence page scrolls").toBeGreaterThan(0)
  const closed = await boxOf(heading(page))
  const menu = page.getByRole("dialog", { exact: true, name: "Menu" })

  await expectPageToStayWhileOpen(page, page.getByRole("button", { exact: true, name: "Open menu" }), menu)
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()

  await expect.poll(async () => isScrollLocked(page)).toBe(false)
  expect(await boxOf(heading(page))).toEqual(closed)
})

test("opening a dialog leaves the admin page in place", async ({ appPage, authPage, page }) => {
  await openAdminPage({ appPage, authPage, page }, ROUTES.ADMIN_USERS_ALL)
  await expectPageToStayWhileOpen(
    page,
    page.getByRole("button", { name: "Add user", exact: true }),
    page.getByRole("dialog", { name: "Add user" }),
  )
})

test("opening a menu leaves the admin page in place", async ({ appPage, authPage, page }) => {
  await openAdminPage({ appPage, authPage, page }, ROUTES.ADMIN_USERS_ALL)
  await expectPageToStayWhileOpen(page, page.getByRole("button", { name: /^Actions for /u }).first(), page.getByRole("menu"))
})

for (const path of [ROUTES.HOME, ROUTES.SIGN_IN]) {
  test(`the window behind the dark page at ${path} takes its background in the light theme`, async ({ appPage, page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(path)
    await appPage.waitForAppReady()
    await expect(page.locator("html")).toHaveClass(/\blight\b/u)
    const surface = await page.locator("body > .dark").evaluate((element) => getComputedStyle(element).backgroundColor)
    await expect(page.locator("html")).toHaveCSS("background-color", surface)
  })
}
