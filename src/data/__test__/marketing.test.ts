import { describe, expect, it, vi } from "vite-plus/test"

import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { NONE } from "~/src/data/cli"
import { CORE_PRICE_IN_HOURS, ILLUSTRATIVE_HOURLY_RATE, TIER_FEATURES, TIER_PRICES } from "~/src/data/marketing"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import pricing from "~/messages/en-US/components.custom.pricing.json"

const coreStatuses = async ({
  billingProviders,
  generation,
}: Readonly<{ billingProviders: boolean; generation: FeatureStatus }>): Promise<Record<string, FeatureStatus>> => {
  vi.resetModules()
  vi.doMock(import("~/src/data/cli"), async (importOriginal) => {
    const actual = await importOriginal()
    const everyOption = Object.fromEntries(actual.CLI_CHOICES.map((choice) => [choice.id, choice.options.map((option) => option.id)]))
    const generated = billingProviders ? everyOption : { billing: [NONE] }

    return {
      ...actual,
      CLI_GENERATION: generation,
      CLI_TEMPLATE_SUPPORT: { ...actual.CLI_TEMPLATE_SUPPORT, choices: { ...actual.CLI_TEMPLATE_SUPPORT.choices, ...generated } },
    }
  })
  const marketing = await import("~/src/data/marketing")
  vi.doUnmock(import("~/src/data/cli"))

  return Object.fromEntries(marketing.TIER_FEATURES[LICENSE_TIER.CORE].map(({ id, status }) => [id, status]))
}

const generatedBy = ({
  billing,
  generation,
}: Readonly<{ billing: FeatureStatus; generation: FeatureStatus }>): Record<string, FeatureStatus> => ({
  billing,
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
    for (const generation of [FEATURE_STATUS.AVAILABLE, FEATURE_STATUS.ARRIVING]) {
      expect(await coreStatuses({ billingProviders: true, generation })).toStrictEqual(generatedBy({ billing: generation, generation }))
    }
  })

  it("keeps billing on the Core card arriving while the templates generate no billing provider", async () => {
    for (const generation of [FEATURE_STATUS.AVAILABLE, FEATURE_STATUS.ARRIVING]) {
      expect(await coreStatuses({ billingProviders: false, generation })).toStrictEqual(
        generatedBy({ billing: FEATURE_STATUS.ARRIVING, generation }),
      )
    }
  })
})
