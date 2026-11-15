import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { APP_OVERVIEW_SECTIONS, type AppOverviewArea, type AppOverviewSection, appOverviewSearchSchema } from "~/src/data/app-overview"
import * as AREA_APP_OVERVIEW from "~/src/data/app-overview.entries"
import { AUTH_APP_OVERVIEW } from "~/src/data/auth.app-overview"

const AREAS: readonly AppOverviewArea[] = Object.values(AREA_APP_OVERVIEW)

const SAMPLE_PARAM = "sample"

const section = (key: string): AppOverviewSection => ({
  Pending: () => <span />,
  Section: () => <span />,
  key,
  load: () => Promise.resolve(),
})

const composeWith = (areas: Readonly<Record<string, AppOverviewArea>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/app-overview.entries", () => areas)

  return import("~/src/data/app-overview")
}

afterEach(() => {
  vi.doUnmock("~/src/data/app-overview.entries")
})

describe("customer app overview composition", () => {
  it("adds the sections of every area once, each with its own key", () => {
    const declared = AREAS.flatMap(({ sections }) => sections)

    expect(APP_OVERVIEW_SECTIONS).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("validates each search param with the schema of the area that reads it", () => {
    expect(Object.entries(appOverviewSearchSchema.shape)).toStrictEqual(AREAS.flatMap(({ search }) => Object.entries(search)))
  })

  it("orders the sections by area", async () => {
    const first = section("first")
    const second = section("second")
    const third = section("third")

    const overview = await composeWith({
      FIRST_APP_OVERVIEW: { search: {}, sections: [first, second] },
      SECOND_APP_OVERVIEW: { search: {}, sections: [third] },
    })

    expect(overview.APP_OVERVIEW_SECTIONS).toStrictEqual([first, second, third])
  })

  it("leaves the overview without sections or search params when no area adds to it", async () => {
    const overview = await composeWith({ AUTH_APP_OVERVIEW })

    expect(overview.APP_OVERVIEW_SECTIONS).toStrictEqual([])
    expect(overview.appOverviewSearchSchema.parse({ [SAMPLE_PARAM]: SAMPLE_PARAM })).toStrictEqual({})
  })

  it("refuses two areas that read the same search param", async () => {
    const area = { search: { [SAMPLE_PARAM]: zod.string() }, sections: [] }

    await expect(
      composeWith({ FIRST_APP_OVERVIEW: area, SECOND_APP_OVERVIEW: { ...area, search: { [SAMPLE_PARAM]: zod.string() } } }),
    ).rejects.toThrow("Two areas read the same search param on the overview.")
  })
})
