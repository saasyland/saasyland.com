import { readFileSync } from "node:fs"

import { DOCS_CONTENT_ID } from "../../src/data/navigation.constants"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const titleOf = (file: string) => /^title: "(?<title>.+)"$/mu.exec(readFileSync(file, "utf8"))?.groups?.["title"]

const INSTALLATION_TITLE = titleOf("content/docs/getting-started/installation.en-US.mdx")
const ENGLISH_MDX_CHUNK = /\/assets\/[\w.-]+\.en-US-[\w-]+\.js$/u
const INSTALLATION_PATH = "/docs/getting-started/installation"
const INSTALLATION_CHUNK = "/installation.en-US-"

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
    const pager = page.locator(`#${DOCS_CONTENT_ID} > :last-child a`)
    const pages = await pager.evaluateAll((links) => links.map((link) => link.getAttribute("href")))
    expect(pages.length).toBeGreaterThan(0)

    await page.locator(`a[href="${INSTALLATION_PATH}"]`).first().click()
    await expect(page).toHaveURL(INSTALLATION_PATH)
    current.resolve()
    await appPage.waitForHydration(page.locator(`#${DOCS_CONTENT_ID}`))
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titleOf("content/docs/getting-started/index.en-US.mdx") ?? "")
    expect(await pager.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(pages)

    next.resolve()
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(INSTALLATION_TITLE ?? "")
    expect(errors).toEqual([])
  })
})
