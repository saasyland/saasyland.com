import { describe, expect, it } from "vite-plus/test"

import { textValueProps } from "~/src/lib/text-value"

describe("textValueProps", () => {
  it("keeps the text value an item declares", () => {
    expect(textValueProps("Rename", "Rename the file")).toStrictEqual({ textValue: "Rename" })
  })

  it("reads the text value from text children", () => {
    expect(textValueProps(undefined, "Rename the file")).toStrictEqual({ textValue: "Rename the file" })
  })

  it("reads the text value from a number child", () => {
    expect(textValueProps(undefined, 25)).toStrictEqual({ textValue: "25" })
  })

  it("leaves the text value out for children that are not text", () => {
    expect(textValueProps(undefined, ["Rename", "the file"])).toStrictEqual({})
  })
})
