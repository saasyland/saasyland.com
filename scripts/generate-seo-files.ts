import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { createSocialCardRenderer } from "~/src/integrations/takumi/takumi.render"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { buildBlogFeeds } from "~/src/lib/feed"
import { readPageHead } from "~/src/lib/page-head"
import { ORGANIZATION_LOGO, SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"
import { buildSitemap, listedPages } from "~/src/lib/sitemap"

import { CLIENT_DIR, listPrerenderedPages } from "./prerendered-pages.ts"
import { APP_URL } from "~/src/presentation/branding"

const ROBOTS_TXT = "robots.txt"

const started = performance.now()

const files = listPrerenderedPages()

const pages = await Promise.all(files.map(async (file) => readPageHead(await readFile(join(CLIENT_DIR, file), "utf8"))))
const listed = listedPages(pages, await readFile(join(CLIENT_DIR, ROBOTS_TXT), "utf8"))

await writeFile(join(CLIENT_DIR, SITEMAP_PATH), buildSitemap(listed))

const feeds = buildBlogFeeds(listed)

await Promise.all(feeds.map(({ path, xml }) => writeFile(join(CLIENT_DIR, path), xml)))

const imagePath = (url: string): string => {
  const image = new URL(url)

  if (image.origin !== APP_URL) {
    throw new Error(`Social image ${url} is not on ${APP_URL}.`)
  }

  return image.pathname
}

const render = await createSocialCardRenderer()
const cards = new Map<string, () => Promise<Buffer>>([
  [SOCIAL_IMAGE.SITE_PATH, render.site],
  [ORGANIZATION_LOGO.PATH, render.logo],
])

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

const seconds = ((performance.now() - started) / MILLISECONDS_PER_SECOND).toFixed(1)

console.log(
  `Wrote ${SITEMAP_PATH} with ${listed.length} of ${pages.length} prerendered pages, ${feeds.length} blog feeds, the organisation logo and ${cards.size - 1} social images in ${seconds} s.`,
)
