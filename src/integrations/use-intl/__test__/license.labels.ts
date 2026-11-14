import { LICENSE_STATUS, LICENSE_TIERS } from "~/src/modules/license/license.constants"

const TIER_LABELS = ["cta", "name", "period", "tagline", "whoFor"] as const

export const LICENSE_LABELS = [
  { keys: LICENSE_TIERS.flatMap((tier) => TIER_LABELS.map((label) => `${tier}.${label}`)), labels: "components.custom.pricing.tiers" },
  { keys: Object.values(LICENSE_STATUS), labels: "pages.app.overview.license" },
]
