import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { searchChoice, searchFlag, searchParam, searchText } from "~/src/lib/search-params"

const VIEWS = ["grid", "table"] as const
const CODE_LENGTH = 6

describe("search params", () => {
  it.each([
    { expected: "123456", value: "123456" },
    { expected: undefined, value: "12345" },
    { expected: undefined, value: undefined },
    { expected: undefined, value: 123_456 },
  ])("reads $value as a param matching its schema: $expected", ({ expected, value }) => {
    expect(searchParam(zod.string().length(CODE_LENGTH)).parse(value)).toBe(expected)
  })

  it.each([
    { expected: "token", value: "token" },
    { expected: undefined, value: undefined },
    { expected: undefined, value: "" },
    { expected: undefined, value: 123 },
    { expected: undefined, value: ["token"] },
  ])("reads $value as text $expected", ({ expected, value }) => {
    expect(searchText().parse(value)).toBe(expected)
  })

  it.each([
    { expected: true, value: true },
    { expected: false, value: false },
    { expected: undefined, value: undefined },
    { expected: undefined, value: "yes" },
  ])("reads $value as flag $expected", ({ expected, value }) => {
    expect(searchFlag().parse(value)).toBe(expected)
  })

  it.each([
    { expected: "table", value: "table" },
    { expected: "grid", value: undefined },
    { expected: "grid", value: "list" },
  ])("reads $value as choice $expected", ({ expected, value }) => {
    expect(searchChoice(VIEWS, "grid").parse(value)).toBe(expected)
  })
})
