import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { license } from "~/src/modules/license/license.schema"
import { user } from "~/src/modules/user/user.schema"
import {
  WITHDRAWAL_CHANNELS,
  WITHDRAWAL_ELIGIBILITIES,
  WITHDRAWAL_REFERENCE_MAX_LENGTH,
} from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"
import { withdrawalZodSchemas } from "~/src/modules/withdrawal/withdrawal.zod"

const STATEMENT = { email: "buyer@example.test", locale: "en-US", name: "Ada Buyer", reference: "SAASY-0042" }

describe("withdrawal schema", () => {
  it("materializes through drizzle adapter", () => {
    expect(drizzleAdapter({}, { provider: "sqlite", schema: { withdrawal } })).toBeDefined()
  })

  it("keeps a statement when its account or licence is deleted", () => {
    const references = getTableConfig(withdrawal).foreignKeys.map((key) => ({
      onDelete: key.onDelete,
      target: key.reference().foreignColumns[0],
    }))

    expect(references).toStrictEqual([
      { onDelete: "set null", target: license.id },
      { onDelete: "set null", target: user.id },
    ])
  })

  it("stores the channels and terms as these values", () => {
    expect(WITHDRAWAL_CHANNELS).toStrictEqual(["account", "public"])
    expect(WITHDRAWAL_ELIGIBILITIES).toStrictEqual(["statutoryWithdrawal", "refundable", "used", "expired", "unmatched"])
  })

  it("takes a statement with a name, an email address and an order number, trimmed", () => {
    expect(withdrawalZodSchemas.submitWithdrawal.parse({ ...STATEMENT, name: " Ada Buyer ", reference: " SAASY-0042 " })).toStrictEqual(
      STATEMENT,
    )
  })

  it.each([
    { field: "name", value: "" },
    { field: "email", value: "buyer" },
    { field: "reference", value: "x".repeat(WITHDRAWAL_REFERENCE_MAX_LENGTH + 1) },
    { field: "locale", value: "xx-XX" },
  ])("refuses a statement with an invalid $field", ({ field, value }) => {
    expect(withdrawalZodSchemas.submitWithdrawal.safeParse({ ...STATEMENT, [field]: value }).error?.issues).toStrictEqual([
      expect.objectContaining({ path: [field] }),
    ])
  })
})
