import { eq } from "drizzle-orm"
import { expect, it } from "vite-plus/test"

import { DEFAULT_ROLE_CODE } from "~/src/integrations/better-auth/auth.roles"
import { AUTH_ROWS } from "~/src/integrations/drizzle-orm/__test__/auth.rows"
import { LICENSE_ROWS } from "~/src/integrations/drizzle-orm/__test__/license.rows"
import { NEWSLETTER_ROWS } from "~/src/integrations/drizzle-orm/__test__/newsletter.rows"
import { POLAR_ROWS } from "~/src/integrations/drizzle-orm/__test__/polar.rows"
import { PRODUCTS_ROWS } from "~/src/integrations/drizzle-orm/__test__/products.rows"
import type { TableRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { session, user } from "~/src/integrations/drizzle-orm/drizzle.schemas"

it("round-trips default dates and booleans through the migrated D1 schema", async () => {
  const before = Math.floor(Date.now() / 1000) * 1000
  const userId = "schema-user"
  const [owner] = await db.insert(user).values({ email: "schema@example.test", id: userId, name: "Ada" }).returning()
  expect(owner?.emailVerified).toBe(false)
  expect(owner?.role).toBe(DEFAULT_ROLE_CODE)
  const expiresAt = new Date(Date.now() + 60_000)
  const tables: readonly TableRows[] = [...AUTH_ROWS, ...LICENSE_ROWS, ...NEWSLETTER_ROWS, ...POLAR_ROWS, ...PRODUCTS_ROWS]
  const results = await Promise.all(tables.flatMap((table) => table.insert({ expiresAt, userId })))
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
  for (const { owned } of tables) {
    if (owned !== undefined) {
      expect(await owned(userId)).toEqual([])
    }
  }
})
