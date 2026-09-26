import { Glob } from "bun"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const CLIENT_DIR = "dist/client"
const PRELOAD_PATTERN = /<link rel="modulepreload" href="(?<hint>\/assets\/[^"]+)"(?: fetchpriority="low")?\/>/gu
const MODULE_SCRIPT_PATTERN = /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="(?<entry>\/assets\/[^"]+)")[^>]*>/gu

const pages = [...new Glob("**/index.html").scanSync(CLIENT_DIR)].toSorted()

if (pages.length === 0) {
  throw new Error(`No prerendered pages found under ${CLIENT_DIR}.`)
}

let strippedHints = 0
let retainedHints = 0

for (const page of pages) {
  const path = join(CLIENT_DIR, page)
  const html = readFileSync(path, "utf8")
  const moduleEntries = new Set([...html.matchAll(MODULE_SCRIPT_PATTERN)].map((match) => match.groups?.["entry"]))
  const hints = [...html.matchAll(PRELOAD_PATTERN)].map((match) => match.groups?.["hint"] ?? "")
  const missingHint = hints.find((hint) => !existsSync(join(CLIENT_DIR, hint)))

  if (missingHint !== undefined) {
    throw new Error(`${page}: modulepreload target ${missingHint} does not exist on disk.`)
  }

  const entryHints = hints.filter((hint) => moduleEntries.has(hint))
  retainedHints += entryHints.length
  strippedHints += hints.length - entryHints.length

  writeFileSync(
    path,
    html.replaceAll(PRELOAD_PATTERN, (_tag, hint: string) =>
      moduleEntries.has(hint) ? `<link rel="modulepreload" href="${hint}" fetchpriority="low"/>` : "",
    ),
  )
}

if (strippedHints === 0 || retainedHints === 0) {
  throw new Error("Expected entry and dependency modulepreload hints in the pages — the build output shape has changed.")
}

console.log(
  `Optimized ${pages.length} pages: ${retainedHints} entry modulepreload hints retained at low priority, ${strippedHints} dependency hints stripped.`,
)
