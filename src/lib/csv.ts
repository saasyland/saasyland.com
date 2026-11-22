export const CSV_MEDIA_TYPE = "text/csv;charset=utf-8"

const BYTE_ORDER_MARK = "﻿"

const LINE_BREAK = "\r\n"

const NEEDS_QUOTES = /[",\r\n]/u

const STARTS_A_FORMULA = /^[\t\r+=@-]/u

const QUOTE = /"/gu

const cellOf = (value: string): string => {
  const inert = STARTS_A_FORMULA.test(value) ? `'${value}` : value

  if (!NEEDS_QUOTES.test(inert)) {
    return inert
  }

  return `"${inert.replaceAll(QUOTE, '""')}"`
}

export const csvOf = (rows: readonly (readonly string[])[]): string =>
  `${BYTE_ORDER_MARK}${rows.map((row) => row.map((value) => cellOf(value)).join(",")).join(LINE_BREAK)}${LINE_BREAK}`
