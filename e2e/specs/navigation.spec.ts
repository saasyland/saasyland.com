import type { Locator, Page } from "@playwright/test"

import authNavigation from "../../messages/en-US/navigation.auth.json" with { type: "json" }
import contentNavigation from "../../messages/en-US/navigation.content.json" with { type: "json" }
import coreNavigation from "../../messages/en-US/navigation.core.json" with { type: "json" }
import coursesNavigation from "../../messages/en-US/navigation.courses.json" with { type: "json" }
import signIn from "../../messages/en-US/pages.auth.sign-in.json" with { type: "json" }
import blog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import courses from "../../messages/en-US/pages.courses.json" with { type: "json" }
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { DOCS_CONTENT_ID, MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"
import { ROUTES } from "../../src/routes"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage, turnOnDataSaver } from "../pages/base-page"

const CLIENT_SCRIPT = /\/assets\/[\w.-]+\.js$/u
const SERVER_FUNCTION = "**/_serverFn/**"
const MOBILE_VIEWPORT = { height: 844, width: 390 }
const WIDEST_VIEWPORT = { height: 1440, width: 2560 }
const HEADER_VIEWPORTS = [
  MOBILE_VIEWPORT,
  { height: 900, width: 1280 },
  { height: 900, width: 1440 },
  { height: 1000, width: 1870 },
  { height: 1080, width: 1920 },
  WIDEST_VIEWPORT,
]
const HEADER_LINE_WIDTH = "1px"
const TRANSPARENT = "rgba(0, 0, 0, 0)"
const MINIMUM_TARGET = 24
const HEADER_MARK = "__sameHeader"
const HEADER_FRAMES = "__headerFrames"
const SITE_WIDTH = "--container-site"
const DOCS_FRAME = "#nd-docs-layout"
const PIXEL_TOLERANCE = 1
const FRAME_VIEWPORTS = [{ height: 900, width: 1440 }, { height: 1080, width: 1920 }, WIDEST_VIEWPORT]
const POLISH = "pl-PL"
const [freeLesson] = TEST_LESSONS

const DOCS_PAGE = `${ROUTES.DOCS}/conventions/components`
const LONG_DOCS_PAGE = `${ROUTES.DOCS}/features/courses`

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

const HEADER_PAGES = [ROUTES.HOME, ROUTES.BLOG, ROUTES.DOCS]
const FRAMED_PAGES = [ROUTES.HOME, ROUTES.BLOG, ROUTES.COURSES, ROUTES.DOCS, LONG_DOCS_PAGE]

const POLISH_PAGES = HEADER_PAGES.map((pathname) => localizePathname({ locale: POLISH, pathname }))

const HEADER_LABELS = ["SaaSy Land", "Pricing", "Courses", "Blog", "Docs", "Sign in", "Start building"]

const CURRENT_ENTRIES = [
  { current: [], path: ROUTES.HOME },
  { current: ["Blog"], path: `${ROUTES.BLOG}/ai-coding-agents-repository-readiness` },
  { current: ["Courses"], path: ROUTES.COURSES },
  { current: ["Docs"], path: DOCS_PAGE },
  { current: [], path: ROUTES.LICENCE },
]

interface HeaderFrame {
  docs: boolean
  header: number[]
  navigation: number[]
  path: string
}

interface Box {
  bottom: number
  left: number
  right: number
  top: number
}

const boxOf = (element: Element): Box => {
  const { bottom, left, right, top } = element.getBoundingClientRect()
  return { bottom, left, right, top }
}

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

const headerPlacement = async (page: Page): Promise<{ header: Box; logo: Box; navigation: Box }> => {
  const header = page.getByRole("banner")
  return {
    header: await header.evaluate(boxOf),
    logo: await header.getByRole("link", { exact: true, name: "SaaSy Land" }).evaluate(boxOf),
    navigation: await header.getByRole("navigation").evaluate(boxOf),
  }
}

const columnOf = (locator: Locator): Promise<{ left: number; right: number }> =>
  locator.evaluate((element) => {
    const { left, right } = element.getBoundingClientRect()
    return { left, right }
  })

const tokenWidth = (page: Page, token: string): Promise<number> =>
  page.evaluate((name) => {
    const probe = document.createElement("div")
    probe.style.width = `var(${name})`
    document.body.appendChild(probe)
    const { width } = probe.getBoundingClientRect()
    probe.remove()
    return width
  }, token)

const headerLine = async (page: Page): Promise<{ color: string; width: string }> =>
  page.getByRole("banner").evaluate((header) => {
    const { borderBottomColor, borderBottomWidth } = getComputedStyle(header)
    return { color: borderBottomColor, width: borderBottomWidth }
  })

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
  test("keeps the same header element through client navigations from the landing page to the docs and back", async ({ page }) => {
    await visit(page, ROUTES.HOME)
    const header = page.getByRole("banner")
    await new BasePage(page).waitForHydration(header)
    await header.evaluate((element, mark) => Reflect.set(element, mark, true), HEADER_MARK)
    const isSameHeader = (): Promise<boolean> => header.evaluate((element, mark) => Reflect.get(element, mark) === true, HEADER_MARK)

    await header.getByRole("link", { exact: true, name: "Docs" }).click()
    await expect(page).toHaveURL(ROUTES.DOCS)
    await expect(page.locator(`#${DOCS_CONTENT_ID}`)).toBeVisible()
    expect(await isSameHeader(), ROUTES.DOCS).toBe(true)

    await header.getByRole("link", { exact: true, name: "SaaSy Land" }).click()
    await expect(page).toHaveURL(ROUTES.HOME)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(await isSameHeader(), ROUTES.HOME).toBe(true)
  })

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

  test("stays in one place with its bottom line on the landing page, the blog and the docs, at the top of the page and after scrolling", async ({
    page,
  }) => {
    for (const viewport of HEADER_VIEWPORTS) {
      await page.setViewportSize(viewport)
      const placements = new Map<string, Awaited<ReturnType<typeof headerPlacement>>>()
      for (const path of HEADER_PAGES) {
        await visit(page, path)
        const top = { line: await headerLine(page), placement: await headerPlacement(page) }
        await page.evaluate(() => {
          window.scrollTo({ behavior: "instant", top: window.innerHeight })
        })
        expect(await page.evaluate(() => window.scrollY), path).toBeGreaterThan(0)

        expect(top.line.width, path).toBe(HEADER_LINE_WIDTH)
        expect(top.line.color, path).not.toBe(TRANSPARENT)
        expect({ line: await headerLine(page), placement: await headerPlacement(page) }, path).toStrictEqual(top)
        placements.set(path, top.placement)
      }

      const landing = placements.get(ROUTES.HOME)
      for (const [path, placement] of placements) {
        expect(placement, `${path} at ${String(viewport.width)} px`).toStrictEqual(landing)
      }
    }
  })

  test("puts the header and the footer in the site's frame, at the same width and place, on the landing page, the blog, the courses, the docs and a long docs page", async ({
    page,
  }) => {
    for (const viewport of FRAME_VIEWPORTS) {
      await page.setViewportSize(viewport)
      const frames = new Map<string, { footer: { left: number; right: number }; header: { left: number; right: number } }>()
      for (const path of FRAMED_PAGES) {
        await visit(page, path)
        frames.set(path, {
          footer: await columnOf(page.getByRole("contentinfo").locator(":scope > div")),
          header: await columnOf(page.getByRole("banner").getByRole("navigation")),
        })
      }

      const siteWidth = await tokenWidth(page, SITE_WIDTH)
      const pageWidth = await page.evaluate(() => document.documentElement.clientWidth)
      const landing = frames.get(ROUTES.HOME)
      for (const [path, frame] of frames) {
        expect(frame, `${path} at ${String(viewport.width)} px`).toStrictEqual(landing)
      }
      expect(landing?.footer).toStrictEqual(landing?.header)
      expect(Math.abs((landing?.header.right ?? 0) - (landing?.header.left ?? 0) - Math.min(siteWidth, pageWidth))).toBeLessThanOrEqual(
        PIXEL_TOLERANCE,
      )
    }
  })

  test("keeps the header in one place in every frame of the client navigations from the landing page to the docs and on to the blog", async ({
    page,
  }) => {
    for (const viewport of FRAME_VIEWPORTS) {
      await page.setViewportSize(viewport)
      await visit(page, ROUTES.HOME)
      const header = page.getByRole("banner")
      await new BasePage(page).waitForHydration(header)
      await page.evaluate(
        ({ docsSelector, key }) => {
          const frames: HeaderFrame[] = []
          Reflect.set(window, key, frames)
          const edges = (element: Element | null): number[] => {
            const box = element?.getBoundingClientRect()
            return box === undefined ? [] : [box.left, box.top, box.right, box.bottom]
          }
          const record = (): void => {
            const banner = document.querySelector("header")
            frames.push({
              docs: document.querySelector(docsSelector) !== null,
              header: edges(banner),
              navigation: edges(banner?.querySelector("nav") ?? null),
              path: window.location.pathname,
            })
            requestAnimationFrame(record)
          }
          requestAnimationFrame(record)
        },
        { docsSelector: DOCS_FRAME, key: HEADER_FRAMES },
      )

      await header.getByRole("link", { exact: true, name: contentNavigation.header.docs }).click()
      await expect(page).toHaveURL(ROUTES.DOCS)
      await expect(page.locator(`#${DOCS_CONTENT_ID}`)).toBeVisible()
      await header.getByRole("link", { exact: true, name: contentNavigation.header.blog }).click()
      await expect(page).toHaveURL(ROUTES.BLOG)
      await expect(page.getByRole("heading", { level: 1, name: blog.index.title })).toBeVisible()

      const frames: HeaderFrame[] = await page.evaluate(
        (key) =>
          new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(Reflect.get(window, key))
              })
            })
          }),
        HEADER_FRAMES,
      )
      const [first] = frames
      const placeOf = (frame: HeaderFrame | undefined): string => JSON.stringify([frame?.header, frame?.navigation])
      const at = `${String(viewport.width)} px`
      expect(frames.some(({ docs }) => docs), at).toBe(true)
      expect(frames.at(-1)?.path, at).toBe(ROUTES.BLOG)
      expect(first?.navigation, at).toHaveLength(4)
      expect(
        frames.filter((frame) => placeOf(frame) !== placeOf(first)),
        at,
      ).toStrictEqual([])
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
      DOCS_CONTENT_ID,
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

const PRELOADED_DESTINATIONS = [
  { from: ROUTES.HOME, link: contentNavigation.header.docs, shown: (page: Page) => page.locator(`#${DOCS_CONTENT_ID} h1`) },
  { from: ROUTES.HOME, link: contentNavigation.header.blog, shown: (page: Page) => page.getByRole("heading", { level: 1, name: blog.index.title }) },
  {
    from: ROUTES.HOME,
    link: coursesNavigation.header.courses,
    shown: (page: Page) => page.getByRole("heading", { level: 1, name: courses.catalogue.title }),
  },
  { from: ROUTES.HOME, link: authNavigation.header.signIn, shown: (page: Page) => page.getByRole("heading", { level: 1, name: signIn.form.title }) },
  { from: ROUTES.DOCS, link: coreNavigation.header.pricing, shown: (page: Page) => page.locator(`#${MARKETING_SECTION_IDS.PRICING}`) },
]

const serverFunctionRequests = (page: Page): string[] => {
  const requests: string[] = []
  page.on("request", (request) => {
    if (request.url().includes("/_serverFn/")) requests.push(request.url())
  })
  return requests
}

const waitForHeaderPreloads = async (page: Page, path: string): Promise<void> => {
  const requests = serverFunctionRequests(page)
  await visit(page, path)
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  await page.waitForLoadState("networkidle")
}

const holdServerFunctions = async (page: Page): Promise<() => void> => {
  const held = Promise.withResolvers<void>()
  await page.route(SERVER_FUNCTION, async (route) => {
    await held.promise
    await route.continue()
  })
  return held.resolve
}

test.describe("the header's pages", () => {
  for (const { from, link, shown } of PRELOADED_DESTINATIONS) {
    test(`are loaded once ${from} is idle, so ${link} opens while every server function is held`, async ({ page }) => {
      await waitForHeaderPreloads(page, from)
      const release = await holdServerFunctions(page)

      await page.getByRole("banner").getByRole("link", { exact: true, name: link }).click()

      await expect(shown(page)).toBeVisible()
      release()
    })
  }

  test("are loaded on a phone too, so Docs opens from the menu while every server function is held", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await waitForHeaderPreloads(page, ROUTES.HOME)
    const release = await holdServerFunctions(page)

    await menuButton(page).click()
    await menu(page).getByRole("link", { exact: true, name: contentNavigation.header.docs }).click()

    await expect(page.locator(`#${DOCS_CONTENT_ID} h1`)).toBeVisible()
    release()
  })

  test("are not loaded ahead of a click for a visitor who has turned on data saver", async ({ page }) => {
    const requests = serverFunctionRequests(page)
    await page.addInitScript(turnOnDataSaver)

    await visit(page, ROUTES.HOME)
    await page.waitForLoadState("networkidle")

    expect(requests).toEqual([])
  })
})
