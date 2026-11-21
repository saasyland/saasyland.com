import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { subscription } from "~/src/modules/subscription/subscription.schema"

const { columns, foreignKeys, indexes } = getTableConfig(subscription)

describe("subscription schema", () => {
  it("materializes through the drizzle adapter and stamps updates", () => {
    expect(drizzleAdapter({}, { provider: "sqlite", schema: { subscription } })).toBeDefined()
    expect(subscription.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
  })

  it("mirrors Polar's subscription fields, with only our write times defaulted", () => {
    expect(columns.map((column) => [column.name, column.getSQLType(), column.notNull, column.hasDefault])).toStrictEqual([
      ["amount", "integer", true, false],
      ["cancel_at_period_end", "integer", true, false],
      ["changed_at", "integer", true, false],
      ["currency", "text(3)", true, false],
      ["current_period_end", "integer", true, false],
      ["customer_id", "text(64)", true, false],
      ["ended_at", "integer", false, false],
      ["id", "text(64)", true, false],
      ["product_id", "text(64)", true, false],
      ["product_name", "text", true, false],
      ["recurring_interval", "text", true, false],
      ["recurring_interval_count", "integer", true, false],
      ["started_at", "integer", false, false],
      ["status", "text", true, false],
      ["user_id", "text", false, false],
      ["created_at", "integer", true, true],
      ["updated_at", "integer", true, true],
    ])
    expect(columns.filter((column) => column.primary).map((column) => column.name)).toStrictEqual(["id"])
    expect(subscription.status.enumValues).toStrictEqual([
      "incomplete",
      "incomplete_expired",
      "trialing",
      "active",
      "past_due",
      "canceled",
      "unpaid",
      "paused",
      "trial_ended",
    ])
    expect(subscription.recurringInterval.enumValues).toStrictEqual(["day", "week", "month", "year"])
  })

  it("keeps the subscription and clears its account when the account is deleted", () => {
    expect(
      foreignKeys.map((foreignKey) => {
        const reference = foreignKey.reference()
        return {
          columns: reference.columns.map((column) => column.name),
          foreignColumns: reference.foreignColumns.map((column) => column.name),
          foreignTable: getTableName(reference.foreignTable),
          onDelete: foreignKey.onDelete,
        }
      }),
    ).toStrictEqual([{ columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "set null" }])
  })

  it("indexes an account's subscriptions by status and every subscription of a status by its period end", () => {
    expect(indexes.map(({ config }) => ({ columns: config.columns, name: config.name, unique: config.unique }))).toStrictEqual([
      { columns: [subscription.userId, subscription.status], name: "subscription_user_status_idx", unique: false },
      { columns: [subscription.status, subscription.currentPeriodEnd], name: "subscription_status_current_period_end_idx", unique: false },
    ])
  })
})
