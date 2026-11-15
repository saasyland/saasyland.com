import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type { LicenseOfferSection } from "~/src/data/license-offer"
import * as AREA_LICENSE_OFFER from "~/src/data/license-offer.entries"

const section = (key: string): LicenseOfferSection => ({
  Pending: () => <span />,
  Section: () => <span />,
  key,
  load: () => Promise.resolve(),
})

const composeWith = (areas: Readonly<Record<string, readonly LicenseOfferSection[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/license-offer.entries", () => areas)

  return import("~/src/data/license-offer")
}

afterEach(() => {
  vi.doUnmock("~/src/data/license-offer.entries")
})

describe("licence offer composition", () => {
  it("adds the sections of every area once, each with its own key", async () => {
    const { LICENSE_OFFER_SECTIONS } = await import("~/src/data/license-offer")
    const areas: Readonly<Record<string, readonly LicenseOfferSection[]>> = AREA_LICENSE_OFFER
    const declared = Object.values(areas).flat()

    expect(LICENSE_OFFER_SECTIONS).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("orders the sections by area", async () => {
    const first = section("first")
    const second = section("second")
    const third = section("third")

    const { LICENSE_OFFER_SECTIONS } = await composeWith({ FIRST_LICENSE_OFFER: [first, second], SECOND_LICENSE_OFFER: [third] })

    expect(LICENSE_OFFER_SECTIONS).toStrictEqual([first, second, third])
  })

  it("ends the offer with the tiers when no area adds a section", async () => {
    const { LICENSE_OFFER_SECTIONS } = await composeWith({})

    expect(LICENSE_OFFER_SECTIONS).toStrictEqual([])
  })
})
