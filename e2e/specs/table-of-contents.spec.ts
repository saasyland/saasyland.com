import type { Locator, Page } from "@playwright/test"

import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const VIEWPORT = { height: 900, width: 1440 }
const PIXEL_TOLERANCE = 1
const ABOVE_READING_LINE = 100
const BELOW_READING_LINE = 600
const LONG_SECTION = 1200
const CURRENT = '[aria-current="location"]'
const THUMB = "span[aria-hidden]"

const PAGES = [
  { name: "a blog post", path: `${ROUTES.BLOG}/vercel-vs-cloudflare`, toc: 'nav[aria-labelledby="post-toc-title"]' },
  { name: "a docs page", path: `${ROUTES.DOCS}/features/authentication`, toc: "#nd-toc" },
] as const

interface Box {
  readonly height: number
  readonly y: number
}

const visit = async (page: Page, path: string, toc: string): Promise<Locator> => {
  const app = new BasePage(page)
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await app.waitForAppReady()
  const contents = page.locator(toc)
  await app.waitForHydration(contents)
  return contents
}

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.boundingBox()
  return { height: box?.height ?? 0, y: box?.y ?? 0 }
}

const headingOf = (link: Locator): Promise<string> => link.evaluate((anchor) => decodeURIComponent(anchor.getAttribute("href") ?? "").slice(1))

const scrollHeadingTo = (page: Page, id: string, top: number): Promise<void> =>
  page.evaluate(
    ([target, offset]) => {
      const heading = document.querySelector(`#${CSS.escape(target)}`)
      if (heading !== null) {
        window.scrollTo({ behavior: "instant", top: heading.getBoundingClientRect().top + window.scrollY - offset })
      }
    },
    [id, top] as const,
  )

const longSectionIndex = async (links: Locator): Promise<number> =>
  links.evaluateAll((anchors, length) => {
    const tops = anchors.map((anchor) => {
      const id = decodeURIComponent(anchor.getAttribute("href") ?? "").slice(1)
      return document.querySelector(`#${CSS.escape(id)}`)?.getBoundingClientRect().top ?? 0
    })
    return tops.findIndex((top, index) => (tops[index + 1] ?? 0) - top > length)
  }, LONG_SECTION)

const MINIMUM_CONTRAST = 4.5
const COLOR_SCHEMES = ["light", "dark"] as const
const PROGRESS_LINE = ".scroll-progress"
const CURRENT_POST = 'nav[aria-labelledby="post-rail-title"] a[aria-current="page"]'

interface Mark {
  readonly color: string
  readonly contrast: number
  readonly thickness: number
}

const markOf = (line: Locator, horizontal: boolean): Promise<Mark> =>
  line.evaluate((element, isHorizontal) => {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d", { willReadFrequently: true })
    const channels = (css: string): number[] => {
      context?.clearRect(0, 0, 1, 1)
      if (context !== null) {
        context.fillStyle = css
      }
      context?.fillRect(0, 0, 1, 1)
      return [...(context?.getImageData(0, 0, 1, 1).data ?? [])]
    }
    const luminance = (rgb: number[]): number =>
      rgb
        .slice(0, 3)
        .map((channel) => channel / 255)
        .map((channel) => (channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
        .reduce((sum, channel, index) => sum + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0)
    let surface: Element | null = element
    while (surface !== null && (channels(getComputedStyle(surface).backgroundColor)[3] ?? 0) === 0) {
      surface = surface.parentElement
    }
    const foreground = luminance(channels(getComputedStyle(element).color))
    const background = luminance(channels(getComputedStyle(surface ?? document.body).backgroundColor))
    const { height, width } = element.getBoundingClientRect()
    return {
      color: channels(getComputedStyle(element).color).join(),
      contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      thickness: isHorizontal ? height : width,
    }
  }, horizontal)

const accentOf = (page: Page): Promise<{ readonly color: string; readonly thickness: number }> =>
  page.locator(PROGRESS_LINE).evaluate((element) => {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (context !== null) {
      context.fillStyle = getComputedStyle(element).backgroundColor
      context.fillRect(0, 0, 1, 1)
    }
    return { color: [...(context?.getImageData(0, 0, 1, 1).data ?? [])].join(), thickness: element.getBoundingClientRect().height }
  })

const expectThumbOn = async (thumb: Locator, link: Locator): Promise<void> => {
  await expect.poll(async () => Math.abs((await boxOf(thumb)).y - (await boxOf(link)).y)).toBeLessThanOrEqual(PIXEL_TOLERANCE)
  await expect.poll(async () => Math.abs((await boxOf(thumb)).height - (await boxOf(link)).height)).toBeLessThanOrEqual(PIXEL_TOLERANCE)
}

test.describe("the table of contents beside an article", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT)
  })

  for (const { name, path, toc } of PAGES) {
    test(`marks the section the reader scrolls to in ${name} and glides its line to the next entry as the next heading rises`, async ({ page }) => {
      const contents = await visit(page, path, toc)
      const links = contents.getByRole("link")
      const thumb = contents.locator(THUMB)
      const index = await longSectionIndex(links)
      const [section, next] = [links.nth(index), links.nth(index + 1)]

      expect(index, `a section of ${name} longer than ${String(LONG_SECTION)} px`).toBeGreaterThanOrEqual(0)
      await expect(contents.locator(CURRENT)).toHaveCount(0)

      await scrollHeadingTo(page, await headingOf(section), ABOVE_READING_LINE)
      await expect(section).toHaveAttribute("aria-current", "location")
      await expect(contents.locator(CURRENT)).toHaveCount(1)
      await expectThumbOn(thumb, section)

      await scrollHeadingTo(page, await headingOf(next), BELOW_READING_LINE)
      await expect(section).toHaveAttribute("aria-current", "location")
      await expect
        .poll(async () => (await boxOf(thumb)).y)
        .toBeGreaterThan((await boxOf(section)).y + PIXEL_TOLERANCE)
      expect((await boxOf(thumb)).y).toBeLessThan((await boxOf(next)).y - PIXEL_TOLERANCE)

      await scrollHeadingTo(page, await headingOf(next), ABOVE_READING_LINE)
      await expect(next).toHaveAttribute("aria-current", "location")
      await expect(section).not.toHaveAttribute("aria-current")
      const entry = await boxOf(next)
      await expect.poll(async () => (await boxOf(thumb)).y).toBeGreaterThanOrEqual(entry.y - PIXEL_TOLERANCE)
      expect((await boxOf(thumb)).y).toBeLessThanOrEqual(entry.y + entry.height)
    })
  }

  for (const colorScheme of COLOR_SCHEMES) {
    for (const { name, path, toc } of PAGES) {
      test(`writes the current entry of ${name} in the header line's teal, readable in the ${colorScheme} theme, with a line as thick as the header's`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme })
        const contents = await visit(page, path, toc)
        const links = contents.getByRole("link")
        const section = links.nth(await longSectionIndex(links))
        await scrollHeadingTo(page, await headingOf(section), ABOVE_READING_LINE)
        await expect(section).toHaveAttribute("aria-current", "location")
        const accent = await accentOf(page)

        await expect.poll(async () => (await markOf(section, true)).color).toBe(accent.color)
        expect((await markOf(section, true)).contrast).toBeGreaterThanOrEqual(MINIMUM_CONTRAST)
        expect((await markOf(contents.locator(THUMB), false)).thickness).toBe(accent.thickness)
      })
    }

    test(`writes the current post of the posts rail in the same teal, readable in the ${colorScheme} theme`, async ({ page }) => {
      const [post] = PAGES
      await page.emulateMedia({ colorScheme })
      await visit(page, post.path, post.toc)
      const current = page.locator(CURRENT_POST)
      const accent = await accentOf(page)

      await expect.poll(async () => (await markOf(current, true)).color).toBe(accent.color)
      expect((await markOf(current, true)).contrast).toBeGreaterThanOrEqual(MINIMUM_CONTRAST)
      expect(await current.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderLeftWidth))).toBe(accent.thickness)
    })
  }

  test("keeps the current entry in view of its own list without moving the page", async ({ page }) => {
    const [post] = PAGES
    const contents = await visit(page, post.path, post.toc)
    const last = contents.getByRole("link").last()

    await scrollHeadingTo(page, await headingOf(last), ABOVE_READING_LINE)
    const scrolled = await page.evaluate(() => window.scrollY)

    await expect(last).toHaveAttribute("aria-current", "location")
    await expect(last).toBeInViewport()
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
  })

  test("keeps the line on the current entry without gliding when the reader prefers reduced motion", async ({ page }) => {
    const [post] = PAGES
    await page.emulateMedia({ reducedMotion: "reduce" })
    const contents = await visit(page, post.path, post.toc)
    const links = contents.getByRole("link")
    const index = await longSectionIndex(links)
    const [section, next] = [links.nth(index), links.nth(index + 1)]

    await scrollHeadingTo(page, await headingOf(next), BELOW_READING_LINE)

    await expect(section).toHaveAttribute("aria-current", "location")
    await expectThumbOn(contents.locator(THUMB), section)
  })
})
