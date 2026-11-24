import { describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

const ACCESS_FILES = import.meta.glob<Readonly<Record<string, unknown>>>("../*.access.ts")

const JOIN = import.meta.glob("../../integrations/better-auth/auth.access.ts")

const ACCESS_FILE = /^\.\.\/(?<area>[a-z-]+)\.access\.ts$/u

const accessFileSchema = zod.object({ area: zod.string() })

describe("area access files", () => {
  it.each(Object.entries(ACCESS_FILES))("%s loads first in a fresh module graph and is named after its area", async (path, load) => {
    vi.resetModules()
    const { area } = accessFileSchema.parse(ACCESS_FILE.exec(path)?.groups)

    const exports = await load()
    await Promise.all(Object.values(JOIN).map((join) => join()))

    expect(Object.keys(exports)).toStrictEqual([`${area.toUpperCase()}_ACCESS`])
  })
})
