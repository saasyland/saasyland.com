import { getTableName, is } from "drizzle-orm"
import { SQLiteTable } from "drizzle-orm/sqlite-core"
import { globSync, readFileSync, readdirSync } from "node:fs"
import { basename, dirname, relative } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { createContentDirectory } from "~/src/platform/testing/lib/content-directory"

import * as SCHEMAS from "~/src/integrations/drizzle-orm/drizzle.schemas"

import { collectModuleTables } from "~/scripts/repository-facts"

const STANDARD_FILES = ["constants", "schema", "types", "utils", "zod"]
const LISTED_FILE = /^- `(?<path>[\w-]+\/[\w.-]+\.ts)`/gmu
const CORE_FOLDER = "_core"
const CORE_DIRECTORY = `src/modules/${CORE_FOLDER}`
const CORE_PAGE = "content/docs/architecture/core.en-US.mdx"
const CORE_FILE = /^(?:\| |- )`(?<path>[\w-]+\/[\w.-]+\.ts)`/gmu

const TABLES = collectModuleTables()
const USE_CASES = globSync("src/modules/*/use-cases/*.ts").map((path) => basename(path, ".ts"))

const useCasesOf = (rows: readonly (readonly [string, readonly string[]])[]): string[] => rows.flatMap(([, names]) => names)

describe("collectModuleTables", () => {
  it("lists the tables of drizzle.schemas.ts under the modules that declare them", () => {
    expect(TABLES.modules.flatMap(([, tables]) => tables).toSorted()).toStrictEqual(
      Object.values(SCHEMAS)
        .filter((value) => is(value, SQLiteTable))
        .map((table) => getTableName(table))
        .toSorted(),
    )
  })

  it("puts every use case once in its module, and once among the checked, public or plain ones", () => {
    const modules = TABLES.modules.flatMap((row) => row[2])
    const kinds = [...useCasesOf(TABLES.permissions), ...TABLES.publicUseCases, ...TABLES.plainUseCases]

    expect(modules.toSorted()).toStrictEqual(USE_CASES.toSorted())
    expect(kinds.toSorted()).toStrictEqual(USE_CASES.toSorted())
  })

  it("reads each module's tables, the authorized call of each use case, and the use cases without one", () => {
    const root = createContentDirectory({
      "_core/utils/ordering.ts": "export const ORDER = 1",
      "widget/use-cases/get-public-widgets.ts": "createServerFn().middleware([withRequest])",
      "widget/use-cases/get-widgets.ts": 'createServerFn().middleware([authorized({ widget: ["read", "list"] })])',
      "widget/use-cases/rename-widget.ts": "createServerFn().middleware([authorized()])",
      "widget/use-cases/send-widget-email.ts": "export const sendWidgetEmail = async () => {}",
      "widget/widget.schema.ts":
        'export const widget = sqliteTable(\n  "widget",\n  {},\n)\nexport const part = sqliteTable("widget_part", {})',
    })

    expect(collectModuleTables(root)).toStrictEqual({
      checkedPermissions: ["widget.list", "widget.read"],
      modules: [["widget", ["widget", "widget_part"], ["get-public-widgets", "get-widgets", "rename-widget", "send-widget-email"]]],
      permissions: [
        ["authorized()", ["rename-widget"]],
        ['authorized({ widget: ["read", "list"] })', ["get-widgets"]],
      ],
      plainUseCases: ["send-widget-email"],
      publicUseCases: ["get-public-widgets"],
    })
  })
})

describe("the module catalog", () => {
  it("describes every module file beyond the standard set, and no other", () => {
    const page = readFileSync("content/docs/reference/modules.en-US.mdx", "utf8")
    const files = globSync("src/modules/*/*.ts")
      .filter((path) => {
        const module = basename(dirname(path))

        return !STANDARD_FILES.some((kind) => basename(path) === `${module}.${kind}.ts`)
      })
      .map((path) => `${basename(dirname(path))}/${basename(path)}`)

    expect([...page.matchAll(LISTED_FILE)].map(({ groups }) => groups?.["path"] ?? "").toSorted()).toStrictEqual(files.toSorted())
  })
})

describe("the modules folder", () => {
  it("holds a folder for each module that owns a table, and _core", () => {
    const folders = readdirSync("src/modules", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(folders.toSorted()).toStrictEqual([CORE_FOLDER, ...TABLES.modules.map(([name]) => name)].toSorted())
  })

  it("keeps in _core only the files the Core page describes", () => {
    const page = readFileSync(CORE_PAGE, "utf8")
    const files = globSync(`${CORE_DIRECTORY}/**/*.ts`)
      .filter((path) => !path.includes("__test__"))
      .map((path) => relative(CORE_DIRECTORY, path))

    expect([...page.matchAll(CORE_FILE)].map(({ groups }) => groups?.["path"] ?? "").toSorted()).toStrictEqual(files.toSorted())
  })
})
