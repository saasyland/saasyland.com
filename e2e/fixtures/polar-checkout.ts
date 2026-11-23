import type { BrowserContext, FrameLocator, Locator, Page, Route } from "@playwright/test"
import * as zod from "zod"

import { POLAR_CUSTOMER_SESSION_TOKEN_PARAM } from "../../src/integrations/polar/polar.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { polarCheckoutOrigin } from "../../src/data/polar"
import { TEST_POLAR } from "../data/polar-settings"

const CHECKOUT_PATH = /^\/checkout\/(?<secret>[^/]+)$/u
const CHECKOUT_ORIGIN = polarCheckoutOrigin(TEST_POLAR.POLAR_SERVER)
const REFUSE_FRAMING = { "content-security-policy": "frame-ancestors 'none'" }

export const POLAR_CUSTOMER_SESSION_TOKEN = "polar_cst_e2eCustomerSessionTokenThatMustStayOnPolar"

const checkoutSchema = zod.object({ embed_origin: zod.string(), success_url: zod.string() })

export const isPolarCheckoutPage = (url: URL): boolean => url.origin === CHECKOUT_ORIGIN && CHECKOUT_PATH.test(url.pathname)

const checkoutPage = ({ embed_origin: embedOrigin, success_url: successUrl }: zod.infer<typeof checkoutSchema>): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Polar checkout test double</title>
  </head>
  <body>
    <main>
      <h1>Polar checkout test double</h1>
      <button id="pay" type="button">Pay</button>
      <button id="close" type="button">Close</button>
    </main>
    <script>
      const post = (message) => window.parent.postMessage({ ...message, type: "POLAR_CHECKOUT" }, ${JSON.stringify(embedOrigin)})
      document.querySelector("#pay").addEventListener("click", () => {
        if (window.parent === window) {
          const success = new URL(${JSON.stringify(successUrl)})
          success.searchParams.set(${JSON.stringify(POLAR_CUSTOMER_SESSION_TOKEN_PARAM)}, ${JSON.stringify(POLAR_CUSTOMER_SESSION_TOKEN)})
          window.location.assign(success)
          return
        }
        post({ event: "confirmed" })
        post({ event: "success", redirect: true, successURL: ${JSON.stringify(successUrl)} })
      })
      document.querySelector("#close").addEventListener("click", () => {
        post({ event: "close" })
      })
      post({ event: "loaded" })
    </script>
  </body>
</html>`

const serveCheckout = async (route: Route, context: BrowserContext, headers: Record<string, string>): Promise<void> => {
  const secret = CHECKOUT_PATH.exec(new URL(route.request().url()).pathname)?.groups?.["secret"] ?? ""
  const response = await context.request.get("/__test/polar/checkout", { params: { secret } })

  if (!response.ok()) {
    await route.fulfill({ status: HTTP_STATUS.NOT_FOUND })
    return
  }

  await route.fulfill({ body: checkoutPage(checkoutSchema.parse(await response.json())), contentType: "text/html", headers })
}

export const servePolarCheckout = async (context: BrowserContext): Promise<void> => {
  await context.route(isPolarCheckoutPage, async (route) => serveCheckout(route, context, {}))
}

export const refusePolarCheckoutEmbedding = async (context: BrowserContext): Promise<void> => {
  await context.route(isPolarCheckoutPage, async (route) => serveCheckout(route, context, REFUSE_FRAMING))
}

export const checkoutOverlay = (page: Page): Locator => page.locator(`body > iframe[src^="${CHECKOUT_ORIGIN}/checkout/"]`)

export const checkoutOverlayFrame = (page: Page): FrameLocator => checkoutOverlay(page).contentFrame()

export const payInCheckoutOverlay = async (page: Page): Promise<void> => {
  await checkoutOverlayFrame(page).getByRole("button", { name: "Pay" }).click()
}

export const closeCheckoutOverlay = async (page: Page): Promise<void> => {
  await checkoutOverlayFrame(page).getByRole("button", { name: "Close" }).click()
}

export const payOnPolarCheckoutPage = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Pay" }).click()
}
