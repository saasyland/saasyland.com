import { readFileSync } from "node:fs"

import type { Page, Route } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const ENGLISH_MDX_CHUNK = /\/assets\/[\w.-]+\.en-US-[\w-]+\.js$/u
const INSTALLATION_PATH = "/docs/getting-started/installation"
const INSTALLATION_CHUNK = "/installation.en-US-"
const CLIENT_SCRIPT = /\/assets\/[\w.-]+\.js$/u
const TERMS_CHUNK = /\/assets\/_landing\.terms-[\w-]+\.js$/u
const MOTION_FEATURES_CHUNK = /\/assets\/motion\.features-[\w-]+\.js$/u

const titleOf = (file: string) => /^title: "(?<title>.+)"$/mu.exec(readFileSync(file, "utf8"))?.groups?.["title"] ?? ""

const leaveWhileLoading = async (page: Page, loading: Route): Promise<void> => {
  const departing = Promise.withResolvers<void>()
  const departed = Promise.withResolvers<void>()
  await page.route(`**${ROUTES.PRIVACY}`, async (route) => {
    departing.resolve()
    await departed.promise
    await route.continue()
  })
  const leaving = page.goto(ROUTES.PRIVACY, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await departing.promise
  await loading.abort()
  departed.resolve()
  await leaving
}

test.describe("server rendering and client navigation", () => {
  for (const path of ["/", "/auth/sign-in", "/terms", "/blog"]) {
    test(`${path} renders its heading before JavaScript runs`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ ...(baseURL === undefined ? {} : { baseURL }), javaScriptEnabled: false })
      const page = await context.newPage()
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      if (path === "/auth/sign-in") await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
      if (path === "/blog") await expect(page.locator('main a[href^="/blog/"]').first()).toBeVisible()
      await context.close()
    })
  }

  test("pricing navigates to sign-up without reloading the document", async ({ appPage, page }) => {
    await page.goto("/")
    await appPage.waitForAppReady()
    await page.evaluate(() => (document.documentElement.dataset["navigationProbe"] = "same-document"))
    await page.locator('#pricing a[href^="/auth/sign-up"]').first().click()
    await page.waitForURL((url) => url.pathname.endsWith("/auth/sign-up"))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "same-document")
  })

  test("landing keeps its responsive styles after visiting the docs", async ({ appPage, page }) => {
    await page.goto("/")
    await appPage.waitForAppReady()
    await page.locator('header a[href="/docs"]').first().click()
    await expect(page.getByRole("heading", { level: 1, name: "Documentation" })).toBeVisible()
    await page.locator('a[href="/"]:visible').first().click()
    await page.waitForURL((url) => url.pathname === "/")
    await expect(page.locator("h1 svg")).toBeVisible()
    await expect(page.locator('header a[href="/docs"]').first()).toBeVisible()
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

  test("docs content that renders while the next page loads keeps its own previous and next links", async ({ appPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const current = Promise.withResolvers<void>()
    const next = Promise.withResolvers<void>()
    await page.route(ENGLISH_MDX_CHUNK, async (route) => {
      await (route.request().url().includes(INSTALLATION_CHUNK) ? next.promise : current.promise)
      await route.continue()
    })
    await page.goto("/docs/getting-started", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const pager = page.locator("#nd-page > :last-child a")
    const pages = await pager.evaluateAll((links) => links.map((link) => link.getAttribute("href")))
    expect(pages.length).toBeGreaterThan(0)

    await page.locator(`a[href="${INSTALLATION_PATH}"]`).first().click()
    await expect(page).toHaveURL(INSTALLATION_PATH)
    current.resolve()
    await appPage.waitForHydration(page.locator("#nd-page"))
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titleOf("content/docs/getting-started/index.en-US.mdx"))
    expect(await pager.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(pages)

    next.resolve()
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titleOf("content/docs/getting-started/installation.en-US.mdx"))
    expect(errors).toEqual([])
  })
})

test.describe("a page that is still loading", () => {
  test("keeps the position a visitor scrolled to before it hydrated", async ({ appPage, page }) => {
    const scripts = Promise.withResolvers<void>()
    await page.route(CLIENT_SCRIPT, async (route) => {
      await scripts.promise
      await route.continue()
    })
    await page.goto(ROUTES.HOME, { waitUntil: "commit" })
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: window.innerHeight * 3 }))
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled).toBeGreaterThan(0)

    scripts.resolve()
    await appPage.waitForAppReady()

    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
  })

  test("lets a visitor leave while its route code loads", async ({ appPage, page }) => {
    const chunk = Promise.withResolvers<Route>()
    await page.route(TERMS_CHUNK, (route) => {
      chunk.resolve(route)
    })
    await page.goto(ROUTES.TERMS, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

    await leaveWhileLoading(page, await chunk.promise)

    await expect(page).toHaveURL(ROUTES.PRIVACY)
    await appPage.waitForAppReady()
  })

  test("reports no error when a visitor leaves while its animations load", async ({ landingPage, page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    const features = Promise.withResolvers<Route>()
    await page.route(MOTION_FEATURES_CHUNK, (route) => {
      features.resolve(route)
    })
    await landingPage.goto()

    await leaveWhileLoading(page, await features.promise)

    await expect(page).toHaveURL(ROUTES.PRIVACY)
    expect(errors).toEqual([])
  })
})
