import { type Page, expect, test as base } from "@playwright/test"

import { BasePage, LandingPage } from "../pages"
import { RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"

export const CSP_VIOLATION = "Content Security Policy violation:"

const reportCspViolations = (prefix: string): void => {
  document.addEventListener("securitypolicyviolation", ({ blockedURI, lineNumber, sourceFile, violatedDirective }) => {
    console.error(`${prefix} ${violatedDirective} blocked ${blockedURI} in ${sourceFile}:${String(lineNumber)}`)
  })
}

interface AppFixtures {
  appPage: BasePage
  landingPage: LandingPage
  pageWithoutJavaScript: Page
  checkTranslations: void
  cspViolations: string[]
  recordRenders: void
}

export const test = base.extend<AppFixtures>({
  appPage: async ({ page }, runWith) => {
    await runWith(new BasePage(page))
  },
  checkTranslations: [
    async ({ context }, runWith) => {
      const errors: string[] = []
      context.on("console", (message) => {
        if (/MISSING_MESSAGE|MISSING_FORMAT|INVALID_MESSAGE|FORMATTING_ERROR|No messages\//u.test(message.text())) errors.push(message.text())
      })
      await runWith()
      expect(errors, "Every visited page must resolve and format its translations").toEqual([])
    },
    { auto: true },
  ],
  cspViolations: [
    async ({ context }, runWith) => {
      const violations: string[] = []
      context.on("console", (message) => {
        if (message.text().startsWith(CSP_VIOLATION)) violations.push(message.text())
      })
      await context.addInitScript(reportCspViolations, CSP_VIOLATION)
      await runWith(violations)
      expect(violations, "No page may break its Content Security Policy").toEqual([])
    },
    { auto: true },
  ],
  recordRenders: [
    async ({ context }, runWith) => {
      await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
      await runWith()
    },
    { auto: true },
  ],
  landingPage: async ({ page }, runWith) => {
    await runWith(new LandingPage(page))
  },
  pageWithoutJavaScript: async ({ baseURL, browser }, runWith) => {
    const context = await browser.newContext({ ...(baseURL === undefined ? {} : { baseURL }), javaScriptEnabled: false })
    await runWith(await context.newPage())
    await context.close()
  },
})

export { expect } from "@playwright/test"
