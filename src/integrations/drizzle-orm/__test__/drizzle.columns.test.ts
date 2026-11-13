import { sql } from "drizzle-orm"
import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

const stamped = sqliteTable("stamped", { id: text("id").primaryKey(), ...timestamps() })

describe("timestamps", () => {
  it.each([
    ["created_at", stamped.createdAt],
    ["updated_at", stamped.updatedAt],
  ])("stores %s as a required millisecond timestamp that defaults to the insert time", (name, column) => {
    expect(column).toMatchObject({ mode: "timestamp_ms", name, notNull: true })
    expect(column.default).toStrictEqual(sql`(unixepoch() * 1000)`)
  })

  it("restamps only the update time on every update", () => {
    expect(stamped.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
    expect(stamped.createdAt.onUpdateFn).toBeUndefined()
  })

  it("hands every table its own column builders", () => {
    expect(timestamps().createdAt).not.toBe(timestamps().createdAt)
  })
})
