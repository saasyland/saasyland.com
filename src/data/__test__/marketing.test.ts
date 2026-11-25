import { describe, expect, it } from "vite-plus/test"

import {
  ANGULARPROJECTS_ACCESS,
  ANGULARPROJECTS_FACTS,
  ANGULARPROJECTS_URL,
  COURSE_PLATFORM_VALUES,
  PRODUCT_CASES,
  PRODUCT_CASE_STATUS,
  REACTPROJECTS_ACCESS,
  REACTPROJECTS_FACTS,
  REACTPROJECTS_URL,
  TEAM_SEATS_ACCESS,
} from "~/src/data/marketing"

import landing from "~/messages/en-US/pages.landing.json"

describe("marketing data", () => {
  it("spreads each course platform's facts into the values the copy reads", () => {
    expect(COURSE_PLATFORM_VALUES).toStrictEqual({ ...REACTPROJECTS_FACTS, ...ANGULARPROJECTS_FACTS, teamSeatsAccess: TEAM_SEATS_ACCESS })
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
