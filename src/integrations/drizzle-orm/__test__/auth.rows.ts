import { eq } from "drizzle-orm"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import type { TableRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { account } from "~/src/modules/account/account.schema"
import { session } from "~/src/modules/session/session.schema"
import { twoFactor } from "~/src/modules/two-factor/two-factor.schema"
import { verification } from "~/src/modules/verification/verification.schema"

export const AUTH_ROWS = [
  {
    insert: ({ expiresAt, userId }) => [
      db.insert(account).values({ accountId: userId, id: "schema-account", providerId: AUTH_PROVIDER.CREDENTIAL, userId }).returning(),
      db.insert(session).values({ expiresAt, id: "schema-session", token: "schema-token", userId }).returning(),
      db.insert(twoFactor).values({ backupCodes: "[]", id: "schema-two-factor", secret: "secret", userId }).returning(),
      db.insert(verification).values({ expiresAt, id: "schema-verification", identifier: "schema-identifier", value: "value" }).returning(),
    ],
    owned: (userId) => db.select().from(session).where(eq(session.userId, userId)),
  },
] as const satisfies readonly TableRows[]
