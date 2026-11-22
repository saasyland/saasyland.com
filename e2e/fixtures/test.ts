import { type Page, type PlaywrightWorkerOptions, expect, test as base } from "@playwright/test"

import { BasePage, LandingPage } from "../pages"
import { RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"
import { servePolarCheckout } from "./polar-checkout"

export const CSP_VIOLATION = "Content Security Policy violation:"

const PERMISSIONS_POLICY_ERROR = /^Error with Permissions-Policy header/u

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

interface AppFixtures {
  appPage: BasePage
  landingPage: LandingPage
  pageWithoutJavaScript: Page
  checkTranslations: void
  checkPermissionsPolicy: void
  cspViolations: string[]
  polarCheckout: void
  readClipboard: () => Promise<string>
  recordRenders: void
}

export interface AppOptions {
  polarCheckoutDouble: boolean
}

export const test = base.extend<AppFixtures & AppOptions>({
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
  checkPermissionsPolicy: [
    async ({ context }, runWith) => {
      const errors: string[] = []
      context.on("console", (message) => {
        if (PERMISSIONS_POLICY_ERROR.test(message.text())) errors.push(message.text())
      })
      await runWith()
      expect(errors, "Every page must send a Permissions-Policy whose features the browser recognizes").toEqual([])
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
  polarCheckout: [
    async ({ context, polarCheckoutDouble }, runWith) => {
      if (polarCheckoutDouble) await servePolarCheckout(context)
      await runWith()
    },
    { auto: true },
  ],
  polarCheckoutDouble: [true, { option: true }],
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
