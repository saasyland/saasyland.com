import { existsSync, globSync, readFileSync } from "node:fs"
import sharp from "sharp"
import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AUTHOR_IMAGE_SIZE, BLOG_AUTHORS, BLOG_COVER, FEATURED_BLOG_POSTS } from "~/src/data/blog"

const COVER = /^image:\s*(?<path>\/\S+)$/mu

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

it.each(Object.values(BLOG_AUTHORS))(
  "serves the photo of $name from this site at the size its image elements declare",
  async ({ image }) => {
    const { height, width } = await sharp(`public${image}`).metadata()

    expect({ height, width }).toStrictEqual({ height: AUTHOR_IMAGE_SIZE, width: AUTHOR_IMAGE_SIZE })
  },
)

it.each(FEATURED_BLOG_POSTS)("features %s, a post that exists in every locale", (slug) => {
  expect(I18N.SUPPORTED_LOCALES.filter((locale) => !existsSync(`content/blog/${slug}.${locale}.mdx`))).toStrictEqual([])
})
