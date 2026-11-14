import { Glob } from "bun"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { createSocialCardRenderer } from "~/src/integrations/takumi/takumi.render"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { readPageHead } from "~/src/lib/page-head"
import { SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"
import { buildSitemap, listedPages } from "~/src/lib/sitemap"

import { APP_URL } from "~/src/presentation/branding"

const CLIENT_DIR = "dist/client"
const ROBOTS_TXT = "robots.txt"
const DURATION_DECIMALS = 1

const started = performance.now()

const files = [...new Glob("**/index.html").scanSync(CLIENT_DIR)].toSorted()

if (files.length === 0) {
  throw new Error(`No prerendered pages found under ${CLIENT_DIR}.`)
}

const pages = await Promise.all(files.map(async (file) => readPageHead(await readFile(join(CLIENT_DIR, file), "utf8"))))
const listed = listedPages(pages, await readFile(join(CLIENT_DIR, ROBOTS_TXT), "utf8"))

await writeFile(join(CLIENT_DIR, SITEMAP_PATH), buildSitemap(listed))

const imagePath = (url: string): string => {
  const image = new URL(url)

  if (image.origin !== APP_URL) {
    throw new Error(`Social image ${url} is not on ${APP_URL}.`)
  }

  return image.pathname
}

const render = await createSocialCardRenderer()
const cards = new Map<string, () => Promise<Buffer>>([[SOCIAL_IMAGE.SITE_PATH, render.site]])

for (const page of pages) {
  const path = imagePath(page.image)

  if (path !== SOCIAL_IMAGE.SITE_PATH) {
    if (cards.has(path)) {
      throw new Error(`Two prerendered pages name the social image ${path}.`)
    }

    cards.set(path, () => render.page(page))
  }
}

await Promise.all(
  Array.from(cards, async ([path, draw]) => {
    const target = join(CLIENT_DIR, path)

    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await draw())
  }),
)

const seconds = ((performance.now() - started) / MILLISECONDS_PER_SECOND).toFixed(DURATION_DECIMALS)

console.log(
  `Wrote ${SITEMAP_PATH} with ${listed.length} of ${pages.length} prerendered pages and ${cards.size} social images in ${seconds} s.`,
)
