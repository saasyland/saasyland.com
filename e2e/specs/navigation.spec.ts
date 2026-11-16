import type { Locator, Page } from "@playwright/test"

import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { MARKETING_SECTION_IDS, SITE_CONTENT_ID } from "../../src/data/navigation.constants"
import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const CLIENT_SCRIPT = /\/assets\/[\w.-]+\.js$/u
const MOBILE_VIEWPORT = { height: 844, width: 390 }
const MINIMUM_TARGET = 24
const POLISH = "pl-PL"
const [freeLesson] = TEST_LESSONS

const DOCS_PAGE = `${ROUTES.DOCS}/conventions/components`

const PUBLIC_PAGES = [
  ROUTES.HOME,
  ROUTES.BLOG,
  `${ROUTES.BLOG}/ai-coding-agents-repository-readiness`,
  ROUTES.COURSES,
  `${ROUTES.COURSES}/${TEST_COURSE.slug}/${freeLesson.slug}`,
  ROUTES.DOCS,
  DOCS_PAGE,
  ROUTES.LICENCE,
  "/this-page-does-not-exist",
]

const POLISH_PAGES = [ROUTES.HOME, ROUTES.BLOG, ROUTES.DOCS].map((pathname) => localizePathname({ locale: POLISH, pathname }))

const HEADER_LABELS = ["SaaSy Land", "Pricing", "Courses", "Blog", "Docs", "Sign in", "Start building"]

const CURRENT_ENTRIES = [
  { current: [], path: ROUTES.HOME },
  { current: ["Blog"], path: `${ROUTES.BLOG}/ai-coding-agents-repository-readiness` },
  { current: ["Courses"], path: ROUTES.COURSES },
  { current: ["Docs"], path: DOCS_PAGE },
  { current: [], path: ROUTES.LICENCE },
]

const visit = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new BasePage(page).waitForAppReady()
}

const linksOf = async (scope: Locator): Promise<string[][]> =>
  scope.getByRole("link").evaluateAll((links) => links.map((link) => [link.textContent.trim(), link.getAttribute("href") ?? ""]))

const menuButton = (page: Page): Locator => page.getByRole("button", { exact: true, name: "Open menu" })

const menu = (page: Page): Locator => page.getByRole("dialog", { exact: true, name: "Menu" })

const isInMenu = async (page: Page): Promise<boolean> =>
  page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement) === true)

const isInert = async (locator: Locator): Promise<boolean> => locator.evaluate((element) => element.closest("[inert]") !== null)

const headerLinks = async (page: Page): Promise<string[][]> => {
  await expect(page.getByRole("banner")).toHaveCount(1)
  return page
    .getByRole("banner")
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => [link.textContent.trim(), link.getAttribute("href") ?? ""]))
}

test.describe("server rendering and client navigation", () => {
  test(`${ROUTES.HOME} renders its heading before JavaScript runs`, async ({ pageWithoutJavaScript }) => {
    await pageWithoutJavaScript.goto(ROUTES.HOME)
    await expect(pageWithoutJavaScript.getByRole("heading", { level: 1 })).toBeVisible()
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
    await page.evaluate(() => {
      document.body.style.minHeight = `${window.innerHeight * 4}px`
      window.scrollTo({ behavior: "instant", top: window.innerHeight * 3 })
    })
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled).toBeGreaterThan(0)

    scripts.resolve()
    await appPage.waitForAppReady()

    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
  })
})

test.describe("one site header", () => {
  test("lists the same links in the same order on every public page", async ({ page }) => {
    const headers = new Map<string, string[][]>()
    for (const path of PUBLIC_PAGES) {
      await visit(page, path)
      headers.set(path, await headerLinks(page))
    }

    const [landing] = headers.values()
    expect(landing?.map(([label]) => label)).toStrictEqual(HEADER_LABELS)
    for (const [path, links] of headers) {
      expect(links, path).toStrictEqual(landing)
    }
  })

  test("keeps the same links, localized, on the Polish landing page, blog and docs", async ({ page }) => {
    await visit(page, ROUTES.HOME)
    const english = await headerLinks(page)
    const polish = english.map(([, href = ""]) => {
      const [pathname = "", hash] = href.split("#")
      return [localizePathname({ locale: POLISH, pathname }), hash].filter((part) => part !== undefined).join("#")
    })

    for (const path of POLISH_PAGES) {
      await visit(page, path)
      expect((await headerLinks(page)).map(([, href]) => href), path).toStrictEqual(polish)
    }
  })

  test("opens the same menu, with every header link, on a phone on every public page, and the docs keep their own sidebar", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    const menus = new Map<string, string[][]>()
    for (const path of PUBLIC_PAGES) {
      await visit(page, path)
      await expect(page.getByRole("banner")).toHaveCount(1)
      await menuButton(page).click()
      await expect(menu(page)).toBeVisible()
      menus.set(path, await linksOf(menu(page)))
    }

    const [landing] = menus.values()
    expect(landing?.map(([label]) => label)).toStrictEqual(HEADER_LABELS)
    for (const [path, links] of menus) {
      expect(links, path).toStrictEqual(landing)
    }

    await visit(page, DOCS_PAGE)
    const sidebarButton = page.getByRole("navigation", { exact: true, name: "Docs" }).getByRole("button", { exact: true, name: "Open docs menu" })
    const header = await page.getByRole("banner").boundingBox()
    expect((await sidebarButton.boundingBox())?.y).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0))
    await sidebarButton.click()
    await expect(page.locator("#nd-sidebar-mobile")).toBeVisible()
    await expect(page.locator("#nd-sidebar-mobile").getByRole("link", { exact: true, name: "Components and styling" })).toBeVisible()
  })

  for (const { current, path } of CURRENT_ENTRIES) {
    test(`marks ${current.join(", ") || "no entry"} as the current section on ${path}`, async ({ page }) => {
      await visit(page, path)

      const marked = await page
        .getByRole("banner")
        .getByRole("link")
        .evaluateAll((links) => links.filter((link) => link.getAttribute("aria-current") === "page").map((link) => link.textContent.trim()))
      expect(marked.filter((label) => label !== "SaaSy Land")).toStrictEqual(current)
    })
  }

  test("marks Pricing on the pricing section, and never the Start building call to action that leads there", async ({ page }) => {
    await visit(page, `${ROUTES.HOME}#${MARKETING_SECTION_IDS.PRICING}`)
    const header = page.getByRole("banner")

    await expect(header.getByRole("link", { exact: true, name: "Pricing" })).toHaveAttribute("aria-current", "page")
    await expect(header.getByRole("link", { exact: true, name: "Start building" })).not.toHaveAttribute("aria-current")
  })

  test("gives the logo a tap target of at least 24 by 24 pixels", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await visit(page, ROUTES.LICENCE)
    const logo = await page.getByRole("banner").getByRole("link", { exact: true, name: "SaaSy Land" }).boundingBox()

    expect(logo?.width).toBeGreaterThanOrEqual(MINIMUM_TARGET)
    expect(logo?.height).toBeGreaterThanOrEqual(MINIMUM_TARGET)
  })

  test("the docs page renders without a hydration error, and nothing in the header or the article moves", async ({ browserName, page }) => {
    test.skip(browserName !== "chromium", "Layout shift entries are a Chromium API")
    const problems: string[] = []
    page.on("pageerror", (error) => problems.push(error.message))
    page.on("console", (message) => {
      if (/hydrat/iu.test(message.text())) problems.push(message.text())
    })
    await page.addInitScript(() => {
      const shifted: Node[] = []
      Reflect.set(window, "__shifted", shifted)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          for (const source of Reflect.get(entry, "sources") ?? []) {
            shifted.push(Reflect.get(source, "node"))
          }
        }
      }).observe({ buffered: true, type: "layout-shift" })
    })

    await visit(page, DOCS_PAGE)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox()
    const header = await page.getByRole("banner").boundingBox()
    const moved = await page.evaluate(
      (content) =>
        Reflect.get(window, "__shifted")
          .map((node: Node) => (node instanceof Element ? node : node.parentElement))
          .filter((element: Element | null) => element?.closest(`header, #${content}`))
          .map((element: Element) => element.outerHTML.slice(0, 120)),
      SITE_CONTENT_ID,
    )

    expect(problems).toEqual([])
    expect(moved).toEqual([])
    expect(heading?.y).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0))
  })
})

test.describe("the phone menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await visit(page, ROUTES.HOME)
  })

  test("is a modal: focus moves to its close button, Tab stays inside, and the page behind is inert", async ({ page }) => {
    await menuButton(page).focus()
    await page.keyboard.press("Enter")

    await expect(menu(page)).toBeVisible()
    await expect(menu(page).getByRole("button", { exact: true, name: "Close menu" })).toBeFocused()
    expect(await isInert(page.locator("main"))).toBe(true)
    expect(await isInert(page.locator("header"))).toBe(true)

    const focusable = await menu(page).locator("a[href], button").count()
    for (let step = 1; step <= focusable + 1; step += 1) {
      await page.keyboard.press("Tab")
      expect(await isInMenu(page), `Tab ${String(step)} stays in the menu`).toBe(true)
    }
    for (let step = 1; step <= focusable + 1; step += 1) {
      await page.keyboard.press("Shift+Tab")
      expect(await isInMenu(page), `Shift+Tab ${String(step)} stays in the menu`).toBe(true)
    }
  })

  test("returns focus to the menu button after Escape and after its close button", async ({ page }) => {
    await menuButton(page).click()
    await expect(menu(page)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(menu(page)).toBeHidden()
    await expect(menuButton(page)).toBeFocused()

    await menuButton(page).click()
    await menu(page).getByRole("button", { exact: true, name: "Close menu" }).click()
    await expect(menu(page)).toBeHidden()
    await expect(menuButton(page)).toBeFocused()
    expect(await isInert(page.locator("main"))).toBe(false)
  })

  test("leads to the pricing section from its Start building call to action", async ({ page }) => {
    await menuButton(page).click()
    await menu(page).getByRole("link", { exact: true, name: "Start building" }).click()

    await expect(menu(page)).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`#${MARKETING_SECTION_IDS.PRICING}$`, "u"))
    await expect(page.locator(`#${MARKETING_SECTION_IDS.PRICING}`)).toBeInViewport()
  })
})
