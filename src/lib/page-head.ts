import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

const HEAD_END = "</head>"
const TAG = /<(?<tag>link|meta)\b(?<attributes>[^>]*)>/giu
const ATTRIBUTE = /(?<name>[\w:-]+)="(?<value>[^"]*)"/gu
const DOCUMENT_LANGUAGE = /<html\b[^>]*\blang="(?<lang>[^"]+)"/u

const TAG_NAME = {
  LINK: "link",
  META: "meta",
} as const

const REL = {
  ALTERNATE: "alternate",
  CANONICAL: "canonical",
} as const

const unescape = (value: string): string =>
  value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&")

const tagSchema = zod.object({ attributes: zod.string(), tag: zod.string().toLowerCase() })
const attributeSchema = zod.object({ name: zod.string().toLowerCase(), value: zod.string().transform(unescape) })

const alternateSchema = zod.object({ href: zod.url(), hreflang: zod.string() })

const pageHeadSchema = zod.object({
  alternates: zod.array(alternateSchema),
  canonical: zod.url(),
  image: zod.url(),
  lang: zod.enum(I18N.SUPPORTED_LOCALES),
  robots: zod.string().optional(),
  section: zod.string().optional(),
  title: zod.string(),
})

export type PageHead = zod.infer<typeof pageHeadSchema>

interface HeadTag {
  readonly attributes: ReadonlyMap<string, string>
  readonly tag: string
}

const readTag = ({ groups }: RegExpExecArray): HeadTag => {
  const { attributes, tag } = tagSchema.parse(groups)

  return {
    attributes: new Map(
      Array.from(attributes.matchAll(ATTRIBUTE), (match) => {
        const { name, value } = attributeSchema.parse(match.groups)

        return [name, value]
      }),
    ),
    tag,
  }
}

export const readPageHead = (html: string): PageHead => {
  const tags = Array.from(html.slice(0, html.indexOf(HEAD_END)).matchAll(TAG), readTag)
  const links = (rel: string) => tags.filter(({ attributes, tag }) => tag === TAG_NAME.LINK && attributes.get("rel") === rel)
  const content = (key: string): string | undefined =>
    tags
      .find(({ attributes, tag }) => tag === TAG_NAME.META && (attributes.get("property") ?? attributes.get("name")) === key)
      ?.attributes.get("content")

  return pageHeadSchema.parse({
    ...DOCUMENT_LANGUAGE.exec(html)?.groups,
    alternates: links(REL.ALTERNATE)
      .filter(({ attributes }) => attributes.has("hreflang"))
      .map(({ attributes }) => ({ href: attributes.get("href"), hreflang: attributes.get("hreflang") })),
    canonical: links(REL.CANONICAL).at(0)?.attributes.get("href"),
    image: content("og:image"),
    robots: content("robots"),
    section: content("article:section"),
    title: content("og:title"),
  })
}
