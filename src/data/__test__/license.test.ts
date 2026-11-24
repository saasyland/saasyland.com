import { describe, expect, it } from "vite-plus/test"

import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { redirectTierSchema } from "~/src/data/license"

import * as ROUTES from "~/src/routes"

const tierHref = (path: string, tier: string): string => `${path}?${new URLSearchParams({ tier }).toString()}`

describe("the tier a sign-up redirect carries", () => {
  it.each(LICENSE_TIERS)("reads %s from a redirect to the customer app", (tier) => {
    expect(redirectTierSchema.parse(tierHref(ROUTES.APP, tier))).toBe(tier)
  })

  it.each([
    ["the licence page", tierHref(ROUTES.APP_LICENSE, LICENSE_TIER.CORE), LICENSE_TIER.CORE],
    ["a locale-prefixed app", tierHref(`/pl-PL${ROUTES.APP}`, LICENSE_TIER.AGENCY), LICENSE_TIER.AGENCY],
    ["a locale-prefixed licence page", tierHref(`/ja-JP${ROUTES.APP_LICENSE}`, LICENSE_TIER.COMPLETE), LICENSE_TIER.COMPLETE],
    ["a redirect with other params", `${tierHref(ROUTES.APP, LICENSE_TIER.COMPLETE)}&source=pricing#offer`, LICENSE_TIER.COMPLETE],
  ])("reads the tier from %s", (_label, redirect, tier) => {
    expect(redirectTierSchema.parse(redirect)).toBe(tier)
  })

  it.each([
    ["no redirect", undefined],
    ["a redirect without a tier", ROUTES.APP],
    ["an empty tier", tierHref(ROUTES.APP, "")],
    ["an unknown tier", tierHref(ROUTES.APP, "enterprise")],
    ["a tier in another case", tierHref(ROUTES.APP, LICENSE_TIER.COMPLETE.toUpperCase())],
    ["a page that does not sell a tier", tierHref(ROUTES.APP_SETTINGS, LICENSE_TIER.COMPLETE)],
    ["an unsupported locale prefix", tierHref(`/xx-XX${ROUTES.APP}`, LICENSE_TIER.COMPLETE)],
    ["a relative path", tierHref(ROUTES.APP.slice(1), LICENSE_TIER.COMPLETE)],
    ["a protocol-relative URL", tierHref(`//evil.example${ROUTES.APP}`, LICENSE_TIER.COMPLETE)],
    ["an absolute URL", tierHref(`https://evil.example${ROUTES.APP}`, LICENSE_TIER.COMPLETE)],
  ])("finds no tier in %s", (_label, redirect) => {
    expect(redirectTierSchema.safeParse(redirect).success).toBe(false)
  })
})
