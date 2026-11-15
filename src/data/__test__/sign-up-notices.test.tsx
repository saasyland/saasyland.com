import { describe, expect, it, vi } from "vite-plus/test"

import { AUTH_SIGN_UP_NOTICES } from "~/src/data/auth.sign-up-notices"
import { SIGN_UP_NOTICES, type SignUpNotice } from "~/src/data/sign-up-notices"
import * as AREA_SIGN_UP_NOTICES from "~/src/data/sign-up-notices.entries"

const notice = (key: string): SignUpNotice => ({ Notice: () => <span />, Pending: () => <span />, key })

const composeWith = (areas: Readonly<Record<string, readonly SignUpNotice[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/sign-up-notices.entries", () => areas)

  return import("~/src/data/sign-up-notices")
}

describe("sign-up notices", () => {
  it("adds the notices of every area once, each with its own key", () => {
    const areas: Readonly<Record<string, readonly SignUpNotice[]>> = AREA_SIGN_UP_NOTICES
    const declared = Object.values(areas).flat()

    expect(SIGN_UP_NOTICES).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("orders the notices by area", async () => {
    const first = notice("first")
    const second = notice("second")

    const notices = await composeWith({ FIRST_SIGN_UP_NOTICES: [first], SECOND_SIGN_UP_NOTICES: [second] })

    expect(notices.SIGN_UP_NOTICES).toStrictEqual([first, second])
    vi.doUnmock("~/src/data/sign-up-notices.entries")
  })

  it("ends the sign-up form with nothing when no area adds a notice", async () => {
    const notices = await composeWith({ AUTH_SIGN_UP_NOTICES })

    expect(notices.SIGN_UP_NOTICES).toStrictEqual([])
    vi.doUnmock("~/src/data/sign-up-notices.entries")
  })
})
