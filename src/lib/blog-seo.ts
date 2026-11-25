import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { BLOG_AUTHORS, BLOG_COVER, type BlogAuthor } from "~/src/data/blog"

import { blogAuthorPath } from "~/src/lib/blog-archive"
import {
  ORGANIZATION,
  type PageAuthor,
  type PostDates,
  SCHEMA_CONTEXT,
  type StructuredDataNode,
  absoluteUrl,
  buildTitle,
  localizedUrl,
  postDates,
  toIsoDate,
  toStructuredDataHtml,
} from "~/src/lib/seo"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

export const pageAuthor = (author: BlogAuthor): PageAuthor => ({ name: BLOG_AUTHORS[author].name, pathname: blogAuthorPath(author) })

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

type PostStructuredData = Readonly<{
  "@context": string
  "@graph": StructuredDataNode[]
}>

const authorUrl = ({ author, baseUrl, locale }: Omit<AuthorStructuredDataInput, "authorRole">): string =>
  localizedUrl({ baseUrl, locale, pathname: blogAuthorPath(author) })

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
