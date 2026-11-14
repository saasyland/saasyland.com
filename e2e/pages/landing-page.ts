import type { Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class LandingPage extends BasePage {
  async goto(localePrefix = ""): Promise<void> {
    await this.gotoPath(localePrefix.length > 0 ? localePrefix : "/")
    await this.waitForAppReady()
    await this.waitForHydration(this.page.getByRole("main"))
  }

  heroHeading(): Locator {
    return this.page.getByRole("heading", { level: 1 })
  }

  heroGetStartedLink(): Locator {
    return this.page.locator("#floor").getByRole("link", { name: /start building/iu })
  }

  navigationGetStartedLink(): Locator {
    return this.page.getByRole("banner").getByRole("link", { name: /start building/iu })
  }

  navigation(): Locator {
    return this.page.getByRole("banner")
  }

  courseShowcase(): Locator {
    return this.page.locator("#toolkit article").filter({ has: this.page.getByRole("heading", { level: 3, name: "Watch it get built, end to end." }) })
  }
}
