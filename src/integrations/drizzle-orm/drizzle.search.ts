import { type SQL, type SQLWrapper, eq, gte, inArray, lte, sql } from "drizzle-orm"
import type zod from "zod/v4"

import { CURRENCY_CODES, toMinorUnits } from "~/src/modules/_core/constants/currency"
import { FLAG_FILTER, type FlagFilter } from "~/src/modules/_core/utils/pagination"
import type { dateRangeField, numberRangeField } from "~/src/modules/_core/utils/zod-fields"

type DateRange = zod.infer<typeof dateRangeField>

type NumberRange = zod.infer<typeof numberRangeField>

const NO_RANGE = {}

const MINOR_UNITS_PER_MAJOR = JSON.stringify(Object.fromEntries(CURRENCY_CODES.map((code) => [code, toMinorUnits(1, code)])))

export const containsText = (column: SQLWrapper, text: string): SQL => sql`instr(lower(${column}), ${text.toLowerCase()}) > 0`

export const anyTranslationContains = (column: SQLWrapper, text: string): SQL =>
  sql`exists (select 1 from json_each(${column}) where instr(lower(json_each.value), ${text.toLowerCase()}) > 0)`

export const anyContains = (columns: readonly SQLWrapper[], text = ""): SQL[] => {
  if (text.length === 0) {
    return []
  }

  return [
    sql`(${sql.join(
      columns.map((column) => containsText(column, text)),
      sql` or `,
    )})`,
  ]
}

export const oneOf = (column: SQLWrapper, values: readonly string[] = []): SQL[] => {
  if (values.length === 0) {
    return []
  }

  return [inArray(column, values)]
}

const atLeast = (expression: SQLWrapper, bound: number | undefined): SQL[] => {
  if (bound === undefined) {
    return []
  }

  return [sql`${expression} >= ${bound}`]
}

const atMost = (expression: SQLWrapper, bound: number | undefined): SQL[] => {
  if (bound === undefined) {
    return []
  }

  return [sql`${expression} <= ${bound}`]
}

export const withinDates = (expression: SQLWrapper, { from, to }: DateRange = NO_RANGE): SQL[] => [
  ...atLeast(expression, from),
  ...atMost(expression, to),
]

export const withinNumbers = (expression: SQLWrapper, { max, min }: NumberRange = NO_RANGE): SQL[] => [
  ...atLeast(expression, min),
  ...atMost(expression, max),
]

const inMinorUnits = (amount: number, currency: SQLWrapper): SQL<number> =>
  sql<number>`round(${amount} * json_extract(${MINOR_UNITS_PER_MAJOR}, '$.' || upper(${currency})))`.mapWith(Number)

export const withinAmounts = (minorUnits: SQLWrapper, currency: SQLWrapper, { max, min }: NumberRange = NO_RANGE): SQL[] => [
  ...(min === undefined ? [] : [gte(minorUnits, inMinorUnits(min, currency))]),
  ...(max === undefined ? [] : [lte(minorUnits, inMinorUnits(max, currency))]),
]

export const flagIs = (column: SQLWrapper, flag: FlagFilter | undefined): SQL[] => {
  if (flag === undefined) {
    return []
  }

  return [eq(column, flag === FLAG_FILTER.YES)]
}
