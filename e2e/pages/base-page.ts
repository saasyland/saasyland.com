import type { Page, Response } from "@playwright/test"
import type { AnyRouter } from "@tanstack/react-router"

export const APP_NAVIGATION_WAIT_UNTIL = "domcontentloaded" as const

export const RENDERED_LOCATION_KEY = "__e2eRenderedLocation"

const APP_READY_TIMEOUT_MS = 30_000

export const recordRenderedLocations = (key: string): void => {
  let router: AnyRouter | undefined
  Object.defineProperty(window, "__TSR_ROUTER__", {
    configurable: true,
    get: () => router,
    set: (created: AnyRouter) => {
      router = created
      created.subscribe("onRendered", ({ toLocation }) => {
        Reflect.set(window, key, toLocation.publicHref)
      })
    },
  })
}

export class BasePage {
  protected readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  protected async gotoPath(path: string): Promise<Response | null> {
    return this.page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  }

  async waitForAppReady(): Promise<void> {
    await this.page.locator("body").waitFor({ state: "visible" })
    await this.waitForRender()
  }

  private async waitForRender(): Promise<void> {
    await this.page.waitForFunction(
      (key) => {
        if (Reflect.get(window, key) !== `${location.pathname}${location.search}${location.hash}`) {
          return false
        }
        for (const node of document.querySelectorAll('div[id^="S:"]')) {
          if (globalThis.getComputedStyle(node).display === "none") {
            return false
          }
        }

        return true
      },
      RENDERED_LOCATION_KEY,
      { timeout: APP_READY_TIMEOUT_MS },
    )
  }
}
