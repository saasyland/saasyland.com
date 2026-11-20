import { describe, expect, it, vi } from "vite-plus/test"

import { AUTH_SIGN_UP_INTROS } from "~/src/data/auth.sign-up-intros"
import { SIGN_UP_INTROS, type SignUpIntro, findSignUpIntro } from "~/src/data/sign-up-intros"
import * as AREA_SIGN_UP_INTROS from "~/src/data/sign-up-intros.entries"

const PRICED_REDIRECT = "/priced"

const intro = (key: string, appliesTo: SignUpIntro["appliesTo"]): SignUpIntro => ({
  Intro: () => <span />,
  Pending: () => <span />,
  appliesTo,
  key,
})

const composeWith = (areas: Readonly<Record<string, readonly SignUpIntro[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/sign-up-intros.entries", () => areas)

  return import("~/src/data/sign-up-intros")
}

describe("sign-up intros", () => {
  it("adds the intros of every area once, each with its own key", () => {
    const areas: Readonly<Record<string, readonly SignUpIntro[]>> = AREA_SIGN_UP_INTROS
    const declared = Object.values(areas).flat()

    expect(SIGN_UP_INTROS).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("shows the first intro, in area order, that applies to the redirect", async () => {
    const declined = intro("declined", () => false)
    const first = intro("first", (redirect) => redirect === PRICED_REDIRECT)
    const second = intro("second", () => true)

    const intros = await composeWith({ FIRST_SIGN_UP_INTROS: [declined, first], SECOND_SIGN_UP_INTROS: [second] })

    expect(intros.findSignUpIntro(PRICED_REDIRECT)).toBe(first)
    expect(intros.findSignUpIntro(undefined)).toBe(second)
    vi.doUnmock("~/src/data/sign-up-intros.entries")
  })

  it("keeps the default description when no area adds an intro", async () => {
    const intros = await composeWith({ AUTH_SIGN_UP_INTROS })

    expect(intros.SIGN_UP_INTROS).toStrictEqual([])
    expect(intros.findSignUpIntro(PRICED_REDIRECT)).toBeUndefined()
    vi.doUnmock("~/src/data/sign-up-intros.entries")
  })

  it("keeps the default description without a redirect", () => {
    expect(findSignUpIntro(undefined)).toBeUndefined()
  })
})
