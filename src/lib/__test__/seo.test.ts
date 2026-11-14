import { describe, expect, it } from "vite-plus/test"

import {
  ROBOTS,
  SOCIAL_IMAGE,
  buildBlogPostStructuredData,
  buildBlogPostStructuredDataHtml,
  buildPageHead,
  pageHead,
  socialImagePath,
} from "~/src/lib/seo"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const GRAPH_NODES_WITHOUT_FAQ = 2

const BASE_INPUT = {
  authorName: "Piotr J. Borowiecki",
  baseUrl: "https://saasyland.com",
  date: "2026-08-15",
  title: "A post",
  url: "/blog/a-post",
} as const

describe("blog post structured data", () => {
  it("emits a BlogPosting and a BreadcrumbList with absolute urls", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph.map((node) => node["@type"])).toStrictEqual(["BlogPosting", "BreadcrumbList"])
    expect(graph[0]?.["url"]).toBe("https://saasyland.com/blog/a-post")
    expect(graph[0]?.["datePublished"]).toBe("2026-08-15T00:00:00.000Z")
  })

  it("falls back to the published date when no update date is given", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph[0]?.["dateModified"]).toBe(graph[0]?.["datePublished"])
  })

  it("uses the update date when one is given", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, updated: "2026-09-01" })["@graph"]
    expect(graph[0]?.["dateModified"]).toBe("2026-09-01T00:00:00.000Z")
  })

  it("resolves a relative image path against the base url", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, description: "A summary", image: "/images/blog/a.webp" })["@graph"]
    expect(graph[0]?.["image"]).toBe("https://saasyland.com/images/blog/a.webp")
    expect(graph[0]?.["description"]).toBe("A summary")
  })

  it("omits description and image when the frontmatter has neither", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph[0]).not.toHaveProperty("description")
    expect(graph[0]).not.toHaveProperty("image")
  })

  it("appends an FAQPage when the post declares faq entries", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, faq: [{ answer: "Because.", question: "Why?" }] })["@graph"]
    expect(graph.map((node) => node["@type"])).toStrictEqual(["BlogPosting", "BreadcrumbList", "FAQPage"])
    expect(graph[2]?.["mainEntity"]).toStrictEqual([
      { "@type": "Question", acceptedAnswer: { "@type": "Answer", text: "Because." }, name: "Why?" },
    ])
  })

  it("skips the FAQPage when the faq list is empty", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, faq: [] })["@graph"]
    expect(graph).toHaveLength(GRAPH_NODES_WITHOUT_FAQ)
  })
})

it("escapes structured data so post titles cannot close the script element", () => {
  const output = buildBlogPostStructuredDataHtml({ ...BASE_INPUT, title: "</script><script>alert(1)</script>" })
  const { __html: html } = output
  expect(html).not.toContain("<")
  expect(JSON.parse(html)).toEqual(buildBlogPostStructuredData({ ...BASE_INPUT, title: "</script><script>alert(1)</script>" }))
})

it("leaves og:locale:alternate to the root document, because route heads keep only one tag per property", () => {
  const { meta } = buildPageHead({ locale: "pl-PL", pathname: ROUTES.BLOG })
  expect(meta).toContainEqual({ content: "pl_PL", property: "og:locale" })
  expect(meta).not.toContainEqual(expect.objectContaining({ property: "og:locale:alternate" }))
})

const imageUrl = (path: string): string => `${APP_URL}/images/og${path}.${SOCIAL_IMAGE.FORMAT}`

describe("social preview", () => {
  it("gives a prerendered page its own card, described in the page's locale", () => {
    const { meta } = buildPageHead({
      locale: "de-DE",
      pathname: "/docs/conventions",
      section: "Konventionen",
      title: "Dateien",
      type: "article",
    })

    expect(meta).toStrictEqual(
      expect.arrayContaining([
        { content: APP_NAME, property: "og:site_name" },
        { content: "Dateien", property: "og:title" },
        { content: "Konventionen", property: "article:section" },
        { content: imageUrl("/de-DE/docs/conventions"), property: "og:image" },
        { content: SOCIAL_IMAGE.TYPE, property: "og:image:type" },
        { content: String(SOCIAL_IMAGE.WIDTH), property: "og:image:width" },
        { content: String(SOCIAL_IMAGE.HEIGHT), property: "og:image:height" },
        { content: `Dateien – Konventionen – ${APP_NAME}`, property: "og:image:alt" },
        { content: SOCIAL_IMAGE.TWITTER_CARD, name: "twitter:card" },
        { content: "Dateien", name: "twitter:title" },
        { content: imageUrl("/de-DE/docs/conventions"), name: "twitter:image" },
        { content: `Dateien – Konventionen – ${APP_NAME}`, name: "twitter:image:alt" },
      ]),
    )
  })

  it("names the home page's card after the index", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.HOME, title: "Starter kit" })

    expect(meta).toContainEqual({ content: imageUrl("/index"), property: "og:image" })
    expect(meta).toContainEqual({ content: `Starter kit — ${APP_NAME}`, property: "og:image:alt" })
    expect(meta).not.toContainEqual(expect.objectContaining({ property: "article:section" }))
  })

  it.each([ROUTES.APP, ROUTES.SIGN_IN, `/pl-PL${ROUTES.ADMIN_USERS}`])("gives %s, which is not prerendered, the site card", (pathname) => {
    const { meta } = buildPageHead({ locale: "pl-PL", pathname, title: "Panel" })

    expect(meta).toContainEqual({ content: `${APP_URL}${SOCIAL_IMAGE.SITE_PATH}`, property: "og:image" })
    expect(meta).toContainEqual({ content: APP_NAME, property: "og:image:alt" })
  })

  it("describes the card of a page without a title by the site name alone", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.DOCS })

    expect(meta).toContainEqual({ content: APP_NAME, property: "og:title" })
    expect(meta).toContainEqual({ content: APP_NAME, property: "og:image:alt" })
  })
})

describe("robots directive", () => {
  it("asks crawlers not to index a page that is not indexable", () => {
    expect(buildPageHead({ indexable: false, pathname: ROUTES.PREMIUM }).meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
  })

  it("leaves the robots directive of an indexable page to the deployment", () => {
    expect(buildPageHead({ pathname: ROUTES.PREMIUM }).meta).not.toContainEqual(expect.objectContaining({ name: "robots" }))
  })

  it("passes the indexing choice of a route through its page head", () => {
    expect(pageHead(ROUTES.PREMIUM, { indexable: false })({ loaderData: undefined }).meta).toContainEqual({
      content: ROBOTS.NOINDEX,
      name: "robots",
    })
    expect(pageHead(ROUTES.TERMS)({ loaderData: undefined }).meta).not.toContainEqual(expect.objectContaining({ name: "robots" }))
  })
})

it("names social images after the canonical path", () => {
  expect(socialImagePath(ROUTES.HOME)).toBe(`/images/og/index.${SOCIAL_IMAGE.FORMAT}`)
  expect(socialImagePath("/uk-UA/blog/post")).toBe(`/images/og/uk-UA/blog/post.${SOCIAL_IMAGE.FORMAT}`)
})
