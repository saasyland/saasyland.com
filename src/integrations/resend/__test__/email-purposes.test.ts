import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

const MODULE_CONSTANTS = import.meta.glob<Readonly<Record<string, unknown>>>("../../../modules/*/*.constants.ts", { eager: true })
const EMAIL_PURPOSE_SUFFIX = "_EMAIL_PURPOSE"
const purposesSchema = zod.record(zod.string(), zod.string())

const PURPOSES = Object.values(MODULE_CONSTANTS).flatMap((constants) =>
  Object.entries(constants)
    .filter(([name]) => name.endsWith(EMAIL_PURPOSE_SUFFIX))
    .flatMap(([, purposes]) => Object.values(purposesSchema.parse(purposes))),
)

describe("email purposes", () => {
  it("gives every email a module sends a purpose that no other email has, across the modules' constants", () => {
    expect(PURPOSES.length).toBeGreaterThan(0)
    expect(new Set(PURPOSES).size).toBe(PURPOSES.length)
  })
})
