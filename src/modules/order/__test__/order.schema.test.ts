import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { order } from "~/src/modules/order/order.schema"

const { columns, foreignKeys, indexes } = getTableConfig(order)

describe("order schema", () => {
  it("materializes through the drizzle adapter and stamps updates", () => {
    expect(drizzleAdapter({}, { provider: "sqlite", schema: { order } })).toBeDefined()
    expect(order.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
  })

  it("mirrors Polar's order fields, with only our write times defaulted", () => {
    expect(columns.map((column) => [column.name, column.getSQLType(), column.notNull, column.hasDefault])).toStrictEqual([
      ["billing_country", "text(2)", false, false],
      ["changed_at", "integer", true, false],
      ["currency", "text(3)", true, false],
      ["customer_id", "text(64)", true, false],
      ["description", "text", true, false],
      ["discount_amount", "integer", false, false],
      ["discount_code", "text", false, false],
      ["discount_id", "text(64)", false, false],
      ["discount_name", "text", false, false],
      ["id", "text(64)", true, false],
      ["invoice_number", "text", false, false],
      ["placed_at", "integer", true, false],
      ["product_id", "text(64)", false, false],
      ["refunded_amount", "integer", true, false],
      ["status", "text", true, false],
      ["subscription_id", "text(64)", false, false],
      ["total_amount", "integer", true, false],
      ["user_id", "text", false, false],
      ["created_at", "integer", true, true],
      ["updated_at", "integer", true, true],
    ])
    expect(columns.filter((column) => column.primary).map((column) => column.name)).toStrictEqual(["id"])
    expect(order.status.enumValues).toStrictEqual(["draft", "pending", "paid", "refunded", "partially_refunded", "void"])
  })

  it("keeps the order and clears its account when the account is deleted", () => {
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

  it("indexes an account's orders and every order of a status by when they were placed", () => {
    expect(indexes.map(({ config }) => ({ columns: config.columns, name: config.name, unique: config.unique }))).toStrictEqual([
      { columns: [order.userId, order.placedAt], name: "order_user_placed_at_idx", unique: false },
      { columns: [order.status, order.placedAt], name: "order_status_placed_at_idx", unique: false },
    ])
  })
})
