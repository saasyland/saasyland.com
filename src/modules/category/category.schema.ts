import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const CATEGORY_ICONS = ["Archive", "FolderOpen", "Puzzle"] as const
export const CATEGORY_KINDS = ["category", "collection"] as const
export const CATEGORY_VISIBILITIES = ["public", "hidden"] as const

export const category = sqliteTable(
  "category",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon", { enum: CATEGORY_ICONS }).notNull().default("FolderOpen"),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: CATEGORY_KINDS }).notNull().default("category"),
    name: text("name", { length: 255 }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(
        () =>
          /* @__PURE__ */
          new Date(),
      )
      .notNull(),
    visibility: text("visibility", { enum: CATEGORY_VISIBILITIES }).notNull().default("public"),
  },
  (table) => [index("category_createdAt_idx").on(table.createdAt)],
)
