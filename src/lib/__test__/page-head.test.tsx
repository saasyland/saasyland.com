import { renderToStaticMarkup } from "react-dom/server"

import { describe, expect, it } from "vite-plus/test"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { readPageHead } from "~/src/lib/page-head"
import { ROBOTS, SOCIAL_IMAGE, buildPageHead } from "~/src/lib/seo"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const DOCS_PAGE = `${ROUTES.DOCS}/conventions/files-and-naming`

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
      canonical: `${APP_URL}/ja-JP${DOCS_PAGE}`,
      image: `${APP_URL}/images/og/ja-JP${DOCS_PAGE}.${SOCIAL_IMAGE.FORMAT}`,
      lang: "ja-JP",
      robots: undefined,
      section: "規約",
      title: "ファイルと命名",
    })
  })

  it("decodes the characters React escapes in attribute values", () => {
    const title = `Tom & Jerry's "quoted" <tags>`

    const document = renderDocument(buildPageHead({ pathname: ROUTES.BLOG, title }), "en-US")

    expect(readPageHead(document).title).toBe(title)
  })

  it("reads the robots directive of a page that asks not to be indexed", () => {
    const head = buildPageHead({ indexable: false, pathname: ROUTES.PREMIUM, title: "Premium" })

    expect(readPageHead(renderDocument(head, "en-US"))).toMatchObject({ robots: ROBOTS.NOINDEX, section: undefined })
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
