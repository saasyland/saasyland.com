import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"
import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"
import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"

import { LICENSE_BROWSER } from "~/src/areas/license"
import { redirectTierSchema } from "~/src/data/license"

import { SignUpOrderSummaryPending } from "~/src/presentation/components/custom/app/license-pending"

import * as ROUTES from "~/src/routes"

const USER_ID = "grace"
const LESSON_ID = "lesson-billing"

const tierHref = (path: string, tier: string): string => `${path}?${new URLSearchParams({ tier }).toString()}`

afterEach(() => {
  vi.restoreAllMocks()
})

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

describe("the licence area's sign-up intro", () => {
  const [intro] = LICENSE_BROWSER.signUpIntros

  it("adds the order summary with its skeleton", () => {
    expect(LICENSE_BROWSER.signUpIntros).toStrictEqual([
      expect.objectContaining({ Pending: SignUpOrderSummaryPending, key: "order-summary" }),
    ])
  })

  it.each([
    [tierHref(ROUTES.APP, LICENSE_TIER.COMPLETE), true],
    [tierHref(`/de-DE${ROUTES.APP}`, LICENSE_TIER.CORE), true],
    [tierHref(ROUTES.APP, "enterprise"), false],
    [ROUTES.APP, false],
    [undefined, false],
  ])("applies to %s: %s", (redirect, applies) => {
    expect(intro.appliesTo(redirect)).toBe(applies)
  })
})

describe("the licence area's account deletion notice", () => {
  it("loads the licence that the notice reads", async () => {
    const queryClient = new QueryClient()
    vi.spyOn(currentLicenseQuery, "queryFn").mockResolvedValue({ license: undefined })

    await Promise.all(LICENSE_BROWSER.accountDeletion.map(({ load }) => load({ queryClient })))

    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toStrictEqual({ license: undefined })
  })
})

describe("the licence area's cards on a user's profile", () => {
  it("loads the licence, its machines in Polar and the withdrawal statements of the user whose profile is open", async () => {
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query").mockResolvedValue({ license: undefined })

    await Promise.all(LICENSE_BROWSER.userProfile.map(({ load }) => load({ queryClient, userId: USER_ID })))

    expect(query.mock.calls.map(([options]) => options.queryKey)).toStrictEqual([
      userLicenseQuery({ userId: USER_ID }).queryKey,
      userActivationsQuery({ userIds: [USER_ID] }).queryKey,
      userWithdrawalsQuery({ userId: USER_ID }).queryKey,
    ])
  })

  it("also loads the title of the first paid lesson the licence opened", async () => {
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query").mockResolvedValue({ license: { openedLessonId: LESSON_ID } })
    const [licence] = LICENSE_BROWSER.userProfile

    await licence.load({ queryClient, userId: USER_ID })

    expect(query.mock.calls.map(([options]) => options.queryKey)).toStrictEqual([
      userLicenseQuery({ userId: USER_ID }).queryKey,
      userActivationsQuery({ userIds: [USER_ID] }).queryKey,
      lessonTitleQuery({ lessonId: LESSON_ID }).queryKey,
    ])
  })
})
