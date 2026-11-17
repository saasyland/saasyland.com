import { readFileSync } from "node:fs"

import { SITE_CONTENT_ID } from "../../src/data/navigation.constants"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const titleOf = (file: string) => /^title: "(?<title>.+)"$/mu.exec(readFileSync(file, "utf8"))?.groups?.["title"]

const INSTALLATION_TITLE = titleOf("content/docs/getting-started/installation.en-US.mdx")
const DOCS_TITLE = titleOf("content/docs/index.en-US.mdx")
const ENGLISH_MDX_CHUNK = /\/assets\/[\w.-]+\.en-US-[\w-]+\.js$/u
const SERVER_FUNCTION = "**/_serverFn/**"
const GETTING_STARTED_PATH = `${ROUTES.DOCS}/getting-started`
const INSTALLATION_PATH = `${GETTING_STARTED_PATH}/installation`
const INSTALLATION_CHUNK = "/installation.en-US-"
const PAGER = `#${SITE_CONTENT_ID} > :last-child a`

test("documentation loads MDX and follows a sidebar link through the router before the page's MDX has loaded", async ({ appPage, page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const mdx = Promise.withResolvers<void>()
  await page.route(ENGLISH_MDX_CHUNK, async (route) => {
    await mdx.promise
    await route.continue()
  })
  await page.goto("/docs/getting-started")
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.evaluate(() => (document.documentElement.dataset["docsNavigation"] = "same-document"))
  await page.locator('a[href="/docs/getting-started/installation"]').first().click()
  mdx.resolve()
  await expect(page).toHaveURL(/\/docs\/getting-started\/installation$/u)
  expect(INSTALLATION_TITLE).toBeDefined()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(INSTALLATION_TITLE ?? "")
  await expect(page.locator("html")).toHaveAttribute("data-docs-navigation", "same-document")
  expect(errors).toEqual([])
})

test("Polish documentation retains its locale during navigation", async ({ appPage, page }) => {
  await page.goto("/pl-PL/docs/getting-started")
  await appPage.waitForAppReady()
  await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
  await page.locator('a[href="/pl-PL/docs/getting-started/installation"]').first().click()
  await expect(page).toHaveURL(/\/pl-PL\/docs\/getting-started\/installation$/u)
  await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
})

test("blog opens a published article without browser errors", async ({ appPage, page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/blog")
  await appPage.waitForAppReady()
  await page.locator('main a[href^="/blog/"]').first().click()
  await expect(page).toHaveURL(/\/blog\/.+/u)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

test.describe("server rendering and client navigation", () => {
  test("/blog renders its heading before JavaScript runs", async ({ pageWithoutJavaScript }) => {
    await pageWithoutJavaScript.goto("/blog")
    await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(pageWithoutJavaScript.locator('main a[href^="/blog/"]').first()).toBeVisible()
  })

  for (const prefix of ["", "/ja-JP", "/pt-BR"]) {
    test(`${prefix || "/"} docs navigation during hydration keeps the next page intact`, async ({ appPage, browserName, page }) => {
      test.skip(browserName !== "chromium", "CPU throttling uses the Chrome DevTools Protocol")
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const devtools = await page.context().newCDPSession(page)
      await devtools.send("Emulation.setCPUThrottlingRate", { rate: 6 })
      await page.goto(`${prefix}/docs/getting-started`)
      await appPage.waitForAppReady()
      await page.locator(`a[href="${prefix}/docs/getting-started/installation"]`).first().click()
      await expect(page).toHaveURL(new RegExp(`${prefix}/docs/getting-started/installation$`, "u"))
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(page.locator("html")).toHaveAttribute("lang", prefix === "" ? "en-US" : prefix.slice(1))
      expect(errors).toEqual([])
    })
  }

  test("a docs page whose content is still loading gives way to the page skeleton, and the next page brings its own previous and next links", async ({
    appPage,
    browser,
    page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const current = Promise.withResolvers<void>()
    const next = Promise.withResolvers<void>()
    await page.route(ENGLISH_MDX_CHUNK, async (route) => {
      await (route.request().url().includes(INSTALLATION_CHUNK) ? next.promise : current.promise)
      await route.continue()
    })
    await page.goto(GETTING_STARTED_PATH, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    await page.locator(`a[href="${INSTALLATION_PATH}"]`).first().click()
    await expect(page).toHaveURL(INSTALLATION_PATH)
    await expect(page.locator('main[aria-busy="true"]')).toBeVisible()
    current.resolve()
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0)

    next.resolve()
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(INSTALLATION_TITLE ?? "")
    const reference = await browser.newPage()
    await reference.goto(INSTALLATION_PATH)
    await expect(reference.getByRole("heading", { level: 1 })).toHaveText(INSTALLATION_TITLE ?? "")
    const pages = await reference.locator(PAGER).evaluateAll((links) => links.map((link) => link.getAttribute("href")))
    await reference.close()
    expect(pages.length).toBeGreaterThan(0)
    expect(await page.locator(PAGER).evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(pages)
    expect(errors).toEqual([])
  })
})

test.describe("a slow navigation to the docs", () => {
  test("shows the docs skeleton below the site header until the docs layout and page have loaded", async ({ appPage, page }) => {
    const loaded = Promise.withResolvers<void>()
    await page.goto(ROUTES.HOME, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.route(SERVER_FUNCTION, async (route) => {
      await loaded.promise
      await route.continue()
    })

    await page.locator(`header a[href="${ROUTES.DOCS}"]`).first().click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0)
    await expect(page.locator('[aria-busy="true"] [data-slot="skeleton"]').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("banner")).toBeVisible()

    loaded.resolve()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(DOCS_TITLE ?? "")
    await expect(page.locator('[aria-busy="true"]').filter({ visible: true })).toHaveCount(0)
  })

  test("keeps the docs sidebar and shows the page skeleton until the next docs page has loaded", async ({ appPage, page }) => {
    const loaded = Promise.withResolvers<void>()
    await page.goto(GETTING_STARTED_PATH, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.route(SERVER_FUNCTION, async (route) => {
      await loaded.promise
      await route.continue()
    })

    await page.locator(`#nd-sidebar a[href="${INSTALLATION_PATH}"]`).click()
    await expect(page.locator('main[aria-busy="true"]')).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0)
    await expect(page.locator(`#nd-sidebar a[href="${INSTALLATION_PATH}"]`)).toBeVisible()

    loaded.resolve()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(INSTALLATION_TITLE ?? "")
    await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0)
  })
})
