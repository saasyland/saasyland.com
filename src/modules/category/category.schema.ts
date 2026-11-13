import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

export const CATEGORY_ICONS = ["Archive", "FolderOpen", "Puzzle"] as const
export const CATEGORY_KINDS = ["category", "collection"] as const
export const CATEGORY_VISIBILITIES = ["public", "hidden"] as const

export const category = sqliteTable(
  "category",
  {
    description: text("description").notNull().default(""),
    icon: text("icon", { enum: CATEGORY_ICONS }).notNull().default("FolderOpen"),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: CATEGORY_KINDS }).notNull().default("category"),
    name: text("name", { length: 255 }).notNull(),
    visibility: text("visibility", { enum: CATEGORY_VISIBILITIES }).notNull().default("public"),
    ...timestamps(),
  },
  (table) => [index("category_createdAt_idx").on(table.createdAt)],
)
