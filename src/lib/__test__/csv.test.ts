import { describe, expect, it } from "vite-plus/test"

import { csvOf } from "~/src/lib/csv"

const BYTE_ORDER_MARK = "﻿"

describe("csv", () => {
  it("writes a byte order mark, comma-separated cells and a line break after every row", () => {
    expect(
      csvOf([
        ["Name", "Total"],
        ["Ada", "199.00 USD"],
      ]),
    ).toBe(`${BYTE_ORDER_MARK}Name,Total\r\nAda,199.00 USD\r\n`)
  })

  it("quotes a cell holding a comma, a quote or a line break, and doubles its quotes", () => {
    expect(csvOf([["Lovelace, Ada", 'The "Countess"', "two\nlines"]])).toBe(
      `${BYTE_ORDER_MARK}"Lovelace, Ada","The ""Countess""","two\nlines"\r\n`,
    )
  })

  it("keeps a spreadsheet from running a cell that starts like a formula", () => {
    expect(csvOf([["=HYPERLINK(1)", "+1", "-1", "@SUM(A1)", "\tlead", "plain"]])).toBe(
      `${BYTE_ORDER_MARK}'=HYPERLINK(1),'+1,'-1,'@SUM(A1),'\tlead,plain\r\n`,
    )
  })
})
