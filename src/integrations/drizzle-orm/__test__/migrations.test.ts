import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_ICON, COURSE_LEVEL } from "~/src/modules/course/course.constants"
import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"

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

const COURSE_CONTENT = "20261117161820_safe_stardust.sql"
const ATTACHMENT_TABLE = "lesson_attachment"
const EXTENDED_TABLES = new Set(["chapter", "course", "lesson", "video"])
const ADDED_COLUMNS = {
  chapter: [["summary", "TEXT", "'{}'"]],
  course: [
    ["icon", "TEXT", "'book-open'"],
    ["level", "TEXT", "'beginner'"],
    ["outcomes", "TEXT", "'{}'"],
    ["prerequisites", "TEXT", "'{}'"],
  ],
  lesson: [
    ["description", "TEXT", "'{}'"],
    ["key_moments", "TEXT", "'[]'"],
  ],
  video: [["placeholder", "INTEGER", "false"]],
} as const
const EXISTING_COURSE = { id: "migrated-course", slug: "migrated", summary: '{"en-US":"Before."}', title: '{"en-US":"Migrated"}' }
const EXISTING_CHAPTER = { id: "migrated-chapter", title: '{"en-US":"Chapter"}' }
const EXISTING_VIDEO = { id: "migrated-video", title: "Recording" }
const EXISTING_LESSON = { id: "migrated-lesson", slug: "first", summary: '{"en-US":"First."}', title: '{"en-US":"First"}' }

const isExtendedTable = (entry: Record<string, unknown>): boolean =>
  entry["type"] === "table" && EXTENDED_TABLES.has(String(entry["tbl_name"]))

const isAttachmentEntry = (entry: Record<string, unknown>): boolean => entry["tbl_name"] === ATTACHMENT_TABLE

const rowOf = (database: DatabaseSync, table: string, id: string) =>
  plain(database.prepare(`SELECT * FROM ${table} WHERE id = ?`).all(id))[0]

const seedCourseContent = (database: DatabaseSync): void => {
  database
    .prepare("INSERT INTO course (id, slug, summary, title) VALUES (?, ?, ?, ?)")
    .run(EXISTING_COURSE.id, EXISTING_COURSE.slug, EXISTING_COURSE.summary, EXISTING_COURSE.title)
  database
    .prepare("INSERT INTO chapter (id, course_id, title) VALUES (?, ?, ?)")
    .run(EXISTING_CHAPTER.id, EXISTING_COURSE.id, EXISTING_CHAPTER.title)
  database
    .prepare("INSERT INTO video (id, title, duration_ms, width, height, size_bytes) VALUES (?, ?, ?, ?, ?, ?)")
    .run(EXISTING_VIDEO.id, EXISTING_VIDEO.title, 1000, 1920, 1080, 1)
  database
    .prepare("INSERT INTO lesson (id, chapter_id, course_id, slug, summary, title, video_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(
      EXISTING_LESSON.id,
      EXISTING_CHAPTER.id,
      EXISTING_COURSE.id,
      EXISTING_LESSON.slug,
      EXISTING_LESSON.summary,
      EXISTING_LESSON.title,
      EXISTING_VIDEO.id,
    )
}

describe("the migration that adds the course content", () => {
  it("creates the attachment table and its index, then only adds columns with defaults", () => {
    const changes = statements(COURSE_CONTENT)

    expect(changes.map((statement) => STATEMENT_HEAD.exec(statement)?.[0].trim())).toStrictEqual([
      "CREATE TABLE `lesson_attachment`",
      "CREATE INDEX `lesson_attachment_lesson_position_idx` ON `lesson_attachment`",
      ...Object.entries(ADDED_COLUMNS).flatMap(([table, columns]) =>
        columns.map(
          ([column, type, value]) => `ALTER TABLE \`${table}\` ADD \`${column}\` ${type.toLowerCase()} DEFAULT ${value} NOT NULL;`,
        ),
      ),
    ])
  })

  it("keeps every other table and index and every existing row, and gives old rows the new defaults", () => {
    const database = databaseBefore(COURSE_CONTENT)
    seedCourseContent(database)
    const before = schemaOf(database)
    const columnsBefore = Object.fromEntries(Object.keys(ADDED_COLUMNS).map((table) => [table, columnsOf(database, table)]))
    const rowsBefore = {
      chapter: rowOf(database, "chapter", EXISTING_CHAPTER.id),
      course: rowOf(database, "course", EXISTING_COURSE.id),
      lesson: rowOf(database, "lesson", EXISTING_LESSON.id),
      video: rowOf(database, "video", EXISTING_VIDEO.id),
    }

    database.exec(migrationSql(COURSE_CONTENT))
    const after = schemaOf(database)

    expect(before.filter((entry) => isAttachmentEntry(entry))).toStrictEqual([])
    expect(after.filter((entry) => !isExtendedTable(entry) && !isAttachmentEntry(entry))).toStrictEqual(
      before.filter((entry) => !isExtendedTable(entry)),
    )
    for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
      const existing = columnsBefore[table] ?? []
      expect(columnsOf(database, table)).toStrictEqual([
        ...existing,
        ...columns.map(([name, type, value], index) => ({
          cid: existing.length + index,
          dflt_value: value,
          name,
          notnull: 1,
          pk: 0,
          type,
        })),
      ])
    }
    expect(rowOf(database, "course", EXISTING_COURSE.id)).toStrictEqual({
      ...rowsBefore.course,
      icon: COURSE_ICON.BOOK_OPEN,
      level: COURSE_LEVEL.BEGINNER,
      outcomes: "{}",
      prerequisites: "{}",
    })
    expect(rowOf(database, "chapter", EXISTING_CHAPTER.id)).toStrictEqual({ ...rowsBefore.chapter, summary: "{}" })
    expect(rowOf(database, "lesson", EXISTING_LESSON.id)).toStrictEqual({ ...rowsBefore.lesson, description: "{}", key_moments: "[]" })
    expect(rowOf(database, "video", EXISTING_VIDEO.id)).toStrictEqual({ ...rowsBefore.video, placeholder: 0 })
  })

  it("deletes a lesson's attachments with the lesson", () => {
    const database = databaseBefore(COURSE_CONTENT)
    database.exec(migrationSql(COURSE_CONTENT))
    database.exec("PRAGMA foreign_keys = ON")
    seedCourseContent(database)
    database
      .prepare("INSERT INTO lesson_attachment (id, kind, lesson_id, title, url) VALUES (?, ?, ?, ?, ?)")
      .run("migrated-attachment", LESSON_ATTACHMENT_KIND.LINK, EXISTING_LESSON.id, '{"en-US":"Docs"}', "/docs")

    database.prepare("DELETE FROM lesson WHERE id = ?").run(EXISTING_LESSON.id)

    expect(plain(database.prepare("SELECT id FROM lesson_attachment").all())).toStrictEqual([])
  })
})

const WITHDRAWALS = "20261122012118_true_garia.sql"
const WITHDRAWAL_TABLE = "withdrawal"

const isWithdrawalEntry = (entry: Record<string, unknown>): boolean => entry["tbl_name"] === WITHDRAWAL_TABLE

describe("the migration that adds the withdrawal statements", () => {
  it("creates the withdrawal table and its index, and nothing else", () => {
    const created = statements(WITHDRAWALS)

    expect(created.filter((statement) => !ONE_CREATE_STATEMENT.test(statement))).toStrictEqual([])
    expect(created.map((statement) => STATEMENT_HEAD.exec(statement)?.[0].trim())).toStrictEqual([
      "CREATE TABLE `withdrawal`",
      "CREATE INDEX `withdrawal_user_created_at_idx` ON `withdrawal`",
    ])
  })

  it("leaves every table and index that existed before it as it was", () => {
    const database = databaseBefore(WITHDRAWALS)
    const before = schemaOf(database)

    database.exec(migrationSql(WITHDRAWALS))

    expect(before.filter((entry) => isWithdrawalEntry(entry))).toStrictEqual([])
    expect(schemaOf(database).filter((entry) => !isWithdrawalEntry(entry))).toStrictEqual(before)
  })

  it("keeps a statement, without its links, when the account that sent it is deleted", () => {
    const database = databaseBefore(WITHDRAWALS)
    database.exec(migrationSql(WITHDRAWALS))
    database.exec("PRAGMA foreign_keys = ON")
    database.prepare("INSERT INTO user (id, email, name) VALUES (?, ?, ?)").run(BUYER.id, BUYER.email, BUYER.name)
    database
      .prepare("INSERT INTO license (id, polar_customer_id, tier, user_id) VALUES (?, ?, ?, ?)")
      .run("migrated-license", "cus_migrated", LICENSE_TIER.CORE, BUYER.id)
    database
      .prepare(
        "INSERT INTO withdrawal (id, channel, eligibility, email, license_id, locale, name, reference, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "migrated-withdrawal",
        WITHDRAWAL_CHANNEL.PUBLIC,
        WITHDRAWAL_ELIGIBILITY.REFUNDABLE,
        BUYER.email,
        "migrated-license",
        I18N.DEFAULT_LOCALE,
        BUYER.name,
        "SAASY-0001",
        BUYER.id,
      )

    database.prepare("DELETE FROM user WHERE id = ?").run(BUYER.id)

    expect(plain(database.prepare("SELECT id, license_id, user_id FROM withdrawal").all())).toStrictEqual([
      { id: "migrated-withdrawal", license_id: null, user_id: null },
    ])
  })
})

const LESSON_RECORDS = "20261122030940_confused_mystique.sql"
const LESSON_RECORD_COLUMNS = [
  ["lesson_opened_at", "INTEGER"],
  ["opened_lesson_id", "TEXT"],
] as const

describe("the migration that records the first paid lesson", () => {
  it("adds a nullable column for the time and one for the lesson to the license table, and nothing else", () => {
    expect(statements(LESSON_RECORDS)).toStrictEqual(
      LESSON_RECORD_COLUMNS.map(([column, type]) => `ALTER TABLE \`${LICENSE_TABLE}\` ADD \`${column}\` ${type.toLowerCase()};`),
    )
  })

  it("keeps every other table, every index and every licence as it was, with no lesson ready yet", () => {
    const database = databaseBefore(LESSON_RECORDS)
    database.prepare("INSERT INTO user (id, name, email) VALUES (?, ?, ?)").run(BUYER.id, BUYER.name, BUYER.email)
    database
      .prepare("INSERT INTO license (id, polar_customer_id, delivered_at, tier, user_id) VALUES (?, ?, ?, ?, ?)")
      .run("migrated-license", "cus_migrated", PURCHASED_AT, LICENSE_TIER.COMPLETE, BUYER.id)
    const before = schemaOf(database)
    const columnsBefore = columnsOf(database, LICENSE_TABLE)
    const [licenseBefore] = licenseRows(database)

    database.exec(migrationSql(LESSON_RECORDS))

    expect(schemaOf(database).filter((entry) => !isLicenseTable(entry))).toStrictEqual(before.filter((entry) => !isLicenseTable(entry)))
    expect(columnsOf(database, LICENSE_TABLE)).toStrictEqual([
      ...columnsBefore,
      ...LESSON_RECORD_COLUMNS.map(([name, type], index) => ({
        cid: columnsBefore.length + index,
        dflt_value: null,
        name,
        notnull: 0,
        pk: 0,
        type,
      })),
    ])
    expect(licenseRows(database)).toStrictEqual([{ ...licenseBefore, lesson_opened_at: null, opened_lesson_id: null }])
  })
})

const ORDER_TERMS = "20261122143452_familiar_tusk.sql"
const ORDER_TABLE = "order"
const ORDER_TERM_COLUMNS = [
  ["billing_country", "text(2)"],
  ["discount_amount", "INTEGER"],
  ["discount_code", "TEXT"],
  ["discount_id", "text(64)"],
  ["discount_name", "TEXT"],
] as const
const PLACED_ORDER = { currency: "usd", id: "ord_migrated", placed: PURCHASED_AT, status: "paid", total: 4900 }

const isOrderTable = (entry: Record<string, unknown>): boolean => entry["type"] === "table" && entry["tbl_name"] === ORDER_TABLE

describe("the migration that copies the discount and billing country of orders", () => {
  it("adds a nullable column for the billing country and for each part of the discount to the order table, and nothing else", () => {
    expect(statements(ORDER_TERMS)).toStrictEqual(
      ORDER_TERM_COLUMNS.map(([column, type]) => `ALTER TABLE \`${ORDER_TABLE}\` ADD \`${column}\` ${type.toLowerCase()};`),
    )
  })

  it("keeps every other table, every index and every order as it was, with the new columns empty until Polar's data arrives", () => {
    const database = databaseBefore(ORDER_TERMS)
    database
      .prepare(
        "INSERT INTO `order` (id, changed_at, currency, customer_id, description, placed_at, refunded_amount, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        PLACED_ORDER.id,
        PLACED_ORDER.placed,
        PLACED_ORDER.currency,
        "cus_migrated",
        "Core",
        PLACED_ORDER.placed,
        0,
        PLACED_ORDER.status,
        PLACED_ORDER.total,
      )
    const before = schemaOf(database)
    const columnsBefore = columnsOf(database, ORDER_TABLE)
    const [orderBefore] = plain(database.prepare("SELECT * FROM `order`").all())

    database.exec(migrationSql(ORDER_TERMS))

    expect(schemaOf(database).filter((entry) => !isOrderTable(entry))).toStrictEqual(before.filter((entry) => !isOrderTable(entry)))
    expect(columnsOf(database, ORDER_TABLE)).toStrictEqual([
      ...columnsBefore,
      ...ORDER_TERM_COLUMNS.map(([name, type], index) => ({
        cid: columnsBefore.length + index,
        dflt_value: null,
        name,
        notnull: 0,
        pk: 0,
        type,
      })),
    ])
    expect(plain(database.prepare("SELECT * FROM `order`").all())).toStrictEqual([
      { ...orderBefore, ...Object.fromEntries(ORDER_TERM_COLUMNS.map(([column]) => [column, null])) },
    ])
  })
})
