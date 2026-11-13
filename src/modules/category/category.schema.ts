import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.columns"

import { CATEGORY_ICON, CATEGORY_KIND, CATEGORY_NAME_MAX_LENGTH, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"

export const CATEGORY_ICONS = [CATEGORY_ICON.ARCHIVE, CATEGORY_ICON.FOLDER_OPEN, CATEGORY_ICON.PUZZLE] as const
export const CATEGORY_KINDS = [CATEGORY_KIND.CATEGORY, CATEGORY_KIND.COLLECTION] as const
export const CATEGORY_VISIBILITIES = [CATEGORY_VISIBILITY.PUBLIC, CATEGORY_VISIBILITY.HIDDEN] as const

export const category = sqliteTable(
  "category",
  {
    description: text("description").notNull().default(""),
    icon: text("icon", { enum: CATEGORY_ICONS }).notNull().default(CATEGORY_ICON.FOLDER_OPEN),
    id: text("id").primaryKey(),
    kind: text("kind", { enum: CATEGORY_KINDS }).notNull().default(CATEGORY_KIND.CATEGORY),
    name: text("name", { length: CATEGORY_NAME_MAX_LENGTH }).notNull(),
    visibility: text("visibility", { enum: CATEGORY_VISIBILITIES }).notNull().default(CATEGORY_VISIBILITY.PUBLIC),
    ...timestamps(),
  },
  (table) => [index("category_createdAt_idx").on(table.createdAt)],
)
