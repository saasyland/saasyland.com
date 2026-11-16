import { Glob } from "bun"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { securePrerenderedPage } from "~/src/lib/prerendered-policy"

const CLIENT_DIR = "dist/client"

const pages = [...new Glob("**/index.html").scanSync(CLIENT_DIR)].toSorted()

if (pages.length === 0) {
  throw new Error(`No prerendered pages found under ${CLIENT_DIR}.`)
}

const hashes = await Promise.all(
  pages.map(async (page) => {
    const path = join(CLIENT_DIR, page)
    const secured = await securePrerenderedPage(await readFile(path, "utf8")).catch((error: unknown) => {
      throw new Error(`${page}: the build output shape has changed.`, { cause: error })
    })
    await writeFile(path, secured.html)

    return secured.hashes
  }),
)

console.log(
  `Secured ${pages.length} pages with a hash-based script policy: ${hashes.reduce((total, count) => total + count, 0)} inline script hashes, each entry loaded by a hashed loader.`,
)
