import { readFileSync, readdirSync } from "node:fs"

import englishChangelogLinks from "../../messages/en-US/components.custom.changelog-links.json" with { type: "json" }
import englishFumadocs from "../../messages/en-US/fumadocs.json" with { type: "json" }
import polishFumadocs from "../../messages/pl-PL/fumadocs.json" with { type: "json" }
import { DOCS_CONTENT_ID } from "../../src/data/navigation.constants"
import { CHANGELOG_DIRECTORY, ENTRY_ORIGIN, originOf } from "../../src/lib/changelog"
import { APP_GITHUB_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, turnOnDataSaver } from "../pages/base-page"

const titleOf = (file: string) => /^title: "(?<title>.+)"$/mu.exec(readFileSync(file, "utf8"))?.groups?.["title"]

const INSTALLATION_TITLE = titleOf("content/docs/getting-started/installation.en-US.mdx")
const DOCS_TITLE = titleOf("content/docs/index.en-US.mdx")
const ENGLISH_MDX_CHUNK = /\/assets\/[\w.-]+\.en-US-[\w-]+\.js$/u
const ENGLISH_DOCS_INDEX_CHUNK = /\/assets\/docs-index-en-US-[\w-]+\.js$/u
const SEARCH_INDEX = /^\/assets\/search-index-(?<locale>[a-zA-Z-]+)-[\da-f]+\.json$/u
const SEARCH_OPEN_TIMEOUT_MS = 2000
const STATIC_FILE = /^\/(?:assets|fonts|images)\//u
const GETTING_STARTED_PATH = `${ROUTES.DOCS}/getting-started`
const INSTALLATION_PATH = `${GETTING_STARTED_PATH}/installation`
const INSTALLATION_CHUNK = "/installation.en-US-"
const PAGER = `#${DOCS_CONTENT_ID} > :last-child a`
const CHANGELOG_PATH = `${ROUTES.DOCS}/project/changelog`
const ENGLISH_ENTRY = ".en-US.mdx"
const SHORT_COMMIT_LENGTH = 7
const ENTRY_LINKS = `#${DOCS_CONTENT_ID} a[href^="${APP_GITHUB_URL}/pull/"], #${DOCS_CONTENT_ID} a[href^="${APP_GITHUB_URL}/commit/"]`

interface EntryLink {
  readonly href: string
  readonly name: string
}

const entryLinkOf = (key: string): EntryLink => {
  if (originOf(key) === ENTRY_ORIGIN.PULL_REQUEST) {
    return { href: `${APP_GITHUB_URL}/pull/${key}`, name: englishChangelogLinks.pullRequest.replace("{number}", key) }
  }

  return { href: `${APP_GITHUB_URL}/commit/${key}`, name: englishChangelogLinks.commit.replace("{commit}", key.slice(0, SHORT_COMMIT_LENGTH)) }
}

const byHref = (first: EntryLink, second: EntryLink): number => first.href.localeCompare(second.href)

const CHANGELOG_KEYS = readdirSync(CHANGELOG_DIRECTORY)
  .filter((file) => file.endsWith(ENGLISH_ENTRY))
  .map((file) => file.slice(0, -ENGLISH_ENTRY.length))

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

test("the changelog ends every entry with a link to the pull request or commit it came from, named for screen readers", async ({
  appPage,
  page,
}) => {
  await page.goto(CHANGELOG_PATH)
  await appPage.waitForAppReady()
  for (const origin of Object.values(ENTRY_ORIGIN)) {
    const key = CHANGELOG_KEYS.find((entry) => originOf(entry) === origin) ?? ""
    const { href, name } = entryLinkOf(key)
    await expect(page.getByRole("link", { exact: true, name })).toHaveAttribute("href", href)
  }
  const found = await page
    .locator(ENTRY_LINKS)
    .evaluateAll((anchors) => anchors.map((anchor) => ({ href: anchor.getAttribute("href") ?? "", name: anchor.getAttribute("aria-label") ?? "" })))
  expect(found.toSorted(byHref)).toStrictEqual(CHANGELOG_KEYS.map((key) => entryLinkOf(key)).toSorted(byHref))
})

test("blog opens a published article without browser errors", async ({ appPage, page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/blog")
  await appPage.waitForAppReady()
  await page.locator('main h2 a[href^="/blog/"]').first().click()
  await expect(page).toHaveURL(/\/blog\/.+/u)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

test.describe("server rendering and client navigation", () => {
  test("/blog renders its heading before JavaScript runs", async ({ pageWithoutJavaScript }) => {
    await pageWithoutJavaScript.goto("/blog")
    await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(pageWithoutJavaScript.locator('main h2 a[href^="/blog/"]').first()).toBeVisible()
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
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(turnOnDataSaver)
  })

  test("shows the docs skeleton below the site header until the docs layout and page have loaded", async ({ appPage, page }) => {
    const loaded = Promise.withResolvers<void>()
    await page.goto(ROUTES.HOME, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    await page.route(ENGLISH_DOCS_INDEX_CHUNK, async (route) => {
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
    await page.route(ENGLISH_MDX_CHUNK, async (route) => {
      if (route.request().url().includes(INSTALLATION_CHUNK)) {
        await loaded.promise
      }
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

test.describe("content without the Worker", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(turnOnDataSaver)
  })

  test("client navigations through the docs and the blog request nothing but static files", async ({ appPage, page }) => {
    await page.goto(ROUTES.HOME, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()
    const requests: string[] = []
    page.on("request", (request) => requests.push(new URL(request.url()).pathname))

    await page.locator(`header a[href="${ROUTES.DOCS}"]`).first().click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(DOCS_TITLE ?? "")
    await page.locator(`a[href="${GETTING_STARTED_PATH}"]`).first().click()
    await expect(page).toHaveURL(GETTING_STARTED_PATH)
    await page.locator(`a[href="${INSTALLATION_PATH}"]`).first().click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(INSTALLATION_TITLE ?? "")
    await page.locator(`header a[href="${ROUTES.BLOG}"]`).first().click()
    await expect(page).toHaveURL(ROUTES.BLOG)
    await page.locator('main h2 a[href^="/blog/"]').first().click()
    await expect(page).toHaveURL(/\/blog\/.+/u)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    expect(requests.length).toBeGreaterThan(0)
    expect(requests.filter((pathname) => !STATIC_FILE.test(pathname))).toEqual([])
  })

  for (const { label, locale, prefix, query } of [
    { label: englishFumadocs.search.label, locale: "en-US", prefix: "", query: "installation" },
    { label: polishFumadocs.search.label, locale: "pl-PL", prefix: "/pl-PL", query: "instalacja" },
  ]) {
    test(`the ${locale} docs search downloads its own static index and finds pages in it`, async ({ appPage, page }) => {
      await page.goto(`${prefix}${GETTING_STARTED_PATH}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
      await appPage.waitForAppReady()
      const requests: string[] = []
      page.on("request", (request) => requests.push(new URL(request.url()).pathname))

      const trigger = page.getByRole("button", { name: new RegExp(`^${label}`, "u") }).first()
      const dialog = page.getByRole("dialog")
      await expect(async () => {
        if (!(await dialog.isVisible())) {
          await trigger.click({ timeout: SEARCH_OPEN_TIMEOUT_MS })
        }
        await expect(dialog).toBeVisible({ timeout: SEARCH_OPEN_TIMEOUT_MS })
      }).toPass()
      expect(requests.filter((pathname) => SEARCH_INDEX.test(pathname))).toEqual([])
      await dialog.getByRole("combobox").fill(query)

      await expect(dialog.getByRole("option").first()).toBeVisible()
      expect(requests.flatMap((pathname) => SEARCH_INDEX.exec(pathname)?.groups?.["locale"] ?? [])).toEqual([locale])
      expect(requests.filter((pathname) => !STATIC_FILE.test(pathname))).toEqual([])
    })
  }
})
