import { describe, expect, it } from "vite-plus/test"

import { BINDING_KIND, DEFAULT_EXPORT, analyzeModule } from "~/scripts/module-bindings"

const FILE = "src/probe.tsx"

const textOf = (source: string, { end, start }: { readonly end: number; readonly start: number }): string => source.slice(start, end)

const referencesTo = (source: string, name: string): string[] =>
  analyzeModule(FILE, `${source}\nimport { ${name} } from "./probe"\n`)
    .bindings.filter((binding) => binding.name === name)
    .flatMap(({ references }) => references.map((reference) => textOf(source, reference)))

const countOf = (source: string, name: string): number => referencesTo(source, name).length

describe("analyzeModule: module bindings", () => {
  it("reads every import with the path of the export it names", () => {
    const source = 'import Default, * as Space from "./a"\nimport { named, "string name" as alias, type Shape } from "./b"\n'

    expect(analyzeModule(FILE, source).bindings.map(({ kind, name, path }) => ({ kind, name, path }))).toStrictEqual([
      { kind: BINDING_KIND.IMPORT, name: "Default", path: [DEFAULT_EXPORT] },
      { kind: BINDING_KIND.IMPORT, name: "Space", path: [] },
      { kind: BINDING_KIND.IMPORT, name: "named", path: ["named"] },
      { kind: BINDING_KIND.IMPORT, name: "alias", path: ["string name"] },
      { kind: BINDING_KIND.IMPORT, name: "Shape", path: ["Shape"] },
    ])
  })

  it("reads every declaration, and only the ones the file does not export may go", () => {
    const source = [
      "const { a, b: [c, , d], ...e } = values",
      "export const f = 1",
      "export default function g() {}",
      "function h() {}",
      "class I {}",
      "declare function j(): void",
      "interface K {}",
      "type L = string",
      "enum M {}",
      'import N = require("n")',
      "namespace O {}",
      'declare module "p" {}',
      "export { f as q }",
      "h()",
    ].join("\n")

    expect(
      analyzeModule("src/probe.ts", source).bindings.flatMap((binding) =>
        binding.kind === BINDING_KIND.LOCAL ? [`${binding.name}:${String(binding.removable)}`] : [],
      ),
    ).toStrictEqual([
      "a:true",
      "c:true",
      "d:true",
      "e:true",
      "f:false",
      "g:false",
      "h:true",
      "I:true",
      "j:true",
      "K:true",
      "L:true",
      "M:true",
      "N:true",
      "O:false",
    ])
  })

  it("reads no name from an anonymous default export", () => {
    expect(analyzeModule("src/probe.ts", "export default class {}\n").bindings).toStrictEqual([])
  })

  it("shares the references of declarations that merge under one name", () => {
    const { bindings } = analyzeModule(
      "src/probe.ts",
      "function f(value: string): string\nfunction f(value: unknown) {\n  return value\n}\nf(1)\n",
    )

    expect(bindings.map(({ references }) => references.length)).toStrictEqual([1, 1])
    expect(bindings[0]?.references).toBe(bindings[1]?.references)
  })

  it("refuses a file it cannot parse, rather than prune references it never read", () => {
    expect(() => analyzeModule(FILE, "const = 1")).toThrow(`${FILE} does not parse`)
  })
})

describe("analyzeModule: references", () => {
  it("counts values, types, JSX components, computed keys and local exports as references", () => {
    const source = [
      "const value: Item = Item",
      "type Kind = typeof Item | Item.Kind",
      "class Child extends Item implements Item {}",
      "interface Shape extends Item {}",
      "const object = { Item, [Item]: Item.value, key: Item }",
      "const element = <Item.Row prop={Item}><Item /></Item.Row>",
      "const fallback = ({ option = Item }) => option",
      "export { Item as Renamed }",
      "export default Item",
    ].join("\n")

    expect(countOf(source, "Item")).toBe(17)
  })

  it("skips names that are not references: keys, members, labels, exported names and declarations", () => {
    const source = [
      "const object = { Item: 1, Item() {} }",
      "object.Item",
      "class Box { Item = 1; Item() {} static { Item: for (;;) { if (Box) continue Item; break Item } } }",
      "interface Shape { Item: string; Item(): void; [key: string]: unknown }",
      "enum Kinds { Item }",
      "type Guard = (value: unknown) => value is string",
      "type Pair = [Item: string]",
      "type Name = Space.Item",
      "const element = <div Item={1}><item /><svg:Item /></div>",
      'export { Item as Other } from "./other"',
      'export * as Item from "./other"',
      'import json from "./data.json" with { Item: "json" }',
      "const meta = import.meta.url",
      'type Imported = import("./other").Item',
    ].join("\n")

    expect(countOf(source, "Item")).toBe(0)
  })

  it("lets every inner declaration shadow a module name of the same spelling", () => {
    const source = [
      "{ const Item = 1; Item }",
      "function a(Item) { return Item }",
      "const b = ({ Item }, [Item2], ...Item3) => Item",
      "const c = function Item() { return Item }",
      "const d = class Item { method() { return Item } }",
      "try {} catch (Item) { Item }",
      "for (const Item of []) Item",
      "for (const Item in {}) Item",
      "for (let Item = 0; ; ) Item",
      "switch (1) { case 1: { const x = 1 } default: const Item = 2; Item }",
      "class E { static { const Item = 1; Item } }",
      "declare module 'f' { const Item: number; type T = typeof Item }",
      "function g<Item>(value: Item): Item { return value }",
      "class H<Item> { value!: Item }",
      "interface I<Item> { value: Item; method<Item>(value: Item): Item; <Item>(value: Item): Item; new <Item>(value: Item): Item }",
      "type J<Item> = Item",
      "type K = <Item>(value: Item) => Item",
      "type L = new <Item>(value: Item) => Item",
      "type M = { [Item in string]: Item }",
      "type N<T> = T extends Array<infer Item> ? Item : never",
      "declare function O<Item>(value: Item): Item",
      "class P { constructor(private Item: number) { Item } }",
      "abstract class Q { abstract method<Item>(value: Item): Item }",
      "const r = class {}",
      "try {} catch { Item }",
      "for (;;) Item",
      "const s = function () { return Item }",
    ].join("\n")

    expect(referencesTo(source, "Item")).toStrictEqual(["Item", "Item", "Item"])
  })

  it("tracks every local with its references, and marks the ones the pruning may delete", () => {
    const source =
      "function outer(parameter) {\n  const kept = 1\n  const { picked, ...rest } = values\n  const [first, , last] = values\n  function inner() {}\n  return [parameter, kept, picked, rest, first, last, inner]\n}\n"
    const { locals } = analyzeModule(FILE, source)

    expect(
      locals.map(({ declaration, references, removable }) => [textOf(source, declaration), references.length, removable]),
    ).toStrictEqual([
      ["parameter", 1, false],
      ["kept = 1", 1, true],
      ["picked", 1, true],
      ["...rest", 1, true],
      ["first", 1, true],
      ["last", 1, true],
      ["function inner() {}", 1, true],
    ])
  })
})

describe("analyzeModule: arrays, dynamic imports and ambient modules", () => {
  it("lists every array literal, every block and every import whose module is a string", () => {
    const source =
      'const list = [[1], 2]\nconst lazy = () => import("./lazy")\nconst dynamic = import("./" + name)\ntype Module = typeof import("./types")\nfunction run() {\n  if (list) {}\n}\n'
    const { arrays, blocks, imports } = analyzeModule(FILE, source)

    expect(arrays.map((array) => textOf(source, array))).toStrictEqual(["[[1], 2]", "[1]"])
    expect(blocks.map((block) => textOf(source, block))).toStrictEqual(["{\n  if (list) {}\n}", "{}"])
    expect(imports.map(({ source: module }) => module)).toStrictEqual(["./lazy", "./types"])
  })

  it("reads the modules a script declaration file declares, but not the ones a module file augments", () => {
    expect(
      analyzeModule("src/a.d.ts", 'declare module "virtual:a" {}\ndeclare module Space {}\ninterface Window {}\n').ambientModules,
    ).toStrictEqual(["virtual:a"])

    for (const statement of ['import "x"', 'export * from "x"', "export default 1", "export {}"]) {
      expect(analyzeModule("src/a.d.ts", `${statement}\ndeclare module "virtual:a" {}\n`).ambientModules).toStrictEqual([])
    }
  })
})
