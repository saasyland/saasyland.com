import { type SQL, type SQLWrapper, sql } from "drizzle-orm"

export const containsText = (column: SQLWrapper, text: string): SQL => sql`instr(lower(${column}), ${text.toLowerCase()}) > 0`

export const anyTranslationContains = (column: SQLWrapper, text: string): SQL =>
  sql`exists (select 1 from json_each(${column}) where instr(lower(json_each.value), ${text.toLowerCase()}) > 0)`
