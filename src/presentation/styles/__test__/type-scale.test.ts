import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

const GLOBALS = readFileSync("src/presentation/styles/globals.css", "utf8")

const TOKEN = /(?<name>--text-[\w-]+):\s*(?<value>[^;]+);/gu

const REM = /^(?<rem>[\d.]+)rem$/u

const CLAMP_FLOOR = /^clamp\((?<rem>[\d.]+)rem,/u

const SMOOTHING = /:where\((?<selectors>[^)]*)\)\s*\{\s*-webkit-font-smoothing: antialiased;/u

const DISPLAY_TOKEN = /^--text-(?:display|headline|price)/u

const PIXELS_PER_REM = 16

const FLOOR_PX = 12

const tokens = new Map([...GLOBALS.matchAll(TOKEN)].map((match) => [match.groups?.["name"] ?? "", match.groups?.["value"] ?? ""]))

const sizes = [...tokens].filter(([name]) => !name.includes("--", 2))

const smallestPixels = (value: string): number =>
  Number(REM.exec(value)?.groups?.["rem"] ?? CLAMP_FLOOR.exec(value)?.groups?.["rem"]) * PIXELS_PER_REM

describe("the type scale", () => {
  it("sets small text at 13px and short labels at 12px in medium weight", () => {
    expect({
      label: tokens.get("--text-label"),
      labelLeading: tokens.get("--text-label--line-height"),
      labelTracking: tokens.get("--text-label--letter-spacing"),
      labelWeight: tokens.get("--text-label--font-weight"),
      spec: tokens.get("--text-spec"),
      specLeading: tokens.get("--text-spec--line-height"),
    }).toStrictEqual({
      label: "0.75rem",
      labelLeading: "1.4",
      labelTracking: "0.04em",
      labelWeight: "500",
      spec: "0.8125rem",
      specLeading: "1.5",
    })
  })

  it("keeps Tailwind's text-xs, which only Fumadocs' own components use, at the size of text-spec", () => {
    expect([tokens.get("--text-xs"), tokens.get("--text-xs--line-height")]).toStrictEqual([
      tokens.get("--text-spec"),
      tokens.get("--text-spec--line-height"),
    ])
  })

  it("sets no size below 12px", () => {
    const absolute = sizes.filter(([name]) => name !== "--text-code")

    expect(absolute.length).toBeGreaterThan(0)
    for (const [name, value] of absolute) {
      expect(smallestPixels(value), name).toBeGreaterThanOrEqual(FLOOR_PX)
    }
  })

  it("keeps grayscale antialiasing for display sizes and article headings, and leaves smaller text to the platform's smoothing", () => {
    const selectors = (SMOOTHING.exec(GLOBALS)?.groups?.["selectors"] ?? "").split(",").map((selector) => selector.trim())
    const display = sizes.map(([name]) => name).filter((name) => DISPLAY_TOKEN.test(name))

    expect(display.length).toBeGreaterThan(0)
    expect(selectors).toStrictEqual(
      expect.arrayContaining(["h1", ".typeset h2", ".typeset h3", ...display.map((name) => `.${name.slice(2)}`)]),
    )
    expect(readFileSync("src/routes/__root.tsx", "utf8")).not.toContain("antialiased")
  })

  it("sets inline code relative to the text around it", () => {
    expect(tokens.get("--text-code")).toBe("0.9em")
  })
})
