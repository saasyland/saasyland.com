import { renderToStaticMarkup } from "react-dom/server"

import { describe, expect, it } from "vite-plus/test"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { readPageHead } from "~/src/lib/page-head"
import { ROBOTS, SOCIAL_IMAGE, buildPageHead } from "~/src/lib/seo"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const DOCS_PAGE = `${ROUTES.DOCS.INDEX}/conventions/files-and-naming`

const renderDocument = (head: ReturnType<typeof buildPageHead>, locale: SupportedLocale, body = ""): string => {
  const markup = renderToStaticMarkup(
    <html lang={locale}>
      <head>
        {head.meta.map((tag) => {
          if ("title" in tag) {
            return <title key="title">{tag.title}</title>
          }

          return <meta {...tag} key={"property" in tag ? tag.property : tag.name} />
        })}
        {head.links.map((link) => (
          <link {...link} key={`${link.rel}${link.hrefLang ?? ""}`} />
        ))}
      </head>
    </html>,
  )

  return `<!DOCTYPE html>${markup.replace("</head>", `</head><body>${body}</body>`)}`
}

describe("readPageHead", () => {
  it("reads back the social and search metadata buildPageHead renders", () => {
    const head = buildPageHead({ locale: "ja-JP", pathname: DOCS_PAGE, section: "規約", title: "ファイルと命名", type: "article" })

    const { alternates, ...page } = readPageHead(renderDocument(head, "ja-JP"))

    expect(alternates).toContainEqual({ href: `${APP_URL}/ja-JP${DOCS_PAGE}`, hreflang: "ja-JP" })
    expect(alternates).toContainEqual({ href: `${APP_URL}${DOCS_PAGE}`, hreflang: "x-default" })
    expect(page).toStrictEqual({
      author: undefined,
      canonical: `${APP_URL}/ja-JP${DOCS_PAGE}`,
      description: "",
      image: `${APP_URL}/images/og/ja-JP${DOCS_PAGE}.${SOCIAL_IMAGE.FORMAT}`,
      lang: "ja-JP",
      modified: undefined,
      published: undefined,
      robots: undefined,
      section: "規約",
      tags: [],
      title: "ファイルと命名",
    })
  })

  it("reads the time a blog post was last modified", () => {
    const head = buildPageHead({
      dates: { date: "2026-08-15", updated: "2026-11-17" },
      pathname: `${ROUTES.BLOG.INDEX}/post`,
      type: "article",
    })

    expect(readPageHead(renderDocument(head, "en-US")).modified).toBe("2026-11-17T00:00:00.000Z")
  })

  it("reads back an article's author, dates, description and every tag", () => {
    const head = buildPageHead({
      author: { name: "Ada Lovelace", pathname: "/authors/ada-lovelace" },
      dates: { date: "2026-08-15", updated: "2026-09-01" },
      description: "A post about tests",
      pathname: `${ROUTES.BLOG.INDEX}/post`,
      title: "Post",
      type: "article",
    })
    const tags = '<meta property="article:tag" content="Testing"/><meta property="article:tag" content="Tooling"/>'
    const document = renderDocument(head, "en-US").replace("</head>", `${tags}</head>`)

    expect(readPageHead(document)).toMatchObject({
      author: "Ada Lovelace",
      description: "A post about tests",
      modified: "2026-09-01T00:00:00.000Z",
      published: "2026-08-15T00:00:00.000Z",
      tags: ["Testing", "Tooling"],
    })
  })

  it("decodes the characters React escapes in attribute values", () => {
    const title = `Tom & Jerry's "quoted" <tags>`

    const document = renderDocument(buildPageHead({ pathname: ROUTES.BLOG.INDEX, title }), "en-US")

    expect(readPageHead(document).title).toBe(title)
  })

  it("reads the robots directive of a page that asks not to be indexed", () => {
    const head = buildPageHead({ pathname: ROUTES.HOME, title: "Home" })
    const noindex = { ...head, meta: [...head.meta, { content: ROBOTS.NOINDEX, name: "robots" }] }

    expect(readPageHead(renderDocument(noindex, "en-US"))).toMatchObject({ robots: ROBOTS.NOINDEX, section: undefined })
  })

  it("reads only the document head", () => {
    const head = buildPageHead({ pathname: ROUTES.HOME, title: "Home" })
    const document = renderDocument(head, "en-US", '<meta property="og:title" content="Body"/>')

    expect(readPageHead(document).title).toBe("Home")
  })

  it("refuses a page without a document language or social image", () => {
    const head = buildPageHead({ pathname: ROUTES.HOME, title: "Home" })

    expect(() => readPageHead(renderDocument(head, "en-US").replace(' lang="en-US"', ""))).toThrow()
    expect(() => readPageHead(renderDocument(head, "en-US").replace('property="og:image"', 'property="og:picture"'))).toThrow()
    expect(() => readPageHead(renderDocument(head, "en-US").replace('rel="canonical"', 'rel="bookmark"'))).toThrow()
  })
})
