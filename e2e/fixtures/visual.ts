import type { Locator, Page } from "@playwright/test"

import { localizePathname } from "../../src/integrations/use-intl/i18n.paths"
import type { VisualLocale, VisualViewport } from "../data/visual"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"
import { expect } from "./test"

interface Visit {
  readonly locale: VisualLocale
  readonly path: string
  readonly viewport: VisualViewport
}

const loadEveryImage = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const images = [...document.images]
    for (const image of images) {
      image.loading = "eager"
    }
    await Promise.all(images.map(async (image) => image.decode()))
    await document.fonts.ready
  })
}

export const openForScreenshots = async (page: Page, { locale, path, viewport }: Visit): Promise<void> => {
  const app = new BasePage(page)
  await page.setViewportSize(viewport)
  await page.goto(localizePathname({ locale, pathname: path }), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await app.waitForAppReady()
  await app.waitForHydratedElement(page.getByRole("main"))
  await loadEveryImage(page)
}

export const sectionWith = (page: Page, content: Locator): Locator => page.locator("section").filter({ has: content })

export const expectRegion = async (page: Page, region: Locator, name: string, mask: readonly Locator[] = []): Promise<void> => {
  const clip = await region.boundingBox()
  if (clip === null) {
    throw new Error(`${name} has no box on the page`)
  }
  await expect.soft(page).toHaveScreenshot(name, { clip, fullPage: true, mask: [...mask] })
}

export const expectScreen = async (page: Page, name: string, mask: readonly Locator[] = []): Promise<void> => {
  await expect.soft(page).toHaveScreenshot(name, { mask: [...mask] })
}
