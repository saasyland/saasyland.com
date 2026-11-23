import { describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

const AREA_KIND = {
  ACCESS: "access",
  BROWSER: "browser",
  LIVE: "live",
  NAVIGATION: "navigation",
  SHARED: "shared",
} as const

type AreaKind = (typeof AREA_KIND)[keyof typeof AREA_KIND]

const AREA_FILES = import.meta.glob<Readonly<Record<string, unknown>>>(["../*.ts", "!../*.entries.ts", "!../browser.ts", "!../shared.ts"])

const JOINS: Readonly<Record<AreaKind, Readonly<Record<string, () => Promise<unknown>>>>> = {
  [AREA_KIND.ACCESS]: import.meta.glob("../../integrations/better-auth/auth.access.ts"),
  [AREA_KIND.BROWSER]: import.meta.glob("../browser.ts"),
  [AREA_KIND.LIVE]: import.meta.glob("../../lib/deployment.ts"),
  [AREA_KIND.NAVIGATION]: import.meta.glob("../../data/navigation.ts"),
  [AREA_KIND.SHARED]: import.meta.glob("../shared.ts"),
}

const AREA_FILE = /^\.\.\/(?<area>[a-z-]+)(?:\.(?<kind>[a-z-]+))?\.ts$/u

const areaFileSchema = zod.object({ area: zod.string(), kind: zod.enum(AREA_KIND).default(AREA_KIND.BROWSER) })
const namedSchema = zod.object({ name: zod.string() })

const areaFileOf = (path: string) => areaFileSchema.parse(AREA_FILE.exec(path)?.groups)

const namesOf = (exports: Readonly<Record<string, unknown>>): string[] =>
  Object.values(exports).flatMap((value) => {
    const named = namedSchema.safeParse(value)

    return named.success ? [named.data.name] : []
  })

describe("area files", () => {
  it.each(Object.entries(AREA_FILES))(
    "%s is of a kind a module joins, loads first in a fresh module graph and is named after its area",
    async (path, load) => {
      vi.resetModules()
      const { area, kind } = areaFileOf(path)

      const exports = await load()
      await Promise.all(Object.values(JOINS[kind]).map((join) => join()))

      expect(namesOf(exports).filter((name) => name !== area)).toStrictEqual([])
    },
  )
})
