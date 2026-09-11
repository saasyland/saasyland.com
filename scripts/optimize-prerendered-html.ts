import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { Glob } from "bun"

const CLIENT_DIR = "dist/client"
const PRELOAD_PATTERN = /<link rel="modulepreload" href="(\/assets\/[^"]+)"\/>/gu

const pages = [...new Glob("**/index.html").scanSync(CLIENT_DIR)].sort()

if (pages.length === 0) {
  throw new Error(`No prerendered pages found under ${CLIENT_DIR}.`)
}

let strippedHints = 0

for (const page of pages) {
  const path = join(CLIENT_DIR, page)
  const html = readFileSync(path, "utf8")
  const optimized = html.replaceAll(PRELOAD_PATTERN, (_tag: string, hint: string) => {
    if (!existsSync(join(CLIENT_DIR, hint))) {
      throw new Error(`${page}: modulepreload target ${hint} does not exist on disk.`)
    }
    strippedHints += 1
    return ""
  })

  writeFileSync(path, optimized)
}

if (strippedHints === 0) {
  throw new Error("No modulepreload hints were found in any page — the build output shape has changed.")
}

console.log(`Optimized ${pages.length} pages: ${strippedHints} modulepreload hints stripped.`)
