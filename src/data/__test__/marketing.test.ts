import { describe, expect, it, vi } from "vite-plus/test"

import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { NONE } from "~/src/data/cli"
import {
  ANGULARPROJECTS_ACCESS,
  ANGULARPROJECTS_FACTS,
  ANGULARPROJECTS_URL,
  CORE_PRICE_IN_HOURS,
  COURSE_PLATFORM_VALUES,
  ILLUSTRATIVE_HOURLY_RATE,
  PRODUCT_CASES,
  PRODUCT_CASE_STATUS,
  REACTPROJECTS_ACCESS,
  REACTPROJECTS_FACTS,
  REACTPROJECTS_URL,
  TIER_FEATURES,
  TIER_PRICES,
} from "~/src/data/marketing"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import pricing from "~/messages/en-US/components.custom.pricing.json"
import landing from "~/messages/en-US/pages.landing.json"

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

  it("takes the status of Complete's course platform access from each platform's own access status", () => {
    const statuses = Object.fromEntries(TIER_FEATURES[LICENSE_TIER.COMPLETE].map(({ id, status }) => [id, status]))

    expect(statuses).toMatchObject({ angularprojects: ANGULARPROJECTS_ACCESS, reactprojects: REACTPROJECTS_ACCESS })
    expect(COURSE_PLATFORM_VALUES).toMatchObject({
      angularprojectsAccess: ANGULARPROJECTS_ACCESS,
      reactprojectsAccess: REACTPROJECTS_ACCESS,
    })
  })

  it("names each course platform by the host of its one URL", () => {
    expect(REACTPROJECTS_FACTS.reactprojects).toBe(new URL(REACTPROJECTS_URL).host)
    expect(ANGULARPROJECTS_FACTS.angularprojects).toBe(new URL(ANGULARPROJECTS_URL).host)
  })

  it("lists each product case once, with copy in English, and links only the ones whose waitlist is open to their own host", () => {
    const linked = PRODUCT_CASES.flatMap((product) => (product.status === PRODUCT_CASE_STATUS.WAITLIST ? [product] : []))

    expect(new Set(PRODUCT_CASES.map(({ name }) => name)).size).toBe(PRODUCT_CASES.length)
    expect(PRODUCT_CASES.map(({ id }) => id)).toStrictEqual(Object.keys(landing.cases.items))
    expect(Object.keys(landing.cases.status).toSorted()).toStrictEqual(Object.values(PRODUCT_CASE_STATUS).toSorted())
    for (const { name, url } of linked) {
      expect(new URL(url).host).toBe(name)
    }
  })
})
