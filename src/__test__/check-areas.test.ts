import { globSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { AREA, AREAS, AREA_SCENARIO, AREA_SCENARIOS } from "~/scripts/areas"
import { areaRemoval, isBarrel, isInFootprint, isMissingModule, prunedBarrel, removedAreas } from "~/scripts/check-areas"

const ROUTES_BARREL = "src/routes.ts"
const CORE_SHARED = "src/areas/core.shared.ts"
const COURSES_SHARED = "src/areas/courses.shared.ts"
const CORE_EXPORT = 'export { HOME } from "~/src/areas/core.shared"\n'
const COURSES_EXPORT = 'export {\n  ADMIN_COURSES,\n  COURSES,\n} from "./areas/courses.shared.ts"\n'
const SOURCES: Readonly<Record<string, string>> = {
  [CORE_SHARED]: 'export const HOME = "/"\n',
  [COURSES_SHARED]: 'export const COURSES = "/courses"\n',
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
    expect(isInFootprint(COURSES_SHARED, [AREA.COURSES])).toBe(true)
    expect(isInFootprint(COURSES_SHARED, [AREA.NEWSLETTER])).toBe(false)
    expect(isInFootprint(CORE_SHARED, [AREA.COURSES])).toBe(false)
  })
})

describe("isMissingModule", () => {
  const files = new Set([CORE_SHARED])

  it("resolves the root alias and relative paths, with or without the extension", () => {
    expect(isMissingModule(ROUTES_BARREL, "~/src/areas/core.shared", files)).toBe(false)
    expect(isMissingModule(ROUTES_BARREL, "./areas/core.shared.ts", files)).toBe(false)
    expect(isMissingModule(ROUTES_BARREL, "./areas/courses.shared", files)).toBe(true)
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
    expect(prunedBarrel(ROUTES_BARREL, read(ROUTES_BARREL), new Set([CORE_SHARED]))).toBe(CORE_EXPORT)
  })
})

describe("areaRemoval", () => {
  it("keeps the files outside the footprints and prunes the barrels that named a removed module", () => {
    const removal = areaRemoval([AREA.COURSES], [CORE_SHARED, COURSES_SHARED, ROUTES_BARREL], read)

    expect(removal.removed).toStrictEqual(removedAreas([AREA.COURSES]))
    expect(removal.kept).toStrictEqual([CORE_SHARED, ROUTES_BARREL])
    expect(removal.barrels).toStrictEqual(new Map([[ROUTES_BARREL, CORE_EXPORT]]))
  })

  it("leaves a barrel alone when every module it names stays", () => {
    expect(areaRemoval([AREA.NEWSLETTER], [CORE_SHARED, COURSES_SHARED, ROUTES_BARREL], read).barrels.size).toBe(0)
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
