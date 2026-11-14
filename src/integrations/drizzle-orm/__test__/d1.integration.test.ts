import { eq } from "drizzle-orm"
import { expect, it } from "vite-plus/test"

import { DEFAULT_ROLE_CODE } from "~/src/integrations/better-auth/auth.roles"
import * as AREA_ROWS from "~/src/integrations/drizzle-orm/__test__/rows.entries"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { session, user } from "~/src/integrations/drizzle-orm/drizzle.schemas"

interface TimestampedRow {
  readonly createdAt: Date
  readonly updatedAt: Date
}

it("round-trips default dates and booleans through the migrated D1 schema", async () => {
  const before = Math.floor(Date.now() / 1000) * 1000
  const userId = "schema-user"
  const [owner] = await db.insert(user).values({ email: "schema@example.test", id: userId, name: "Ada" }).returning()
  expect(owner?.emailVerified).toBe(false)
  expect(owner?.role).toBe(DEFAULT_ROLE_CODE)
  const expiresAt = new Date(Date.now() + 60_000)
  const areas = Object.values(AREA_ROWS)
  const results = await Promise.all(areas.flatMap((area): Promise<readonly TimestampedRow[]>[] => area.insert({ expiresAt, userId })))
  for (const rows of [[owner], ...results]) {
    const [row] = rows
    expect(row?.createdAt).toBeInstanceOf(Date)
    expect(row?.updatedAt).toBeInstanceOf(Date)
    expect(row?.createdAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(row?.updatedAt.getTime()).toBeLessThanOrEqual(Date.now())
  }
  const sessions = await db.select().from(session).where(eq(session.userId, userId))
  expect(sessions[0]?.expiresAt).toEqual(expiresAt)
  await db.delete(user).where(eq(user.id, userId))
  for (const area of areas) {
    if ("owned" in area) {
      expect(await area.owned(userId)).toEqual([])
    }
  }
})
