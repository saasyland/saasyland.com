import { readFileSync, readdirSync } from "node:fs"

import { uiTranslations } from "@fumadocs/base-ui/i18n"
import type { Locator, Page } from "@playwright/test"
import * as zod from "zod"

import { DOCS_CONTENT_ID, SITE_CONTENT_ID } from "../../src/data/navigation.constants"
import { I18N, type SupportedLocale } from "../../src/integrations/use-intl/i18n.config"
import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import { APP_NAME } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const LOCALES = ["pl-PL", "de-DE"] as const satisfies readonly SupportedLocale[]
const VIEWPORTS = [
  { height: 900, width: 1440 },
  { height: 844, width: 390 },
] as const
const [, PHONE_VIEWPORT] = VIEWPORTS
const WIDE_VIEWPORTS = [
  { height: 900, width: 1280 },
  { height: 900, width: 1440 },
  { height: 900, width: 1583 },
  { height: 1000, width: 1870 },
] as const
const PIXEL_TOLERANCE = 1
const DOCS_SIDEBAR = "#nd-sidebar"
const DOCS_TABLE_OF_CONTENTS = "#nd-toc"
const DOCS_PAGE = `${ROUTES.DOCS}/features/authentication`
const BLOG_POST = `${ROUTES.BLOG}/better-t-stack-vs-saas-starter-kit`
const TAGGED_POST = "ai-coding-agents-repository-readiness"
const DOCS_MENU = "nd-sidebar-mobile"
const SONNER_HOTKEY = "alt+T"
const STICKY_BARS = 2
const SKIP_LINK_PAGES = [
  { contentId: DOCS_CONTENT_ID, path: DOCS_PAGE },
  { contentId: SITE_CONTENT_ID, path: BLOG_POST },
  { contentId: SITE_CONTENT_ID, path: ROUTES.HOME },
] as const

const NOTES = /(?:\([^()]*\))+$/u
const FUMADOCS_ENGLISH = [...new Set(uiTranslations().keys.map((key) => key.replace(NOTES, "")))]
const SNAPSHOT_LINE = /^\s*- (?<role>[a-z]+)(?: "(?<name>[^"]*)")?[^:]*(?::(?: (?<text>.+))?)?$/u
const NAMED_ROLES = new Set(["button", "combobox", "heading", "navigation", "region", "searchbox", "text", "textbox"])
const TAGS_BLOCK = /^tags:\n(?<block>(?: {2}- .+\n)+)/mu
const TAG_ITEM = /^ {2}- /u

const treeSchema = zod.record(zod.string(), zod.unknown())
const blogSchema = zod.object({ tags: zod.record(zod.string(), zod.string()) })
const contentNavigationSchema = zod.object({ header: zod.object({ docs: zod.string() }) })
const fumadocsSchema = zod.object({ sidebar: zod.object({ collapse: zod.string(), open: zod.string() }) })
const siteNavigationSchema = zod.object({ getStarted: zod.string(), skipToContent: zod.string() })
const sonnerSchema = zod.object({ label: zod.string() })

const readMessages = (locale: SupportedLocale, namespace: string): unknown =>
  JSON.parse(readFileSync(`messages/${locale}/${namespace}.json`, "utf8"))

const valuesOf = (messages: unknown): string[] => {
  if (typeof messages === "string") {
    return [messages]
  }

  return Object.values(treeSchema.parse(messages)).flatMap((nested) => valuesOf(nested))
}

const ownMessages = (locale: SupportedLocale): Set<string> =>
  new Set(
    readdirSync(`messages/${locale}`)
      .filter((file) => file.endsWith(".json"))
      .flatMap((file) => valuesOf(readMessages(locale, file.replace(/\.json$/u, "")))),
  )

const fumadocsEnglishIn = ({ name, role }: { name: string; role: string }): string[] =>
  FUMADOCS_ENGLISH.filter((english) => name === english || (role === "button" && name.startsWith(`${english} `)))

const untranslatedFumadocsNames = async (page: Page, locale: SupportedLocale): Promise<string[]> => {
  const own = ownMessages(locale)
  const snapshot = await page.locator("body").ariaSnapshot()

  return snapshot
    .split("\n")
    .flatMap((line) => {
      const { name, role = "", text } = SNAPSHOT_LINE.exec(line)?.groups ?? {}
      return NAMED_ROLES.has(role) ? [name, text].flatMap((value) => (value === undefined ? [] : [{ name: value.trim(), role }])) : []
    })
    .filter((entry) => fumadocsEnglishIn(entry).some((english) => !own.has(english)))
    .map(({ name, role }) => `${role} "${name}"`)
}

const tagsOf = (slug: string, locale: SupportedLocale): string[] =>
  (TAGS_BLOCK.exec(readFileSync(`content/blog/${slug}.${locale}.mdx`, "utf8"))?.groups?.["block"] ?? "")
    .split("\n")
    .filter((line) => TAG_ITEM.test(line))
    .map((line) => line.replace(TAG_ITEM, "").trim())

const visit = async (page: Page, path: string): Promise<void> => {
  const app = new BasePage(page)
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await app.waitForAppReady()
  await app.waitForHydration(page.getByRole("main"))
}

const edgesOf = (locator: Locator): Promise<{ bottom: number; left: number; right: number; top: number }> =>
  locator.evaluate((element) => {
    const { bottom, left, right, top } = element.getBoundingClientRect()
    return { bottom, left, right, top }
  })

const stickyBars = (page: Page): Promise<{ count: number; covered: number }> =>
  page.evaluate(() => {
    const bars = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()
        const isPinned = ["fixed", "sticky"].includes(style.position)
        const isShown = style.display !== "none" && style.visibility !== "hidden"
        const isTopBar = box.height > 0 && box.width > window.innerWidth / 2 && box.top < window.innerHeight / 4 && box.bottom > 0
        return isPinned && isShown && isTopBar
      })
      .map((element) => element.getBoundingClientRect())
      .toSorted((first, second) => first.top - second.top)
    let covered = 0
    let count = 0
    for (const bar of bars) {
      if (bar.top <= covered + 1 && bar.bottom > covered) {
        covered = bar.bottom
        count += 1
      }
    }
    return { count, covered }
  })

for (const locale of LOCALES) {
  test.describe(`${locale} docs and blog`, () => {
    for (const viewport of VIEWPORTS) {
      test(`name every Fumadocs control and the notifications in ${locale} at ${String(viewport.width)} px`, async ({ page }) => {
        await page.setViewportSize(viewport)
        for (const path of [DOCS_PAGE, BLOG_POST]) {
          await visit(page, localizePathname({ locale, pathname: path }))
          await expect(page.getByRole("main")).toBeVisible()
          expect(await untranslatedFumadocsNames(page, locale), path).toEqual([])
        }
        const { label } = sonnerSchema.parse(readMessages(locale, "components.shadcn.sonner"))
        await expect(page.getByRole("region", { name: `${label} ${SONNER_HOTKEY}` })).toHaveCount(1)
      })
    }

    test(`give ${locale} docs, blog and landing pages one skip link, first in the tab order, that moves focus to the content`, async ({
      page,
    }) => {
      const { skipToContent } = siteNavigationSchema.parse(readMessages(locale, "components.custom.navigation"))
      for (const { contentId, path } of SKIP_LINK_PAGES) {
        await visit(page, localizePathname({ locale, pathname: path }))
        const missing = await page
          .locator('a[href^="#"]')
          .evaluateAll((links) =>
            links
              .map((link) => link.getAttribute("href") ?? "")
              .filter((href) => href.length > 1 && document.getElementById(decodeURIComponent(href.slice(1))) === null),
          )
        expect(missing, path).toEqual([])
        const skipLink = page.getByRole("link", { exact: true, name: skipToContent })
        await expect(skipLink, path).toHaveCount(1)
        await expect(skipLink, path).toHaveAttribute("href", `#${contentId}`)

        await page.keyboard.press("Tab")
        await expect(skipLink, path).toBeFocused()
        const box = await skipLink.boundingBox()
        expect(box?.width, path).toBeGreaterThan(PIXEL_TOLERANCE)
        expect(box?.height, path).toBeGreaterThan(PIXEL_TOLERANCE)

        await page.keyboard.press("Enter")
        await expect(page, path).toHaveURL(new RegExp(`#${contentId}$`, "u"))
        await page.keyboard.press("Tab")
        expect(await page.evaluate((id) => document.activeElement?.closest(`#${id}`) !== null, contentId), path).toBe(true)
      }
    })

    test(`show ${locale} blog tags in the page's language`, async ({ page }) => {
      const { tags } = blogSchema.parse(readMessages(locale, "pages.blog"))
      const labels = tagsOf(TAGGED_POST, locale).map((tag) => tags[tag])
      expect(labels.length).toBeGreaterThan(0)
      await visit(page, localizePathname({ locale, pathname: ROUTES.BLOG }))
      await expect(page.getByText(labels.join(" · "), { exact: true }).first()).toBeVisible()
    })
  })
}

test.describe("docs on a wide screen", () => {
  for (const viewport of WIDE_VIEWPORTS) {
    test(`line the sidebar and the table of contents up with the site header and keep the sidebar under it at ${String(viewport.width)} px`, async ({
      page,
    }) => {
      const { sidebar } = fumadocsSchema.parse(readMessages(I18N.DEFAULT_LOCALE, "fumadocs"))
      const { getStarted } = siteNavigationSchema.parse(readMessages(I18N.DEFAULT_LOCALE, "components.custom.navigation"))
      await page.setViewportSize(viewport)
      await visit(page, DOCS_PAGE)
      const banner = page.getByRole("banner")
      const logo = await edgesOf(banner.getByRole("link", { exact: true, name: APP_NAME }))
      const callToAction = await edgesOf(banner.getByRole("link", { exact: true, name: getStarted }))

      const expectLinedUp = async (moment: string): Promise<void> => {
        const header = await edgesOf(banner)
        const docsSidebar = await edgesOf(page.locator(DOCS_SIDEBAR))
        const tableOfContents = await edgesOf(page.locator(DOCS_TABLE_OF_CONTENTS))
        await expect(page.locator(DOCS_SIDEBAR), moment).toBeInViewport()
        expect(Math.abs(docsSidebar.left - logo.left), moment).toBeLessThanOrEqual(PIXEL_TOLERANCE)
        expect(Math.abs(tableOfContents.right - callToAction.right), moment).toBeLessThanOrEqual(PIXEL_TOLERANCE)
        expect(Math.abs(docsSidebar.top - header.bottom), moment).toBeLessThanOrEqual(PIXEL_TOLERANCE)
      }

      await expectLinedUp("at the top of the page")
      await page.locator(`#${DOCS_CONTENT_ID} h2`).nth(1).scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      await expectLinedUp("after scrolling")
      await expect(page.locator(DOCS_SIDEBAR).getByRole("button", { exact: true, name: sidebar.collapse })).toHaveCount(0)
    })
  }
})

test.describe("docs on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT)
  })

  test("keep the site header and one docs bar on screen, with one button for the docs navigation", async ({ page }) => {
    const { sidebar } = fumadocsSchema.parse(readMessages(I18N.DEFAULT_LOCALE, "fumadocs"))
    const { header } = contentNavigationSchema.parse(readMessages(I18N.DEFAULT_LOCALE, "navigation.content"))
    await visit(page, DOCS_PAGE)
    await page.locator(`#${DOCS_CONTENT_ID} h2`).nth(1).scrollIntoViewIfNeeded()
    const banner = await page.getByRole("banner").boundingBox()
    const docsBar = await page.getByRole("navigation", { exact: true, name: header.docs }).locator("header").boundingBox()
    const { count, covered } = await stickyBars(page)
    expect(count).toBe(STICKY_BARS)
    expect(covered).toBeLessThanOrEqual((banner?.height ?? 0) + (docsBar?.height ?? 0))
    await expect(page.locator(`[aria-controls="${DOCS_MENU}"]:visible`)).toHaveCount(1)
    await page.getByRole("button", { exact: true, name: sidebar.open }).click()
    await expect(page.locator(`#${DOCS_MENU}`)).toBeVisible()
  })

  test("end every docs page with the site footer", async ({ page }) => {
    await visit(page, DOCS_PAGE)
    await expect(page.getByRole("contentinfo")).toHaveCount(1)
    await page.getByRole("contentinfo").scrollIntoViewIfNeeded()
    await expect(page.getByRole("contentinfo")).toBeVisible()
  })
})
