import { expect, test as base } from "@playwright/test"

import { AuthPage, BasePage, LandingPage } from "../pages"
import { RENDERED_LOCATION_KEY, recordRenderedLocations } from "../pages/base-page"

interface AppFixtures {
  appPage: BasePage
  authPage: AuthPage
  landingPage: LandingPage
  checkTranslations: void
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
  recordRenders: [
    async ({ context }, runWith) => {
      await context.addInitScript(recordRenderedLocations, RENDERED_LOCATION_KEY)
      await runWith()
    },
    { auto: true },
  ],
  authPage: async ({ page }, runWith) => {
    await runWith(new AuthPage(page))
  },
  landingPage: async ({ page }, runWith) => {
    await runWith(new LandingPage(page))
  },
})

export { expect } from "@playwright/test"
