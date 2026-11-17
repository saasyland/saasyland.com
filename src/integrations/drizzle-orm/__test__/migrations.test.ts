import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vite-plus/test"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"

const MIGRATIONS = resolve("src/integrations/drizzle-orm/migrations")
const BILLING_MIRRORS = "20261116002710_cute_thunderball.sql"
const LICENSE_RECORDS = "20261116195637_great_blazing_skull.sql"
const LICENSE_TABLE = "license"
const RECORD_COLUMNS = ["activated_at", "delivered_at", "withdrawal_consent_at"]
const BUYER = { email: "buyer@example.test", id: "migrated-buyer", name: "Buyer" }
const PURCHASED_AT = Date.parse("2026-11-10T09:30:00.000Z")
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

const isLicenseTable = (entry: Record<string, unknown>): boolean => entry["type"] === "table" && entry["tbl_name"] === LICENSE_TABLE

const plain = (rows: readonly Record<string, unknown>[]): Record<string, unknown>[] => rows.map((row) => ({ ...row }))

const columnsOf = (database: DatabaseSync, table: string) =>
  plain(database.prepare("SELECT * FROM pragma_table_info(?) ORDER BY cid").all(table))

const licenseRows = (database: DatabaseSync) => plain(database.prepare(`SELECT * FROM ${LICENSE_TABLE} ORDER BY id`).all())

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

describe("the migration that adds the licence records", () => {
  it("adds a nullable integer column for each record to the license table, and nothing else", () => {
    expect(statements(LICENSE_RECORDS)).toStrictEqual(
      RECORD_COLUMNS.map((column) => `ALTER TABLE \`${LICENSE_TABLE}\` ADD \`${column}\` integer;`),
    )
  })

  it("keeps every other table, every index and every licence as it was, with no record yet", () => {
    const database = databaseBefore(LICENSE_RECORDS)
    database.prepare("INSERT INTO user (id, name, email) VALUES (?, ?, ?)").run(BUYER.id, BUYER.name, BUYER.email)
    database
      .prepare(
        "INSERT INTO license (id, polar_customer_id, polar_order_id, purchase_created_at, status, tier, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("migrated-license", "cus_migrated", "ord_migrated", PURCHASED_AT, LICENSE_STATUS.ACTIVE, LICENSE_TIER.COMPLETE, BUYER.id)
    const before = schemaOf(database)
    const columnsBefore = columnsOf(database, LICENSE_TABLE)
    const [licenseBefore] = licenseRows(database)

    database.exec(migrationSql(LICENSE_RECORDS))

    expect(schemaOf(database).filter((entry) => !isLicenseTable(entry))).toStrictEqual(before.filter((entry) => !isLicenseTable(entry)))
    expect(columnsOf(database, LICENSE_TABLE)).toStrictEqual([
      ...columnsBefore,
      ...RECORD_COLUMNS.map((name, index) => ({
        cid: columnsBefore.length + index,
        dflt_value: null,
        name,
        notnull: 0,
        pk: 0,
        type: "INTEGER",
      })),
    ])
    expect(licenseRows(database)).toStrictEqual([
      { ...licenseBefore, ...Object.fromEntries(RECORD_COLUMNS.map((column) => [column, null])) },
    ])
  })
})
