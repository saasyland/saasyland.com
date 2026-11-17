import { LICENSE_STATUS, LICENSE_TIERS, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"

import { USER_LICENSE_DETAILS } from "~/src/data/license"

const TIER_LABELS = ["cta", "name", "period", "tagline", "whoFor"] as const

export const LICENSE_LABELS = [
  { keys: LICENSE_TIERS.flatMap((tier) => TIER_LABELS.map((label) => `${tier}.${label}`)), labels: "components.custom.pricing.tiers" },
  { keys: Object.values(LICENSE_STATUS), labels: "pages.license.statusCard" },
  { keys: Object.values(LICENSE_STATUS), labels: "pages.admin.users.license.status" },
  { keys: Object.values(REFUND_ELIGIBILITY), labels: "pages.admin.users.license.refund" },
  { keys: USER_LICENSE_DETAILS, labels: "pages.admin.users.license.details" },
]
