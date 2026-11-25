import { hashPassword } from "better-auth/crypto"
import { and, eq } from "drizzle-orm"
import process from "node:process"
import { v7 } from "uuid"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { account } from "~/src/modules/account/account.schema"
import { user } from "~/src/modules/user/user.schema"

import { LOCAL_ADMIN } from "./local-admin.ts"
import { APP_NAME } from "~/src/presentation/branding"

export const seedLocalAdmin = async (): Promise<string> => {
  const { db } = await import("~/src/integrations/drizzle-orm/drizzle.database")
  const password = strictPasswordSchema.parse(process.env[LOCAL_ADMIN.PASSWORD_VARIABLE] ?? LOCAL_ADMIN.DEFAULT_PASSWORD)
  const [admin] = await db
    .insert(user)
    .values({ email: LOCAL_ADMIN.EMAIL, emailVerified: true, id: v7(), name: APP_NAME, role: ROLE_CODES.ADMIN })
    .onConflictDoUpdate({ set: { emailVerified: true, role: ROLE_CODES.ADMIN }, target: user.email })
    .returning({ id: user.id })
  if (admin === undefined) {
    throw new Error(`Could not create ${LOCAL_ADMIN.EMAIL}`)
  }

  const credential = and(eq(account.userId, admin.id), eq(account.providerId, AUTH_PROVIDER.CREDENTIAL))
  await db.batch([
    db.delete(account).where(credential),
    db.insert(account).values({
      accountId: admin.id,
      id: v7(),
      password: await hashPassword(password),
      providerId: AUTH_PROVIDER.CREDENTIAL,
      userId: admin.id,
    }),
  ])

  const fallback = `the default password ${LOCAL_ADMIN.DEFAULT_PASSWORD}`
  const source = process.env[LOCAL_ADMIN.PASSWORD_VARIABLE] === undefined ? fallback : LOCAL_ADMIN.PASSWORD_VARIABLE

  return `Admin: ${LOCAL_ADMIN.EMAIL}, signs in with ${source}`
}
