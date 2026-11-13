import { describe, expect, it } from "vite-plus/test"

import { selectedOption } from "~/src/lib/select-option"

const OPTIONS = ["draft", "published"] as const

describe("selectedOption", () => {
  it("returns the option a select key names", () => {
    expect(selectedOption(OPTIONS, "published")).toBe("published")
  })

  it("returns nothing for any other key", () => {
    expect(selectedOption(OPTIONS, "archived")).toBeUndefined()
    expect(selectedOption(OPTIONS, 1)).toBeUndefined()
  })
})
