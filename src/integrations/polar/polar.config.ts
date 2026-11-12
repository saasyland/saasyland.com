import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { createPolarCore } from "@polar-sh/sdk/2026-10"
import { createDiscountsService } from "@polar-sh/sdk/2026-10/services/discounts"
import { createLicenseKeysService } from "@polar-sh/sdk/2026-10/services/license_keys"
import { createOrdersService } from "@polar-sh/sdk/2026-10/services/orders"

export const polarCore = createPolarCore({ accessToken: env.POLAR_ACCESS_TOKEN, environment: env.POLAR_SERVER })

export const polar = {
  discounts: createDiscountsService(polarCore),
  licenseKeys: createLicenseKeysService(polarCore),
  orders: createOrdersService(polarCore),
}
