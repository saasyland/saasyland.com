import { hashPassword } from "better-auth/crypto"

import { AUTH_PROVIDER } from "../../src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
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

const [admin] = TEST_ACCOUNTS

const SEEDED_INVITATION = {
  email: "seeded.invitation.for.a.rather.long.address@example.test",
  expiresAt: Date.UTC(2099, 0, 1),
  id: "test-invitation",
  sentAt: Date.UTC(2026, 10, 20, 9),
  tokenHash: "0".repeat(64),
}

const invitationStatement = (): string =>
  `INSERT INTO invitation (id, email, role, locale, token_hash, invited_by, sent_at, expires_at) VALUES (${literal(SEEDED_INVITATION.id)}, ${literal(SEEDED_INVITATION.email)}, ${literal(ROLE_CODES.CUSTOMER)}, ${literal(I18N.DEFAULT_LOCALE)}, ${literal(SEEDED_INVITATION.tokenHash)}, ${literal(admin.id)}, ${String(SEEDED_INVITATION.sentAt)}, ${String(SEEDED_INVITATION.expiresAt)}) ON CONFLICT(id) DO NOTHING;`

export const authSeed = async (): Promise<TestSeed> => ({
  objects: [],
  statements: [...(await accountStatements(TEST_ACCOUNTS)), invitationStatement()],
})
