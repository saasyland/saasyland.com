import { globSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { AREA, AREAS, AREA_SCENARIO, AREA_SCENARIOS } from "~/scripts/areas"
import { areaRemoval, isBarrel, isInFootprint, isMissingModule, prunedBarrel, removedAreas } from "~/scripts/check-areas"

const ROUTES_BARREL = "src/data/routes.entries.ts"
const CORE_ROUTES = "src/data/core.routes.ts"
const COURSES_ROUTES = "src/data/courses.routes.ts"
const CORE_EXPORT = 'export { HOME } from "~/src/data/core.routes"\n'
const COURSES_EXPORT = 'export {\n  ADMIN_COURSES,\n  COURSES,\n} from "./courses.routes.ts"\n'
const SOURCES: Readonly<Record<string, string>> = {
  [CORE_ROUTES]: 'export const HOME = "/"\n',
  [COURSES_ROUTES]: 'export const COURSES = "/courses"\n',
  [ROUTES_BARREL]: `${CORE_EXPORT}${COURSES_EXPORT}`,
}

const read = (file: string): string => SOURCES[file] ?? ""

describe("removedAreas", () => {
  it("removes every area that requires a removed one, directly or through another, and sorts them", () => {
    expect(removedAreas([AREA.LEGAL])).toStrictEqual([AREA.LEGAL, AREA.LICENSE])
    expect(removedAreas([AREA.POLAR])).toStrictEqual([AREA.BILLING, AREA.LICENSE, AREA.PAYMENTS, AREA.POLAR, AREA.PRODUCTS])
  })

  it("removes only the areas asked for when nothing requires them", () => {
    expect(removedAreas([AREA.NEWSLETTER, AREA.AFFILIATES])).toStrictEqual([AREA.AFFILIATES, AREA.NEWSLETTER])
  })
})

describe("isInFootprint", () => {
  it("matches a file against the globs of the removed areas only", () => {
    expect(isInFootprint(COURSES_ROUTES, [AREA.COURSES])).toBe(true)
    expect(isInFootprint(COURSES_ROUTES, [AREA.NEWSLETTER])).toBe(false)
    expect(isInFootprint(CORE_ROUTES, [AREA.COURSES])).toBe(false)
  })
})

describe("isMissingModule", () => {
  const files = new Set([CORE_ROUTES])

  it("resolves the root alias and relative paths, with or without the extension", () => {
    expect(isMissingModule(ROUTES_BARREL, "~/src/data/core.routes", files)).toBe(false)
    expect(isMissingModule(ROUTES_BARREL, "./core.routes.ts", files)).toBe(false)
    expect(isMissingModule(ROUTES_BARREL, "./courses.routes", files)).toBe(true)
  })

  it("never calls a package missing", () => {
    expect(isMissingModule(ROUTES_BARREL, "zod", files)).toBe(false)
  })
})

describe("isBarrel", () => {
  it("is a file of re-exports only, on one line or several", () => {
    expect(isBarrel(read(ROUTES_BARREL))).toBe(true)
  })

  it("is not a file with any other statement, or an empty file", () => {
    expect(isBarrel(`${CORE_EXPORT}export const AREA = "courses"\n`)).toBe(false)
    expect(isBarrel("")).toBe(false)
  })
})

describe("prunedBarrel", () => {
  it("drops the re-exports of modules that are gone and keeps the others", () => {
    expect(prunedBarrel(ROUTES_BARREL, read(ROUTES_BARREL), new Set([CORE_ROUTES]))).toBe(CORE_EXPORT)
  })
})

describe("areaRemoval", () => {
  it("keeps the files outside the footprints and prunes the barrels that named a removed module", () => {
    const removal = areaRemoval([AREA.COURSES], [CORE_ROUTES, COURSES_ROUTES, ROUTES_BARREL], read)

    expect(removal.removed).toStrictEqual(removedAreas([AREA.COURSES]))
    expect(removal.kept).toStrictEqual([CORE_ROUTES, ROUTES_BARREL])
    expect(removal.barrels).toStrictEqual(new Map([[ROUTES_BARREL, CORE_EXPORT]]))
  })

  it("leaves a barrel alone when every module it names stays", () => {
    expect(areaRemoval([AREA.NEWSLETTER], [CORE_ROUTES, COURSES_ROUTES, ROUTES_BARREL], read).barrels.size).toBe(0)
  })
})

describe("the area footprints in scripts/areas.ts", () => {
  it.each(Object.entries(AREAS).flatMap(([area, { files }]) => files.map((glob) => ({ area, glob }))))(
    "$area: $glob matches a file of the project",
    ({ glob }) => {
      expect(globSync(glob)).not.toStrictEqual([])
    },
  )

  it("leaves out every website-only area in each scenario, which the templates never generate", () => {
    for (const areas of Object.values(AREA_SCENARIOS)) {
      expect(areas).toEqual(expect.arrayContaining([...AREA_SCENARIOS[AREA_SCENARIO.WEBSITE_ONLY]]))
    }
  })
})
