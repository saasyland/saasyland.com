import { existsSync, readFileSync } from "node:fs"
import process from "node:process"
import { parseEnv } from "node:util"

import * as zod from "zod"

import { POLAR_SERVER } from "../../src/integrations/polar/polar.constants"
import { LICENSE_TIER, type LicenseTier } from "../../src/modules/license/license.constants"

const ENV_FILE = new URL("../../.env.preview", import.meta.url)

const settingValue = zod.string().trim().nonempty()

const settingsSchema = zod.object({
  POLAR_ACCESS_TOKEN: settingValue,
  POLAR_PRODUCT_ID_AGENCY: settingValue,
  POLAR_PRODUCT_ID_COMPLETE: settingValue,
  POLAR_PRODUCT_ID_CORE: settingValue,
  POLAR_SERVER: zod.literal(POLAR_SERVER.SANDBOX),
  RESEND_API_KEY: settingValue,
})

const fileValues = existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, "utf8")) : {}

const parsed = settingsSchema.safeParse({ ...fileValues, ...process.env })

if (!parsed.success) {
  throw new Error(
    `Set ${parsed.error.issues.map(({ path }) => path.join(".")).join(", ")} in .env.preview or the environment to run the journey.`,
  )
}

export const JOURNEY_SETTINGS = parsed.data

export const PRODUCT_IDS = {
  [LICENSE_TIER.AGENCY]: JOURNEY_SETTINGS.POLAR_PRODUCT_ID_AGENCY,
  [LICENSE_TIER.COMPLETE]: JOURNEY_SETTINGS.POLAR_PRODUCT_ID_COMPLETE,
  [LICENSE_TIER.CORE]: JOURNEY_SETTINGS.POLAR_PRODUCT_ID_CORE,
} as const satisfies Record<LicenseTier, string>
