import { describe, expect, it } from "vite-plus/test"

import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { CORE_PRICE_IN_HOURS, ILLUSTRATIVE_HOURLY_RATE, TIER_FEATURES, TIER_PRICES } from "~/src/data/marketing"
import { FEATURE_STATUS } from "~/src/data/navigation.constants"

import pricing from "~/messages/en-US/components.custom.pricing.json"

describe("marketing data", () => {
  it("says the Core price is under the whole number of hours the landing page names, and not a full hour less", () => {
    expect(TIER_PRICES[LICENSE_TIER.CORE]).toBeLessThan(CORE_PRICE_IN_HOURS * ILLUSTRATIVE_HOURLY_RATE)
    expect(TIER_PRICES[LICENSE_TIER.CORE]).toBeGreaterThan((CORE_PRICE_IN_HOURS - 1) * ILLUSTRATIVE_HOURLY_RATE)
  })

  it("lists each tier's features once, with at least one available now and a label in English", () => {
    for (const tier of LICENSE_TIERS) {
      const features: readonly { readonly id: string; readonly status: string }[] = TIER_FEATURES[tier]
      const labels: Readonly<Record<string, string>> = pricing.tiers[tier].features

      expect(new Set(features.map(({ id }) => id)).size).toBe(features.length)
      expect(features.some(({ status }) => status === FEATURE_STATUS.AVAILABLE)).toBe(true)
      expect(Object.keys(labels).toSorted()).toStrictEqual(features.map(({ id }) => id).toSorted())
    }
  })
})
