import { describe, expect, it } from "vite-plus/test"

import { analyzeModule } from "~/scripts/module-bindings"
import { isTestFile, moduleMocksOf, testCallsOf } from "~/scripts/test-cases"

const FILE = "src/probe.test.tsx"
const VITEST = 'import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from "vite-plus/test"\n'
const PLAYWRIGHT = 'import { test as base } from "../fixtures/test"\n'

const textOf = (source: string, { end, start }: { readonly end: number; readonly start: number }): string => source.slice(start, end)

const testsOf = (source: string): string[] =>
  testCallsOf(analyzeModule(FILE, source)).map(
    ({ call, callbacks, kind, tables }) =>
      `${kind} ${textOf(source, call.callee)} callbacks:${String(callbacks.length)} tables:${tables.map((table) => textOf(source, table)).join("|")}`,
  )

const mocksOf = (source: string): string[] =>
  moduleMocksOf(analyzeModule(FILE, source)).map(
    ({ call, source: module, specifier }) => `${textOf(source, call.callee)} ${module} ${textOf(source, specifier)}`,
  )

describe("isTestFile", () => {
  it("knows a Vitest test and a Playwright spec by name, and nothing else", () => {
    expect(["a.test.ts", "b.component.test.tsx", "e2e/specs/c.spec.ts", "d.test.mjs"].map((file) => isTestFile(file))).toStrictEqual([
      true,
      true,
      true,
      true,
    ])
    expect(["test.ts", "fixtures.ts", "a.test.json", "spec.tsx"].map((file) => isTestFile(file))).toStrictEqual([
      false,
      false,
      false,
      false,
    ])
  })
})

describe("testCallsOf", () => {
  it("reads the test cases, groups and setup hooks of Vitest by the names it imports", () => {
    const source = `${VITEST}describe("group", () => {\n  beforeAll(() => {})\n  beforeEach(async () => {})\n  afterEach(function () {})\n  afterAll(() => {})\n  it("case", () => {})\n})\n`

    expect(testsOf(source)).toStrictEqual([
      "hook afterAll callbacks:1 tables:",
      "hook afterEach callbacks:1 tables:",
      "hook beforeAll callbacks:1 tables:",
      "hook beforeEach callbacks:1 tables:",
      "group describe callbacks:1 tables:",
      "case it callbacks:1 tables:",
    ])
  })

  it("follows modifiers and tables, and reads Playwright's groups, steps and hooks under any local name", () => {
    const source = `${VITEST}${PLAYWRIGHT}it.each([1, 2])("each %s", (value) => {})\nit.for([3])("for", () => {})\nit.skip.each([4])("skipped", () => {})\nit.skipIf(true)("conditional", () => {})\ndescribe.each([5])("group", () => {})\nbase.describe.serial("serial", () => {\n  base.beforeEach(async () => {})\n  base("case", { tag: "@a" }, async () => {\n    await base.step("step", async () => {})\n  })\n})\n`

    expect(testsOf(source)).toStrictEqual([
      "group describe.each([5]) callbacks:1 tables:[5]",
      "case it.each([1, 2]) callbacks:1 tables:[1, 2]",
      "case it.for([3]) callbacks:1 tables:[3]",
      "case it.skip.each([4]) callbacks:1 tables:[4]",
      "case it.skipIf(true) callbacks:1 tables:",
      "group base.describe.serial callbacks:1 tables:",
      "hook base.beforeEach callbacks:1 tables:",
      "case base callbacks:1 tables:",
      "step base.step callbacks:1 tables:",
    ])
  })

  it("leaves out calls with no callback or no title, names it does not call and names it does not import", () => {
    const source = `${VITEST}${PLAYWRIGHT}base.use({ locale: "en-US" })\nbase.skip(true, "reason")\nbase.skip(() => true)\nbase.describe.configure({ mode: "serial" })\nit()\nconst run = it\nconst key = list[it]\nconst computed = it["each"]\nclass Box {\n  #each = 1\n  read = () => it.#each\n}\nbase.info().annotations\ntest("global", () => {})\nconst mapped = [1].map((it) => it("shadowed", () => {}))\n`

    expect(testsOf(source)).toStrictEqual([])
  })
})

describe("moduleMocksOf", () => {
  it("reads the module each mock of vi names, by string or by import()", () => {
    const source = `${VITEST}vi.mock("~/src/a")\nvi.doMock(import("./b"), () => ({}))\nvi.unmock("./c")\nvi.doUnmock("./d")\n`

    expect(mocksOf(source)).toStrictEqual([
      'vi.mock ~/src/a "~/src/a"',
      'vi.doMock ./b import("./b")',
      'vi.unmock ./c "./c"',
      'vi.doUnmock ./d "./d"',
    ])
  })

  it("leaves out other calls of vi, a mock it cannot read and a mock it does not call", () => {
    const source = `${VITEST}vi.fn()\nvi.mocked(value)\nvi.mock(path)\nvi.mock(1)\nvi.mock()\nvi.mock(import("./" + name))\nvi["mock"]("./e")\nconst later = vi.mock\nvi()\n`

    expect(mocksOf(source)).toStrictEqual([])
  })
})
