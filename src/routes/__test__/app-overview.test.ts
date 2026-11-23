import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { Route } from "~/src/routes/app.index"

import { BROWSER_AREAS } from "~/src/areas/browser"

const SAMPLE_PARAM = "sample"

const searchSchemaOf = (route: typeof Route) => zod.instanceof(zod.ZodObject).parse(route.options.validateSearch)

const overviewWith = (areas: Readonly<Record<string, unknown>>) => {
  vi.resetModules()
  vi.doMock("~/src/areas/browser.entries", () => areas)

  return import("~/src/routes/app.index")
}

afterEach(() => {
  vi.doUnmock("~/src/areas/browser.entries")
})

describe("the customer app overview's search params", () => {
  it("validates each search param with the schema of the area that reads it", () => {
    expect(Object.entries(searchSchemaOf(Route).shape)).toStrictEqual(
      BROWSER_AREAS.flatMap(({ appOverviewSearch = {} }) => Object.entries(appOverviewSearch)),
    )
  })

  it("reads no search param when no area adds one", async () => {
    const overview = await overviewWith({ CORE_BROWSER: { name: "core" } })

    expect(searchSchemaOf(overview.Route).parse({ [SAMPLE_PARAM]: SAMPLE_PARAM })).toStrictEqual({})
  })

  it("refuses two areas that read the same search param", async () => {
    await expect(
      overviewWith({
        FIRST_BROWSER: { appOverviewSearch: { [SAMPLE_PARAM]: zod.string() }, name: "first" },
        SECOND_BROWSER: { appOverviewSearch: { [SAMPLE_PARAM]: zod.string() }, name: "second" },
      }),
    ).rejects.toThrow("Two areas read the same search param on the overview.")
  })
})
