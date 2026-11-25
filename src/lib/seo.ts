import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { APP_GITHUB_OWNER_URL, APP_INSTAGRAM_URL, APP_NAME, APP_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

export const ROBOTS = {
  FULL_PREVIEWS: "max-image-preview:large, max-snippet:-1, max-video-preview:-1",
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

export const ORGANIZATION_LOGO = {
  PATH: `/images/logo.${SOCIAL_IMAGE_FORMAT}`,
  SIZE: 512,
} as const

export const SITEMAP_PATH = "/sitemap.xml"

export const PAGES_SITEMAP_PATH = "/sitemap-pages.xml"

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

export interface ShareImage {
  readonly alt: string
  readonly height: number
  readonly path: string
  readonly type: string
  readonly width: number
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
}): ShareImage => {
  const card = { height: SOCIAL_IMAGE.HEIGHT, type: SOCIAL_IMAGE.TYPE, width: SOCIAL_IMAGE.WIDTH }
  if (ROUTES.isRequestRenderedRoute(deLocalizePathname(canonicalPath))) {
    return { ...card, alt: APP_NAME, path: SOCIAL_IMAGE.SITE_PATH }
  }

  const text = [title, section, APP_NAME].filter((part) => part !== undefined)

  return { ...card, alt: text.join(TITLE_SEPARATORS[locale]), path: socialImagePath(canonicalPath) }
}

export type PostDates = Readonly<{
  date: string | Date
  updated?: string | Date | undefined
}>

export const toIsoDate = (value: string | Date): string => new Date(value).toISOString()

export const postDates = ({ date, updated = date }: PostDates): { readonly modified: string; readonly published: string } => ({
  modified: toIsoDate(updated),
  published: toIsoDate(date),
})

const articleTimes = (dates: PostDates): { readonly content: string; readonly property: string }[] => {
  const { modified, published } = postDates(dates)

  return [
    { content: published, property: "article:published_time" },
    { content: modified, property: "article:modified_time" },
  ]
}

export const absoluteUrl = (baseUrl: string, path: string): string => new URL(path, baseUrl).toString()

export const localizedUrl = ({ baseUrl, locale, pathname }: { baseUrl: string; locale: SupportedLocale; pathname: string }): string =>
  absoluteUrl(baseUrl, localizePathname({ locale, pathname }))

export interface PageAuthor {
  readonly name: string
  readonly pathname: string
}

const authorMeta = ({ author, locale }: { author: PageAuthor; locale: SupportedLocale }) => [
  { content: author.name, name: "author" },
  { content: localizedUrl({ baseUrl: APP_URL, locale, pathname: author.pathname }), property: "article:author" },
]

export interface PageSequence {
  readonly next?: string | undefined
  readonly previous?: string | undefined
}

interface SequenceLink {
  readonly href: string
  readonly hrefLang?: string
  readonly rel: "next" | "prev"
}

const sequenceLink = ({
  locale,
  pathname,
  rel,
}: {
  locale: SupportedLocale
  pathname: string | undefined
  rel: SequenceLink["rel"]
}): SequenceLink[] => (pathname === undefined ? [] : [{ href: `${APP_URL}${localizePathname({ locale, pathname })}`, rel }])

export const buildPageHead = ({
  author,
  dates,
  description = "",
  image: shareImage,
  locale = I18N.DEFAULT_LOCALE,
  pathname,
  robots,
  section,
  sequence = {},
  title,
  type = "website",
}: {
  readonly author?: PageAuthor | undefined
  readonly dates?: PostDates | undefined
  readonly description?: string | undefined
  readonly image?: ShareImage | undefined
  readonly locale?: SupportedLocale | undefined
  readonly pathname: string
  readonly robots?: string | undefined
  readonly section?: string | undefined
  readonly sequence?: PageSequence | undefined
  readonly title?: string | undefined
  readonly type?: "article" | "profile" | "website"
}) => {
  const canonicalPath = localizePathname({ locale, pathname })
  const pageTitle = title === undefined ? APP_NAME : buildTitle({ locale, title })
  const shareTitle = title ?? APP_NAME
  const image = shareImage ?? socialImage({ canonicalPath, locale, section, title })
  const imageUrl = `${APP_URL}${image.path}`

  return {
    links: [
      ...localeLinks({ origin: APP_URL, pathname: canonicalPath }),
      ...sequenceLink({ locale, pathname: sequence.previous, rel: "prev" }),
      ...sequenceLink({ locale, pathname: sequence.next, rel: "next" }),
    ],
    meta: [
      { title: pageTitle },
      { content: description, name: "description" },
      ...(robots === undefined ? [] : [{ content: robots, name: "robots" }]),
      { content: APP_NAME, property: "og:site_name" },
      { content: shareTitle, property: "og:title" },
      { content: description, property: "og:description" },
      { content: type, property: "og:type" },
      { content: `${APP_URL}${canonicalPath}`, property: "og:url" },
      { content: toOpenGraphLocale(locale), property: "og:locale" },
      ...(section === undefined ? [] : [{ content: section, property: "article:section" }]),
      ...(dates === undefined ? [] : articleTimes(dates)),
      ...(author === undefined ? [] : authorMeta({ author, locale })),
      { content: imageUrl, property: "og:image" },
      { content: image.type, property: "og:image:type" },
      { content: String(image.width), property: "og:image:width" },
      { content: String(image.height), property: "og:image:height" },
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
  (pathname: string) =>
  ({ loaderData }: { loaderData?: PageLoaderData | undefined }) =>
    buildPageHead({ ...loaderData?.metadata, locale: loaderData?.locale, pathname })

export type StructuredDataNode = Record<string, unknown>

export const SCHEMA_CONTEXT = "https://schema.org"

export const SCHEMA_AVAILABILITY = {
  IN_STOCK: `${SCHEMA_CONTEXT}/InStock`,
} as const

export const ORGANIZATION: StructuredDataNode = {
  "@type": "Organization",
  email: CONTACT_EMAIL,
  logo: {
    "@type": "ImageObject",
    height: ORGANIZATION_LOGO.SIZE,
    url: `${APP_URL}${ORGANIZATION_LOGO.PATH}`,
    width: ORGANIZATION_LOGO.SIZE,
  },
  name: APP_NAME,
  sameAs: [APP_GITHUB_OWNER_URL, APP_INSTAGRAM_URL],
  url: APP_URL,
}

export const toStructuredDataHtml = (data: StructuredDataNode): { __html: string } => ({
  __html: JSON.stringify(data).replaceAll("<", String.raw`\u003c`),
})

export const ORGANIZATION_STRUCTURED_DATA_HTML = toStructuredDataHtml({ "@context": SCHEMA_CONTEXT, ...ORGANIZATION })
