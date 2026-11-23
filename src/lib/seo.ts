import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { isUnlistedRoute } from "~/src/areas/shared"
import { BLOG_AUTHORS, BLOG_COVER, type BlogAuthor, blogAuthorPath } from "~/src/data/blog"

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
  if (isUnlistedRoute(deLocalizePathname(canonicalPath))) {
    return { ...card, alt: APP_NAME, path: SOCIAL_IMAGE.SITE_PATH }
  }

  const text = [title, section, APP_NAME].filter((part) => part !== undefined)

  return { ...card, alt: text.join(TITLE_SEPARATORS[locale]), path: socialImagePath(canonicalPath) }
}

type PostDates = Readonly<{
  date: string | Date
  updated?: string | Date | undefined
}>

const toIsoDate = (value: string | Date): string => new Date(value).toISOString()

const postDates = ({ date, updated = date }: PostDates): { readonly modified: string; readonly published: string } => ({
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

const absoluteUrl = (baseUrl: string, path: string): string => new URL(path, baseUrl).toString()

const localizedUrl = ({ baseUrl, locale, pathname }: { baseUrl: string; locale: SupportedLocale; pathname: string }): string =>
  absoluteUrl(baseUrl, localizePathname({ locale, pathname }))

const authorUrl = ({ author, baseUrl, locale }: Omit<AuthorStructuredDataInput, "authorRole">): string =>
  localizedUrl({ baseUrl, locale, pathname: blogAuthorPath(author) })

const authorMeta = ({ author, locale }: { author: BlogAuthor; locale: SupportedLocale }) => [
  { content: BLOG_AUTHORS[author].name, name: "author" },
  { content: authorUrl({ author, baseUrl: APP_URL, locale }), property: "article:author" },
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
  section,
  sequence = {},
  title,
  type = "website",
}: {
  readonly author?: BlogAuthor | undefined
  readonly dates?: PostDates | undefined
  readonly description?: string | undefined
  readonly image?: ShareImage | undefined
  readonly locale?: SupportedLocale | undefined
  readonly pathname: string
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

type AuthorStructuredDataInput = Readonly<{
  author: BlogAuthor
  authorRole: string
  baseUrl: string
  locale: SupportedLocale
}>

type PostStructuredDataInput = PostDates &
  AuthorStructuredDataInput &
  Readonly<{
    blogTitle: string
    description?: string | undefined
    faq?: readonly { answer: string; question: string }[] | undefined
    image?: string | undefined
    keywords: readonly string[]
    locale: SupportedLocale
    title: string
    url: string
  }>

type StructuredDataNode = Record<string, unknown>

type PostStructuredData = Readonly<{
  "@context": string
  "@graph": StructuredDataNode[]
}>

const SCHEMA_CONTEXT = "https://schema.org"

const ORGANIZATION: StructuredDataNode = {
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

const toStructuredDataHtml = (data: StructuredDataNode): { __html: string } => ({
  __html: JSON.stringify(data).replaceAll("<", String.raw`\u003c`),
})

export const ORGANIZATION_STRUCTURED_DATA_HTML = toStructuredDataHtml({ "@context": SCHEMA_CONTEXT, ...ORGANIZATION })

const authorPerson = ({ author, authorRole, baseUrl, locale }: AuthorStructuredDataInput): StructuredDataNode => {
  const { image, name, profiles } = BLOG_AUTHORS[author]
  const url = authorUrl({ author, baseUrl, locale })

  return {
    "@id": `${url}#person`,
    "@type": "Person",
    image: absoluteUrl(baseUrl, image),
    jobTitle: authorRole,
    name,
    sameAs: profiles.map((profile) => profile.url),
    url,
  }
}

export const buildBlogPostStructuredData = (input: PostStructuredDataInput): PostStructuredData => {
  const canonical = absoluteUrl(input.baseUrl, input.url)
  const { modified, published } = postDates(input)
  const person = authorPerson(input)

  const article: StructuredDataNode = {
    "@type": "BlogPosting",
    author: { "@id": person["@id"] },
    dateModified: modified,
    datePublished: published,
    headline: input.title,
    inLanguage: input.locale,
    mainEntityOfPage: { "@id": canonical, "@type": "WebPage" },
    publisher: ORGANIZATION,
    url: canonical,
  }

  if (input.description !== undefined) {
    article["description"] = input.description
  }

  if (input.image !== undefined) {
    article["image"] = {
      "@type": "ImageObject",
      height: BLOG_COVER.HEIGHT,
      url: absoluteUrl(input.baseUrl, input.image),
      width: BLOG_COVER.WIDTH,
    }
  }

  if (input.keywords.length > 0) {
    article["keywords"] = input.keywords
  }

  const graph: StructuredDataNode[] = [
    article,
    person,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          item: localizedUrl({ baseUrl: input.baseUrl, locale: input.locale, pathname: ROUTES.HOME }),
          name: APP_NAME,
          position: 1,
        },
        {
          "@type": "ListItem",
          item: localizedUrl({ baseUrl: input.baseUrl, locale: input.locale, pathname: ROUTES.BLOG }),
          name: input.blogTitle,
          position: 2,
        },
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

  return { "@context": SCHEMA_CONTEXT, "@graph": graph }
}

export const buildBlogPostStructuredDataHtml = (input: PostStructuredDataInput): { __html: string } =>
  toStructuredDataHtml(buildBlogPostStructuredData(input))

type BlogListing = Readonly<{ date: string | Date; title: string; url: string }>

type BlogListInput = Readonly<{
  listed: readonly BlogListing[]
  locale: SupportedLocale
  offset: number
  pathname: string
  total: number
}>

type BlogStructuredDataInput = BlogListInput &
  Readonly<{
    description: string
    posts: readonly BlogListing[]
    title: string
  }>

type BlogArchiveStructuredDataInput = BlogListInput &
  Readonly<{
    blogTitle: string
    description: string
    title: string
  }>

const ITEM_LIST_ORDER_DESCENDING = "https://schema.org/ItemListOrderDescending"

const blogIds = ({ locale, pathname }: Pick<BlogListInput, "locale" | "pathname">) => {
  const blogUrl = localizedUrl({ baseUrl: APP_URL, locale, pathname: ROUTES.BLOG })
  const pageUrl = localizedUrl({ baseUrl: APP_URL, locale, pathname })

  return { blogId: `${blogUrl}#blog`, blogUrl, listId: `${pageUrl}#posts`, pageUrl }
}

const blogList = ({ listed, locale, offset, pathname, total }: BlogListInput): StructuredDataNode => ({
  "@id": blogIds({ locale, pathname }).listId,
  "@type": "ItemList",
  itemListElement: listed.map((post, index) => ({
    "@type": "ListItem",
    name: post.title,
    position: offset + index + 1,
    url: absoluteUrl(APP_URL, post.url),
  })),
  itemListOrder: ITEM_LIST_ORDER_DESCENDING,
  numberOfItems: total,
})

export const buildBlogStructuredData = ({ description, posts, title, ...list }: BlogStructuredDataInput): PostStructuredData => {
  const { blogId, blogUrl, listId } = blogIds(list)

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      {
        "@id": blogId,
        "@type": "Blog",
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          datePublished: toIsoDate(post.date),
          headline: post.title,
          url: absoluteUrl(APP_URL, post.url),
        })),
        description,
        inLanguage: list.locale,
        mainEntityOfPage: { "@id": listId },
        name: buildTitle({ locale: list.locale, title }),
        publisher: ORGANIZATION,
        url: blogUrl,
      },
      blogList(list),
    ],
  }
}

export const buildBlogStructuredDataHtml = (input: BlogStructuredDataInput): { __html: string } =>
  toStructuredDataHtml(buildBlogStructuredData(input))

export const buildBlogArchiveStructuredData = ({
  blogTitle,
  description,
  title,
  ...list
}: BlogArchiveStructuredDataInput): PostStructuredData => {
  const { blogId, blogUrl, listId, pageUrl } = blogIds(list)

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      {
        "@id": pageUrl,
        "@type": "CollectionPage",
        description,
        inLanguage: list.locale,
        isPartOf: { "@id": blogId, "@type": "Blog", url: blogUrl },
        mainEntity: { "@id": listId },
        name: buildTitle({ locale: list.locale, title }),
        url: pageUrl,
      },
      blogList(list),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            item: localizedUrl({ baseUrl: APP_URL, locale: list.locale, pathname: ROUTES.HOME }),
            name: APP_NAME,
            position: 1,
          },
          { "@type": "ListItem", item: blogUrl, name: blogTitle, position: 2 },
          { "@type": "ListItem", item: pageUrl, name: title, position: 3 },
        ],
      },
    ],
  }
}

export const buildBlogArchiveStructuredDataHtml = (input: BlogArchiveStructuredDataInput): { __html: string } =>
  toStructuredDataHtml(buildBlogArchiveStructuredData(input))

type ProfileStructuredDataInput = AuthorStructuredDataInput &
  Readonly<{
    description: string
  }>

export const buildAuthorStructuredData = ({ description, ...input }: ProfileStructuredDataInput): PostStructuredData => {
  const person = authorPerson(input)
  const pageUrl = authorUrl(input)

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      {
        "@id": pageUrl,
        "@type": "ProfilePage",
        description,
        inLanguage: input.locale,
        mainEntity: { "@id": person["@id"] },
        name: buildTitle({ locale: input.locale, title: BLOG_AUTHORS[input.author].name }),
        url: pageUrl,
      },
      person,
    ],
  }
}

export const buildAuthorStructuredDataHtml = (input: ProfileStructuredDataInput): { __html: string } =>
  toStructuredDataHtml(buildAuthorStructuredData(input))
