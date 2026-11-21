import { existsSync, globSync, readFileSync } from "node:fs"
import sharp from "sharp"
import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { BLOG_COVER, FEATURED_BLOG_POSTS } from "~/src/data/blog"

const COVER = /^image:\s*(?<path>\/\S+)$/mu
const AUTHOR_IMAGE = /^authorImage:\s*(?<path>\/\S+)$/mu

const imagesOf = (pattern: RegExp): string[] => [
  ...new Set(
    globSync("content/blog/*.mdx")
      .toSorted()
      .map((post) => pattern.exec(readFileSync(post, "utf8"))?.groups?.["path"])
      .filter((path) => path !== undefined),
  ),
]

it.each(imagesOf(COVER))("keeps the cover %s at the size its image element and structured data declare", async (path) => {
  const { height, width } = await sharp(`public${path}`).metadata()

  expect({ height, width }).toStrictEqual({ height: BLOG_COVER.HEIGHT, width: BLOG_COVER.WIDTH })
})

it.each(imagesOf(AUTHOR_IMAGE))("serves the author image %s from this site", (path) => {
  expect(existsSync(`public${path}`)).toBe(true)
})

it.each(FEATURED_BLOG_POSTS)("features %s, a post that exists in every locale", (slug) => {
  expect(I18N.SUPPORTED_LOCALES.filter((locale) => !existsSync(`content/blog/${slug}.${locale}.mdx`))).toStrictEqual([])
})
