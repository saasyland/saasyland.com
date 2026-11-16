import { hashPassword } from "better-auth/crypto"

import { AUTH_PROVIDER } from "../../src/integrations/better-auth/auth.constants"
import { TEST_ACCOUNTS, TEST_PASSWORD } from "./accounts"
import { type TestSeed, literal } from "./seed"

interface TestAccount {
  readonly email: string
  readonly id: string
  readonly name: string
  readonly role: string
}

export const userStatement = ({ email, id, name, role }: TestAccount): string =>
  `INSERT INTO user (id, email, name, role, email_verified) VALUES (${literal(id)}, ${literal(email)}, ${literal(name)}, ${literal(role)}, 1) ON CONFLICT(id) DO UPDATE SET email_verified = 1, role = excluded.role;`

export const accountStatements = async (accounts: readonly TestAccount[]): Promise<string[]> => {
  const password = await hashPassword(TEST_PASSWORD)
  return accounts.flatMap((account) => [
    `DELETE FROM session WHERE user_id = ${literal(account.id)};`,
    userStatement(account),
    `INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES (${literal(`${account.id}-credential`)}, ${literal(account.id)}, ${literal(AUTH_PROVIDER.CREDENTIAL)}, ${literal(account.id)}, ${literal(password)}) ON CONFLICT(id) DO UPDATE SET password = excluded.password;`,
  ])
}

export const authSeed = async (): Promise<TestSeed> => ({ objects: [], statements: await accountStatements(TEST_ACCOUNTS) })
