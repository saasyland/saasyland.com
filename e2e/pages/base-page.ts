import { type Locator, type Page, type Route, expect } from "@playwright/test"
import type { AnyRouter } from "@tanstack/react-router"

export const APP_NAVIGATION_WAIT_UNTIL = "domcontentloaded" as const

export const RENDERED_LOCATION_KEY = "__e2eRenderedLocation"

const REACT_FIBER_KEY_PREFIX = "__reactFiber$"

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

export const turnOnDataSaver = (): void => {
  Object.defineProperty(Navigator.prototype, "connection", { configurable: true, get: () => ({ saveData: true }) })
}

export class BasePage {
  protected readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  protected async open(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await this.waitForAppReady()
  }

  async waitForAppReady(): Promise<void> {
    await this.page.locator("body").waitFor({ state: "visible" })
    await this.waitForRender()
  }

  async leaveWhileLoading(loading: Route, destination: string): Promise<void> {
    const departing = Promise.withResolvers<void>()
    const departed = Promise.withResolvers<void>()
    await this.page.route(`**${destination}`, async (route) => {
      departing.resolve()
      await departed.promise
      await route.continue()
    })
    const leaving = this.page.goto(destination, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await departing.promise
    await loading.abort()
    departed.resolve()
    await leaving
  }

  async waitForHydration(element: Locator): Promise<void> {
    await expect
      .poll(
        async () =>
          element.evaluate(
            (root, prefix) => [root, ...root.querySelectorAll("*")].every((node) => Object.keys(node).some((key) => key.startsWith(prefix))),
            REACT_FIBER_KEY_PREFIX,
          ),
        { timeout: APP_READY_TIMEOUT_MS },
      )
      .toBe(true)
  }

  async watchForText(text: string): Promise<() => Promise<boolean>> {
    const marker = `__sawText:${text}`
    await this.page.evaluate(
      ([key, watched]) => {
        const look = () => {
          if (document.body.textContent.includes(watched)) {
            Reflect.set(globalThis, key, true)
          }
        }
        look()
        new MutationObserver(look).observe(document.body, { characterData: true, childList: true, subtree: true })
      },
      [marker, text] as const,
    )

    return async () => this.page.evaluate((key) => Reflect.get(globalThis, key) === true, marker)
  }

  private async waitForRender(): Promise<void> {
    await this.page.waitForFunction(
      (key) =>
        Reflect.get(window, key) === `${location.pathname}${location.search}${location.hash}` &&
        [...document.querySelectorAll('div[id^="S:"]')].every((node) => globalThis.getComputedStyle(node).display !== "none"),
      RENDERED_LOCATION_KEY,
      { timeout: APP_READY_TIMEOUT_MS },
    )
  }
}
