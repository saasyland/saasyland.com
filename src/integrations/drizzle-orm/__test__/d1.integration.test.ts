import { eq } from "drizzle-orm"
import { expect, it } from "vite-plus/test"

import { DEFAULT_ROLE_CODE } from "~/src/integrations/better-auth/auth.access"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import {
  account,
  category,
  license,
  newsletterSubscriber,
  product,
  session,
  twoFactor,
  user,
  verification,
} from "~/src/integrations/drizzle-orm/drizzle.schemas"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

it("round-trips default dates and booleans through the migrated D1 schema", async () => {
  const before = Math.floor(Date.now() / 1000) * 1000
  const userId = "schema-user"
  const [owner] = await db.insert(user).values({ email: "schema@example.test", id: userId, name: "Ada" }).returning()
  expect(owner?.emailVerified).toBe(false)
  expect(owner?.role).toBe(DEFAULT_ROLE_CODE)
  const expiry = new Date(Date.now() + 60_000)
  const results = await Promise.all([
    db.insert(account).values({ accountId: userId, id: "schema-account", providerId: AUTH_PROVIDER.CREDENTIAL, userId }).returning(),
    db.insert(session).values({ expiresAt: expiry, id: "schema-session", token: "schema-token", userId }).returning(),
    db.insert(twoFactor).values({ backupCodes: "[]", id: "schema-two-factor", secret: "secret", userId }).returning(),
    db
      .insert(verification)
      .values({ expiresAt: expiry, id: "schema-verification", identifier: "schema-identifier", value: "value" })
      .returning(),
    db.insert(category).values({ id: "schema-category", name: "Category" }).returning(),
    db.insert(product).values({ id: "schema-product", name: "Product" }).returning(),
    db.insert(license).values({ id: "schema-license", polarCustomerId: "polar-customer", tier: LICENSE_TIER.CORE, userId }).returning(),
    db
      .insert(newsletterSubscriber)
      .values({ email: "schema@example.test", id: "schema-subscriber", unsubscribeToken: "token" })
      .returning(),
  ])
  for (const rows of [[owner], ...results]) {
    const [row] = rows
    expect(row?.createdAt).toBeInstanceOf(Date)
    expect(row?.updatedAt).toBeInstanceOf(Date)
    expect(row?.createdAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(row?.updatedAt.getTime()).toBeLessThanOrEqual(Date.now())
  }
  const sessions = await db.select().from(session).where(eq(session.userId, userId))
  expect(sessions[0]?.expiresAt).toEqual(expiry)
  await db.delete(user).where(eq(user.id, userId))
  expect(await db.select().from(session).where(eq(session.userId, userId))).toEqual([])
  expect(await db.select().from(license).where(eq(license.userId, userId))).toEqual([])
})
