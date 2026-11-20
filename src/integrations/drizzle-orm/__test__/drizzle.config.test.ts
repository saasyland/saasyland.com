import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import drizzleConfig, { DRIZZLE_PROJECT, LOCAL_DATABASE_FILE_VARIABLE } from "~/src/integrations/drizzle-orm/drizzle.config"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"

const LOCAL_FILE = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.sqlite"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("drizzle kit config", () => {
  it("targets D1 SQLite over the HTTP driver with the project schema", () => {
    expect.hasAssertions()
    expect(drizzleConfig.dialect).toBe("sqlite")
    expect(drizzleConfig.schema).toContain("drizzle.schemas.ts")
    expect(drizzleConfig).toMatchObject({ driver: "d1-http" })
  })

  it("opens the local D1 file it is given, with the same schema and migrations", async () => {
    vi.stubEnv(LOCAL_DATABASE_FILE_VARIABLE, LOCAL_FILE)

    const { default: localConfig } = await import("~/src/integrations/drizzle-orm/drizzle.local.config")

    expect(localConfig).toStrictEqual({ ...DRIZZLE_PROJECT, dbCredentials: { url: LOCAL_FILE } })
  })

  it("refuses to open Studio without the local D1 file", async () => {
    vi.stubEnv(LOCAL_DATABASE_FILE_VARIABLE, undefined)

    await expect(import("~/src/integrations/drizzle-orm/drizzle.local.config")).rejects.toThrow("bun run db:studio:local")
  })
})

describe("platform db schema barrel", () => {
  it("re-exports schema modules", () => {
    expect.hasAssertions()
    expect(schema.rateLimit).toBeDefined()
  })
})
