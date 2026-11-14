import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { LICENSE_TIER } from "../../src/modules/license/license.constants"
import { TEST_CHECKOUT_ID } from "./licenses"
import type { PageEntry } from "./pages"

export const LICENSE_PAGES = [
  { path: "/app/license", role: ROLE_CODES.CUSTOMER },
  { path: `/app?tier=${LICENSE_TIER.COMPLETE}`, role: ROLE_CODES.CUSTOMER },
  { path: `/app/license?tier=${LICENSE_TIER.CORE}`, role: ROLE_CODES.CUSTOMER },
  { path: `/app?checkoutId=${TEST_CHECKOUT_ID}`, role: ROLE_CODES.CUSTOMER },
] as const satisfies readonly PageEntry[]
