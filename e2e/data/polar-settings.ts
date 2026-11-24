import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

import * as zod from "zod"

import { POLAR_SERVER } from "../../src/integrations/polar/polar.constants"
import { LICENSE_TIER, type LicenseTier } from "../../src/modules/license/license.constants"

const testPolarSchema = zod.object({
  POLAR_ORGANIZATION_ID: zod.string(),
  POLAR_PRODUCT_ID_AGENCY: zod.string(),
  POLAR_PRODUCT_ID_COMPLETE: zod.string(),
  POLAR_PRODUCT_ID_CORE: zod.string(),
  POLAR_SERVER: zod.enum(POLAR_SERVER),
  POLAR_WEBHOOK_SECRET: zod.string(),
})

export const TEST_POLAR = testPolarSchema.parse(parseEnv(readFileSync(new URL("../../.env.test", import.meta.url), "utf8")))

export const TEST_PRODUCT_IDS: Readonly<Record<LicenseTier, string>> = {
  [LICENSE_TIER.AGENCY]: TEST_POLAR.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: TEST_POLAR.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: TEST_POLAR.POLAR_PRODUCT_ID_CORE,
}
