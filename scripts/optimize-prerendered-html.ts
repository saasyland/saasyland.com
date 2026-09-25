import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { Glob } from "bun"

const CLIENT_DIR = "dist/client"
const PRELOAD_PATTERN = /<link rel="modulepreload" href="(\/assets\/[^"]+)"(?: fetchpriority="low")?\/>/gu
const MODULE_SCRIPT_PATTERN = /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="(\/assets\/[^"]+)")[^>]*>/gu

const pages = [...new Glob("**/index.html").scanSync(CLIENT_DIR)].sort()

if (pages.length === 0) {
  throw new Error(`No prerendered pages found under ${CLIENT_DIR}.`)
}

let strippedHints = 0
let retainedHints = 0

for (const page of pages) {
  const path = join(CLIENT_DIR, page)
  const html = readFileSync(path, "utf8")
  const moduleEntries = new Set([...html.matchAll(MODULE_SCRIPT_PATTERN)].map((match) => match[1]))
  const optimized = html.replaceAll(PRELOAD_PATTERN, (_tag: string, hint: string) => {
    if (!existsSync(join(CLIENT_DIR, hint))) {
      throw new Error(`${page}: modulepreload target ${hint} does not exist on disk.`)
    }
    // Keep only the page's own entry, at low priority: it is still discovered early, but stays behind the render-critical
    // CSS and fonts. At its default High priority Lighthouse counts it as render-blocking (−375 ms simulated mobile FCP).
    if (moduleEntries.has(hint)) {
      retainedHints += 1
      return `<link rel="modulepreload" href="${hint}" fetchpriority="low"/>`
    }
    strippedHints += 1
    return ""
  })

  writeFileSync(path, optimized)
}

if (strippedHints === 0 || retainedHints === 0) {
  throw new Error("Expected entry and dependency modulepreload hints in the pages — the build output shape has changed.")
}

console.log(`Optimized ${pages.length} pages: ${retainedHints} entry modulepreload hints retained at low priority, ${strippedHints} dependency hints stripped.`)
