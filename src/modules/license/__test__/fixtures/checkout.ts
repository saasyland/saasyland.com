import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { polarCheckouts } from "~/src/platform/testing/mocks/polar"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import type { LicenseTier } from "~/src/modules/license/license.constants"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

export const RETURN_PATH = "/pl-PL/app/license?tier=complete"

export interface Buyer {
  readonly headers: Headers
  readonly userId: string
}

export interface BrowserState {
  readonly cookie?: string
  readonly country?: string
}

export const actAs = ({ headers }: Buyer, { cookie, country = "US" }: BrowserState = {}): void => {
  const requestHeaders = new Headers(headers)
  requestHeaders.set(COUNTRY_HEADER, country)
  if (cookie !== undefined) {
    requestHeaders.set("cookie", `${requestHeaders.get("cookie") ?? ""}; ${cookie}`)
  }
  vi.mocked(getRequest).mockReturnValue(new Request(`${TEST_APP_URL}/_serverFn/license`, { headers: requestHeaders, method: "POST" }))
}

export const startCheckout = async (
  buyer: Buyer,
  {
    locale = "en-US",
    redirect,
    tier,
    ...browser
  }: BrowserState & { readonly locale?: SupportedLocale; readonly redirect?: string; readonly tier: LicenseTier },
): Promise<models.Checkout> => {
  actAs(buyer, browser)
  const started = await executeMutation(startCheckoutMutation, { locale, redirect, returnPath: RETURN_PATH, tier })
  if ("alreadyActive" in started) {
    throw new Error("The account already holds an active licence, so no checkout started")
  }
  const checkout = polarCheckouts().find(({ id, url }) => id === started.checkoutId && url === started.url)
  if (checkout === undefined) {
    throw new Error(`Polar holds no checkout ${started.checkoutId} at ${started.url}`)
  }
  return checkout
}
