import { describe, expect, it, vi } from "vite-plus/test"

import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { CORE_PRICE_IN_HOURS, ILLUSTRATIVE_HOURLY_RATE, TIER_FEATURES, TIER_PRICES } from "~/src/data/marketing"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import pricing from "~/messages/en-US/components.custom.pricing.json"

const coreStatuses = async (generation: FeatureStatus): Promise<Record<string, FeatureStatus>> => {
  vi.resetModules()
  vi.doMock(import("~/src/data/cli"), async (importOriginal) => ({ ...(await importOriginal()), CLI_GENERATION: generation }))
  const marketing = await import("~/src/data/marketing")
  vi.doUnmock(import("~/src/data/cli"))

  return Object.fromEntries(marketing.TIER_FEATURES[LICENSE_TIER.CORE].map(({ id, status }) => [id, status]))
}

const generatedBy = (generation: FeatureStatus): Record<string, FeatureStatus> => ({
  cli: FEATURE_STATUS.AVAILABLE,
  projects: generation,
  providers: generation,
  source: generation,
  tests: generation,
  updates: FEATURE_STATUS.AVAILABLE,
})

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

  it("takes the status of the Core features that project generation delivers from the CLI's generation status", async () => {
    expect(await coreStatuses(FEATURE_STATUS.AVAILABLE)).toStrictEqual(generatedBy(FEATURE_STATUS.AVAILABLE))
    expect(await coreStatuses(FEATURE_STATUS.ARRIVING)).toStrictEqual(generatedBy(FEATURE_STATUS.ARRIVING))
  })
})
