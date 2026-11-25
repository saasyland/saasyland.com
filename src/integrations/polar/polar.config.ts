import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { createPolarCore } from "@polar-sh/sdk/2026-10"
import { createCheckoutsService } from "@polar-sh/sdk/2026-10/services/checkouts"
import { createLicenseKeysService } from "@polar-sh/sdk/2026-10/services/license_keys"
import { createOrdersService } from "@polar-sh/sdk/2026-10/services/orders"
import { createProductsService } from "@polar-sh/sdk/2026-10/services/products"

export const polarCore = createPolarCore({ accessToken: env.POLAR_ACCESS_TOKEN, environment: env.POLAR_SERVER })

export const polar = {
  checkouts: createCheckoutsService(polarCore),
  licenseKeys: createLicenseKeysService(polarCore),
  orders: createOrdersService(polarCore),
  products: createProductsService(polarCore),
}
