import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

const registerWith = async (program: FeatureStatus) => {
  vi.resetModules()
  vi.doMock(import("~/src/data/affiliates"), async (importOriginal) => ({ ...(await importOriginal()), AFFILIATE_PROGRAM: program }))
  const [{ AFFILIATES_ROOT_COMPONENTS }, { AffiliateReferral }] = await Promise.all([
    import("~/src/data/affiliates.root"),
    import("~/src/presentation/components/custom/affiliate-referral"),
  ])

  return { AffiliateReferral, components: AFFILIATES_ROOT_COMPONENTS }
}

afterEach(() => {
  vi.doUnmock("~/src/data/affiliates")
})

describe("affiliates root components", () => {
  it("mounts the referral tracking beside the outlet while the affiliate programme is open", async () => {
    const { AffiliateReferral, components } = await registerWith(FEATURE_STATUS.AVAILABLE)

    expect(components).toStrictEqual([{ component: AffiliateReferral, key: "affiliateReferral" }])
  })

  it("mounts nothing while the programme is arriving, so no visit loads Affonso's script", async () => {
    const { components } = await registerWith(FEATURE_STATUS.ARRIVING)

    expect(components).toStrictEqual([])
  })
})
