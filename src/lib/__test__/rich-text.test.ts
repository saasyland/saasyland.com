import { describe, expect, it } from "vite-plus/test"

import { RICH_TEXT_CODE_MARK, parseRichText } from "~/src/lib/rich-text"

const code = (text: string): string => `${RICH_TEXT_CODE_MARK}${text}${RICH_TEXT_CODE_MARK}`

describe("parseRichText", () => {
  it("splits paragraphs on blank lines and drops empty ones", () => {
    expect(parseRichText("First line\nstill first.\n\n  \n\nSecond.\n\n")).toStrictEqual([
      [{ code: false, text: "First line\nstill first." }],
      [{ code: false, text: "Second." }],
    ])
  })

  it("marks code between backticks and keeps an unmatched backtick as text", () => {
    expect(parseRichText(`Run ${code("bun run dev")}, then ${code("bun run check")}.`)).toStrictEqual([
      [
        { code: false, text: "Run " },
        { code: true, text: "bun run dev" },
        { code: false, text: ", then " },
        { code: true, text: "bun run check" },
        { code: false, text: "." },
      ],
    ])
    expect(parseRichText(`${code("init")} and a stray ${RICH_TEXT_CODE_MARK} mark`)).toStrictEqual([
      [
        { code: true, text: "init" },
        { code: false, text: ` and a stray ${RICH_TEXT_CODE_MARK} mark` },
      ],
    ])
  })

  it("returns nothing for empty text", () => {
    expect(parseRichText("   ")).toStrictEqual([])
  })
})
