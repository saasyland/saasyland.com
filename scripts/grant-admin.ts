import { and, eq } from "drizzle-orm"
import process from "node:process"
import * as zod from "zod"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { emailSchema } from "~/src/integrations/better-auth/auth.zod"

import { user } from "~/src/modules/user/user.schema"

import { D1_ENVIRONMENTS, executeD1, inline, sqlBuilder } from "./d1-execute.ts"
import { scriptArguments } from "./run-command.ts"

const SQLITE_TRUE = 1
const USAGE = "Usage: bun run admin:grant:<local|preview|production> <email>"

const environmentSchema = zod.enum(D1_ENVIRONMENTS)
const accountSchema = zod.object({
  banned: zod.number(),
  email: zod.string(),
  email_verified: zod.number(),
  id: zod.string(),
  role: zod.string(),
})

type Account = zod.infer<typeof accountSchema>

const [environmentArgument, emailArgument = ""] = scriptArguments()
const environment = environmentSchema.safeParse(environmentArgument)
const email = emailSchema.safeParse(emailArgument.trim().toLowerCase())
if (!environment.success || !email.success) {
  throw new Error(USAGE)
}

const execute = async (statement: string): Promise<unknown[]> => {
  const results = await executeD1({ environment: environment.data, input: ["--command", statement] })
  return results.flat()
}

const findAccount = async (): Promise<Account | undefined> => {
  const query = sqlBuilder
    .select({ banned: user.banned, email: user.email, emailVerified: user.emailVerified, id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, email.data))
    .toSQL()
  const [row] = await execute(inline(query))

  return accountSchema.optional().parse(row)
}

const describeAccount = ({ email_verified: verified, email: address, id, role }: Account): string =>
  `${address} (${id}), role ${role}, email ${verified === SQLITE_TRUE ? "verified" : "not verified"}`

const refuseUnless = (account: Account | undefined): Account => {
  if (account === undefined) {
    throw new Error(`No account in ${environment.data} uses ${email.data}. Sign up on the site and verify the address first.`)
  }
  if (account.email_verified !== SQLITE_TRUE) {
    throw new Error(`${email.data} has not verified its email address. Open the link in the verification email, then run this again.`)
  }
  if (account.banned === SQLITE_TRUE) {
    throw new Error(`${email.data} is banned. Lift the ban before granting the ${ROLE_CODES.ADMIN} role.`)
  }

  return account
}

const grantAdmin = async (): Promise<void> => {
  process.stdout.write(`Granting the ${ROLE_CODES.ADMIN} role in the ${environment.data} database\n`)

  const found = await findAccount()
  if (found !== undefined) {
    process.stdout.write(`Before: ${describeAccount(found)}\n`)
  }
  const before = refuseUnless(found)
  if (before.role === ROLE_CODES.ADMIN) {
    process.stdout.write(`Nothing to change: ${email.data} is already an ${ROLE_CODES.ADMIN}.\n`)
    return
  }

  const grantable = and(eq(user.id, before.id), eq(user.emailVerified, true), eq(user.banned, false))
  await execute(inline(sqlBuilder.update(user).set({ role: ROLE_CODES.ADMIN }).where(grantable).toSQL()))

  const after = await findAccount()
  if (after?.role !== ROLE_CODES.ADMIN) {
    throw new Error(`The role of ${email.data} did not change. Check the account and run this again.`)
  }
  process.stdout.write(`After: ${describeAccount(after)}\n`)
}

await grantAdmin()
