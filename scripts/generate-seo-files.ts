import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { createSocialCardRenderer } from "~/src/integrations/takumi/takumi.render"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { buildBlogFeeds } from "~/src/lib/feed"
import { readPageHead } from "~/src/lib/page-head"
import { ORGANIZATION_LOGO, PAGES_SITEMAP_PATH, SITEMAP_PATH, SOCIAL_IMAGE } from "~/src/lib/seo"
import { buildSitemap, buildSitemapIndex, listedPages } from "~/src/lib/sitemap"

import { CLIENT_DIR, listPrerenderedPages } from "./prerendered-pages.ts"
import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const ROBOTS_TXT = "robots.txt"

const SITEMAPS = [PAGES_SITEMAP_PATH, ROUTES.SITEMAPS.COURSES]

const started = performance.now()

const files = listPrerenderedPages()

const pages = await Promise.all(files.map(async (file) => readPageHead(await readFile(join(CLIENT_DIR, file), "utf8"))))
const listed = listedPages(pages, await readFile(join(CLIENT_DIR, ROBOTS_TXT), "utf8"))

const xmlFiles = [
  { path: SITEMAP_PATH, xml: buildSitemapIndex(SITEMAPS.map((path) => `${APP_URL}${path}`)) },
  { path: PAGES_SITEMAP_PATH, xml: buildSitemap(listed) },
  ...buildBlogFeeds(listed),
]

await Promise.all(xmlFiles.map(({ path, xml }) => writeFile(join(CLIENT_DIR, path), xml)))

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
  `Wrote ${xmlFiles.map(({ path }) => path).join(", ")} with ${listed.length} of ${pages.length} prerendered pages listed, the organisation logo and ${cards.size - 1} social images in ${seconds} s.`,
)
