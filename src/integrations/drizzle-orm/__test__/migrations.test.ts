import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vite-plus/test"

const MIGRATIONS = resolve("src/integrations/drizzle-orm/migrations")
const BILLING_MIRRORS = "20261116002710_cute_thunderball.sql"
const MIRROR_TABLES = new Set(["order", "subscription"])
const STATEMENT_BREAKPOINT = "--> statement-breakpoint"
const ONE_CREATE_STATEMENT = /^CREATE (?:TABLE|INDEX) [^;]+;$/u
const STATEMENT_HEAD = /^[^(]+/u

const migrationSql = (file: string): string => readFileSync(resolve(MIGRATIONS, file), "utf8")

const statements = (file: string): string[] =>
  migrationSql(file)
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)

const schemaOf = (database: DatabaseSync) =>
  database.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY tbl_name, type, name").all()

const isMirror = (entry: Record<string, unknown>): boolean => MIRROR_TABLES.has(String(entry["tbl_name"]))

const databaseBefore = (migration: string): DatabaseSync => {
  const database = new DatabaseSync(":memory:")
  for (const file of readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql") && name < migration)
    .toSorted()) {
    database.exec(migrationSql(file))
  }
  return database
}

describe("the migration that adds the billing mirrors", () => {
  it("creates the order and subscription tables and their indexes, and nothing else", () => {
    const created = statements(BILLING_MIRRORS)

    expect(created.filter((statement) => !ONE_CREATE_STATEMENT.test(statement))).toStrictEqual([])
    expect(created.map((statement) => STATEMENT_HEAD.exec(statement)?.[0].trim())).toStrictEqual([
      "CREATE TABLE `order`",
      "CREATE INDEX `order_user_placed_at_idx` ON `order`",
      "CREATE INDEX `order_status_placed_at_idx` ON `order`",
      "CREATE TABLE `subscription`",
      "CREATE INDEX `subscription_user_status_idx` ON `subscription`",
      "CREATE INDEX `subscription_status_current_period_end_idx` ON `subscription`",
    ])
  })

  it("leaves every table and index that existed before it as it was", () => {
    const database = databaseBefore(BILLING_MIRRORS)
    const before = schemaOf(database)

    database.exec(migrationSql(BILLING_MIRRORS))
    const after = schemaOf(database)

    expect(before.filter((entry) => isMirror(entry))).toStrictEqual([])
    expect(after.filter((entry) => !isMirror(entry))).toStrictEqual(before)
    expect(after.filter((entry) => isMirror(entry)).map((entry) => `${String(entry["type"])} ${String(entry["name"])}`)).toStrictEqual([
      "index order_status_placed_at_idx",
      "index order_user_placed_at_idx",
      "index sqlite_autoindex_order_1",
      "table order",
      "index sqlite_autoindex_subscription_1",
      "index subscription_status_current_period_end_idx",
      "index subscription_user_status_idx",
      "table subscription",
    ])
  })
})
