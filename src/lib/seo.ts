import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

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

export const buildPageHead = ({
  description = "",
  locale = I18N.DEFAULT_LOCALE,
  pathname,
  title,
  type = "website",
}: {
  readonly description?: string | undefined
  readonly locale?: SupportedLocale | undefined
  readonly pathname: string
  readonly title?: string | undefined
  readonly type?: "article" | "website"
}) => {
  const canonicalPath = localizePathname({ locale, pathname })
  const pageTitle = title === undefined ? APP_NAME : buildTitle({ locale, title })

  return {
    links: [...localeLinks({ origin: APP_URL, pathname: canonicalPath })],
    meta: [
      { title: pageTitle },
      { content: description, name: "description" },
      { content: pageTitle, property: "og:title" },
      { content: description, property: "og:description" },
      { content: type, property: "og:type" },
      { content: `${APP_URL}${canonicalPath}`, property: "og:url" },
      { content: toOpenGraphLocale(locale), property: "og:locale" },
      { content: pageTitle, name: "twitter:title" },
      { content: description, name: "twitter:description" },
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
