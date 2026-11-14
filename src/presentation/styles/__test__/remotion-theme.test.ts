import { readFileSync } from "node:fs"
import { expect, it } from "vite-plus/test"

import { DARK_TOKENS } from "~/remotion/src/theme"

const DARK_BLOCK_PATTERN = /^\.dark \{(?<block>[^}]*)\}/mu
const TOKEN_PATTERN = /--(?<name>[\w-]+):\s*(?<value>[^;]+);/gu

const darkTokens = (): Map<string, string> => {
  const block = DARK_BLOCK_PATTERN.exec(readFileSync("src/presentation/styles/globals.css", "utf8"))?.groups?.["block"] ?? ""

  return new Map([...block.matchAll(TOKEN_PATTERN)].map((match) => [match.groups?.["name"] ?? "", match.groups?.["value"] ?? ""]))
}

it("paints the landing videos with the dark theme tokens of the app", () => {
  const tokens = darkTokens()

  expect(Object.fromEntries(Object.keys(DARK_TOKENS).map((name) => [name, tokens.get(name)]))).toStrictEqual(DARK_TOKENS)
})
