import { type BrowserContext, type Page, type PlaywrightWorkerOptions, expect, test as base } from "@playwright/test"

import { BasePage, LandingPage } from "../pages"
import { RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"
import { servePolarCheckout } from "./polar-checkout"

const CSP_VIOLATION = "Content Security Policy violation:"

const PERMISSIONS_POLICY_ERROR = /^Error with Permissions-Policy header/u

const TRANSLATION_ERROR = /MISSING_MESSAGE|MISSING_FORMAT|INVALID_MESSAGE|FORMATTING_ERROR|No messages\//u

const CLIPBOARD_PERMISSIONS = {
  chromium: ["clipboard-read", "clipboard-write"],
  firefox: [],
  webkit: ["clipboard-read"],
} as const satisfies Record<PlaywrightWorkerOptions["browserName"], readonly string[]>

const reportCspViolations = (prefix: string): void => {
  document.addEventListener("securitypolicyviolation", ({ blockedURI, lineNumber, sourceFile, violatedDirective }) => {
    console.error(`${prefix} ${violatedDirective} blocked ${blockedURI} in ${sourceFile}:${String(lineNumber)}`)
  })
}

const BROWSER_DOUBLES: readonly ((context: BrowserContext) => Promise<void>)[] = [servePolarCheckout]

const consoleMessages = (context: BrowserContext, matches: (text: string) => boolean): string[] => {
  const messages: string[] = []
  context.on("console", (message) => {
    if (matches(message.text())) messages.push(message.text())
  })
  return messages
}

interface AppFixtures {
  appPage: BasePage
  browserDoubles: void
  checkPermissionsPolicy: void
  checkTranslations: void
  cspViolations: string[]
  landingPage: LandingPage
  pageWithoutJavaScript: Page
  readClipboard: () => Promise<string>
  recordRenders: void
}

export interface AppOptions {
  browserDoublesEnabled: boolean
}

export const test = base.extend<AppFixtures & AppOptions>({
  appPage: async ({ page }, runWith) => {
    await runWith(new BasePage(page))
  },
  browserDoubles: [
    async ({ browserDoublesEnabled, context }, runWith) => {
      if (browserDoublesEnabled) {
        for (const serve of BROWSER_DOUBLES) {
          await serve(context)
        }
      }
      await runWith()
    },
    { auto: true },
  ],
  browserDoublesEnabled: [true, { option: true }],
  checkPermissionsPolicy: [
    async ({ context }, runWith) => {
      const errors = consoleMessages(context, (text) => PERMISSIONS_POLICY_ERROR.test(text))
      await runWith()
      expect(errors, "Every page must send a Permissions-Policy whose features the browser recognizes").toEqual([])
    },
    { auto: true },
  ],
  checkTranslations: [
    async ({ context }, runWith) => {
      const errors = consoleMessages(context, (text) => TRANSLATION_ERROR.test(text))
      await runWith()
      expect(errors, "Every visited page must resolve and format its translations").toEqual([])
    },
    { auto: true },
  ],
  cspViolations: [
    async ({ context }, runWith) => {
      const violations = consoleMessages(context, (text) => text.startsWith(CSP_VIOLATION))
      await context.addInitScript(reportCspViolations, CSP_VIOLATION)
      await runWith(violations)
      expect(violations, "No page may break its Content Security Policy").toEqual([])
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
  readClipboard: async ({ browserName, context, page }, runWith) => {
    await context.grantPermissions([...CLIPBOARD_PERMISSIONS[browserName]])
    await runWith(async () => page.evaluate(async () => navigator.clipboard.readText()))
  },
  recordRenders: [
    async ({ context }, runWith) => {
      await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
      await runWith()
    },
    { auto: true },
  ],
})

export { expect } from "@playwright/test"
