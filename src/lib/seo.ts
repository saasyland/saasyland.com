import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES, isUnlistedRoute } from "~/src/routes"

export const ROBOTS = {
  NOINDEX: "noindex",
  NON_PRODUCTION: "noindex, nofollow",
} as const

const SOCIAL_IMAGE_DIRECTORY = "/images/og"
const SOCIAL_IMAGE_FORMAT = "png"
const HOME_IMAGE_NAME = "/index"

export const SOCIAL_IMAGE = {
  FORMAT: SOCIAL_IMAGE_FORMAT,
  HEIGHT: 630,
  SITE_PATH: `${SOCIAL_IMAGE_DIRECTORY}/site.${SOCIAL_IMAGE_FORMAT}`,
  TWITTER_CARD: "summary_large_image",
  TYPE: `image/${SOCIAL_IMAGE_FORMAT}`,
  WIDTH: 1200,
} as const

export const SITEMAP_PATH = "/sitemap.xml"

const TITLE_SEPARATORS: Record<SupportedLocale, string> = {
  "de-DE": " – ",
  "en-US": " — ",
  "es-ES": " – ",
  "fr-FR": " – ",
  "it-IT": " – ",
  "ja-JP": "｜",
  "pl-PL": " – ",
  "pt-BR": " – ",
  "uk-UA": " – ",
}

export const toOpenGraphLocale = (locale: SupportedLocale): string => locale.replace("-", "_")

export const buildTitle = ({ locale, title }: { locale: SupportedLocale; title: string }): string =>
  `${title}${TITLE_SEPARATORS[locale]}${APP_NAME}`

export const socialImagePath = (canonicalPath: string): string => {
  const name = canonicalPath === ROUTES.HOME ? HOME_IMAGE_NAME : canonicalPath

  return `${SOCIAL_IMAGE_DIRECTORY}${name}.${SOCIAL_IMAGE_FORMAT}`
}

const socialImage = ({
  canonicalPath,
  locale,
  section,
  title,
}: {
  readonly canonicalPath: string
  readonly locale: SupportedLocale
  readonly section: string | undefined
  readonly title: string | undefined
}): { readonly alt: string; readonly path: string } => {
  if (isUnlistedRoute(deLocalizePathname(canonicalPath))) {
    return { alt: APP_NAME, path: SOCIAL_IMAGE.SITE_PATH }
  }

  const text = [title, section, APP_NAME].filter((part) => part !== undefined)

  return { alt: text.join(TITLE_SEPARATORS[locale]), path: socialImagePath(canonicalPath) }
}

export const buildPageHead = ({
  description = "",
  indexable = true,
  locale = I18N.DEFAULT_LOCALE,
  pathname,
  section,
  title,
  type = "website",
}: {
  readonly description?: string | undefined
  readonly indexable?: boolean
  readonly locale?: SupportedLocale | undefined
  readonly pathname: string
  readonly section?: string | undefined
  readonly title?: string | undefined
  readonly type?: "article" | "website"
}) => {
  const canonicalPath = localizePathname({ locale, pathname })
  const pageTitle = title === undefined ? APP_NAME : buildTitle({ locale, title })
  const shareTitle = title ?? APP_NAME
  const image = socialImage({ canonicalPath, locale, section, title })
  const imageUrl = `${APP_URL}${image.path}`

  return {
    links: [...localeLinks({ origin: APP_URL, pathname: canonicalPath })],
    meta: [
      { title: pageTitle },
      { content: description, name: "description" },
      ...(indexable ? [] : [{ content: ROBOTS.NOINDEX, name: "robots" }]),
      { content: APP_NAME, property: "og:site_name" },
      { content: shareTitle, property: "og:title" },
      { content: description, property: "og:description" },
      { content: type, property: "og:type" },
      { content: `${APP_URL}${canonicalPath}`, property: "og:url" },
      { content: toOpenGraphLocale(locale), property: "og:locale" },
      ...(section === undefined ? [] : [{ content: section, property: "article:section" }]),
      { content: imageUrl, property: "og:image" },
      { content: SOCIAL_IMAGE.TYPE, property: "og:image:type" },
      { content: String(SOCIAL_IMAGE.WIDTH), property: "og:image:width" },
      { content: String(SOCIAL_IMAGE.HEIGHT), property: "og:image:height" },
      { content: image.alt, property: "og:image:alt" },
      { content: SOCIAL_IMAGE.TWITTER_CARD, name: "twitter:card" },
      { content: shareTitle, name: "twitter:title" },
      { content: description, name: "twitter:description" },
      { content: imageUrl, name: "twitter:image" },
      { content: image.alt, name: "twitter:image:alt" },
    ],
  }
}

export interface PageLoaderData {
  readonly locale: SupportedLocale
  readonly metadata: { readonly description: string; readonly title: string }
}

export const pageHead =
  (pathname: string, { indexable = true }: { readonly indexable?: boolean } = {}) =>
  ({ loaderData }: { loaderData?: PageLoaderData | undefined }) =>
    buildPageHead({ ...loaderData?.metadata, indexable, locale: loaderData?.locale, pathname })

type PostStructuredDataInput = Readonly<{
  authorName: string
  baseUrl: string
  date: string | Date
  description?: string | undefined
  faq?: readonly { answer: string; question: string }[] | undefined
  image?: string | undefined
  title: string
  updated?: string | Date | undefined
  url: string
}>

type StructuredDataNode = Record<string, unknown>

type PostStructuredData = Readonly<{
  "@context": string
  "@graph": StructuredDataNode[]
}>

const toIsoDate = (value: string | Date): string => new Date(value).toISOString()

const absoluteUrl = (baseUrl: string, path: string): string => new URL(path, baseUrl).toString()

export const buildBlogPostStructuredData = (input: PostStructuredDataInput): PostStructuredData => {
  const canonical = absoluteUrl(input.baseUrl, input.url)
  const published = toIsoDate(input.date)

  const article: StructuredDataNode = {
    "@type": "BlogPosting",
    author: { "@type": "Person", name: input.authorName },
    dateModified: input.updated === undefined ? published : toIsoDate(input.updated),
    datePublished: published,
    headline: input.title,
    mainEntityOfPage: { "@id": canonical, "@type": "WebPage" },
    publisher: { "@type": "Organization", name: APP_NAME, url: input.baseUrl },
    url: canonical,
  }

  if (input.description !== undefined) {
    article["description"] = input.description
  }

  if (input.image !== undefined) {
    article["image"] = absoluteUrl(input.baseUrl, input.image)
  }

  const graph: Record<string, unknown>[] = [
    article,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: absoluteUrl(input.baseUrl, ROUTES.HOME), name: "Home", position: 1 },
        { "@type": "ListItem", item: absoluteUrl(input.baseUrl, ROUTES.BLOG), name: "Blog", position: 2 },
        { "@type": "ListItem", item: canonical, name: input.title, position: 3 },
      ],
    },
  ]

  if (input.faq !== undefined && input.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: input.faq.map((entry) => ({
        "@type": "Question",
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
        name: entry.question,
      })),
    })
  }

  return { "@context": "https://schema.org", "@graph": graph }
}

export const buildBlogPostStructuredDataHtml = (input: PostStructuredDataInput): { __html: string } => ({
  __html: JSON.stringify(buildBlogPostStructuredData(input)).replaceAll("<", String.raw`\u003c`),
})
