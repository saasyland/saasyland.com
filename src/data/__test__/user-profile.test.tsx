import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"
import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"

import { AUTH_USER_PROFILE } from "~/src/data/auth.user-profile"
import { LICENSE_USER_PROFILE } from "~/src/data/license.user-profile"
import { USER_PROFILE_SECTIONS, type UserProfileSection } from "~/src/data/user-profile"
import * as AREA_USER_PROFILE from "~/src/data/user-profile.entries"

const USER_ID = "grace"

const section = (key: string): UserProfileSection => ({
  Pending: () => <span />,
  Section: () => <span />,
  key,
  load: () => Promise.resolve(),
})

const composeWith = (areas: Readonly<Record<string, readonly UserProfileSection[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/user-profile.entries", () => areas)

  return import("~/src/data/user-profile")
}

afterEach(() => {
  vi.doUnmock("~/src/data/user-profile.entries")
  vi.restoreAllMocks()
})

describe("admin user profile composition", () => {
  it("adds the sections of every area once, each with its own key", () => {
    const declared = Object.values(AREA_USER_PROFILE).flat()

    expect(USER_PROFILE_SECTIONS).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("orders the sections by area", async () => {
    const first = section("first")
    const second = section("second")
    const third = section("third")

    const profile = await composeWith({ FIRST_USER_PROFILE: [first, second], SECOND_USER_PROFILE: [third] })

    expect(profile.USER_PROFILE_SECTIONS).toStrictEqual([first, second, third])
  })

  it("leaves the profile with the auth area's own cards when no area adds a section", async () => {
    const profile = await composeWith({ AUTH_USER_PROFILE })

    expect(profile.USER_PROFILE_SECTIONS).toStrictEqual([])
  })

  it("loads the licence and the withdrawal statements of the user whose profile is open", async () => {
    const queryClient = new QueryClient()
    const query = vi.spyOn(queryClient, "query").mockResolvedValue({ license: undefined })

    await Promise.all(LICENSE_USER_PROFILE.map(({ load }) => load({ queryClient, userId: USER_ID })))

    expect(query.mock.calls.map(([options]) => options.queryKey)).toStrictEqual([
      userLicenseQuery({ userId: USER_ID }).queryKey,
      userWithdrawalsQuery({ userId: USER_ID }).queryKey,
    ])
  })
})
