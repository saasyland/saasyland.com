import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

const STYLES = "src/presentation/styles"
const GLOBALS = join(STYLES, "globals.css")

const RADIUS_THEME = /@theme static \{(?<block>[^}]*)\}/u
const TOKEN = /(?<name>--radius[\w*-]*):\s*(?<value>[^;]+);/gu
const DECLARATION = /border(?:-[a-z]+)*-radius:\s*(?<value>[^;]+);/gu
const BASE = /--radius:\s*(?<value>[^;]+);/gu
const ON_SCALE = /^(?:0|inherit|9999px|var\(--radius(?:-(?:sm|md|lg))?\))$/u

const stylesheets = readdirSync(STYLES)
  .filter((file) => file.endsWith(".css"))
  .map((file) => ({ css: readFileSync(join(STYLES, file), "utf8"), file }))

const radiusTheme = (): Record<string, string> => {
  const block = RADIUS_THEME.exec(readFileSync(GLOBALS, "utf8"))?.groups?.["block"] ?? ""

  return Object.fromEntries([...block.matchAll(TOKEN)].map((match) => [match.groups?.["name"] ?? "", match.groups?.["value"] ?? ""]))
}

describe("the radius scale", () => {
  it("sets the base radius to 8px once, next to the other shadcn tokens", () => {
    expect([...readFileSync(GLOBALS, "utf8").matchAll(BASE)].map((match) => match.groups?.["value"])).toStrictEqual(["0.5rem"])
  })

  it("derives 4, 6 and 8px from the base and removes every other step, keeping xl and 2xl at 8px for Fumadocs' own components", () => {
    expect(radiusTheme()).toStrictEqual({
      "--radius-*": "initial",
      "--radius-2xl": "var(--radius-lg)",
      "--radius-lg": "var(--radius)",
      "--radius-md": "calc(var(--radius) * 0.75)",
      "--radius-sm": "calc(var(--radius) * 0.5)",
      "--radius-xl": "var(--radius-lg)",
    })
  })

  it("takes every radius in the stylesheets from the scale", () => {
    for (const { css, file } of stylesheets) {
      for (const match of css.matchAll(DECLARATION)) {
        expect(match.groups?.["value"], file).toMatch(ON_SCALE)
      }
    }
  })
})
