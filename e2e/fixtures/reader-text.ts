import type { Page } from "@playwright/test"

export const collapse = (text: string): string => text.replaceAll(/\s+/gu, " ").trim()

export const readerText = async (page: Page, html: string): Promise<string> =>
  collapse(
    await page.evaluate((source) => {
      const parsed = new DOMParser().parseFromString(source, "text/html")
      for (const element of parsed.querySelectorAll("script, style")) {
        element.remove()
      }
      return parsed.body.textContent
    }, html),
  )
