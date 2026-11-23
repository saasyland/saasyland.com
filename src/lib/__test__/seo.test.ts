import { describe, expect, it } from "vite-plus/test"

import { BLOG_AUTHOR, BLOG_AUTHORS, BLOG_COVER } from "~/src/data/blog"

import {
  ORGANIZATION_LOGO,
  ORGANIZATION_STRUCTURED_DATA_HTML,
  SOCIAL_IMAGE,
  buildAuthorStructuredData,
  buildAuthorStructuredDataHtml,
  buildBlogArchiveStructuredData,
  buildBlogArchiveStructuredDataHtml,
  buildBlogPostStructuredData,
  buildBlogPostStructuredDataHtml,
  buildBlogStructuredData,
  buildBlogStructuredDataHtml,
  buildPageHead,
  pageHead,
  socialImagePath,
} from "~/src/lib/seo"

import { APP_GITHUB_OWNER_URL, APP_INSTAGRAM_URL, APP_NAME, APP_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const GRAPH_NODES_WITHOUT_FAQ = 3

const AUTHOR = BLOG_AUTHORS[BLOG_AUTHOR.PIOTR_BOROWIECKI]

const AUTHOR_ROLE = "Founder · Engineer"

const PERSON = {
  "@id": "https://example.com/authors/piotr-borowiecki#person",
  "@type": "Person",
  image: `https://example.com${AUTHOR.image}`,
  jobTitle: AUTHOR_ROLE,
  name: AUTHOR.name,
  sameAs: AUTHOR.profiles.map(({ url }) => url),
  url: "https://example.com/authors/piotr-borowiecki",
}

const ORGANIZATION = {
  "@type": "Organization",
  email: CONTACT_EMAIL,
  logo: { "@type": "ImageObject", height: ORGANIZATION_LOGO.SIZE, url: `${APP_URL}/images/logo.png`, width: ORGANIZATION_LOGO.SIZE },
  name: APP_NAME,
  sameAs: [APP_GITHUB_OWNER_URL, APP_INSTAGRAM_URL],
  url: APP_URL,
}

const BASE_INPUT = {
  author: BLOG_AUTHOR.PIOTR_BOROWIECKI,
  authorRole: AUTHOR_ROLE,
  baseUrl: "https://example.com",
  blogTitle: "Blog",
  date: "2026-08-15",
  keywords: [],
  locale: "en-US",
  title: "A post",
  url: "/blog/a-post",
} as const

describe("blog post structured data", () => {
  it("emits a BlogPosting, its author and a BreadcrumbList with absolute urls", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph.map((node) => node["@type"])).toStrictEqual(["BlogPosting", "Person", "BreadcrumbList"])
    expect(graph[0]?.["url"]).toBe("https://example.com/blog/a-post")
    expect(graph[0]?.["datePublished"]).toBe("2026-08-15T00:00:00.000Z")
  })

  it("names the organisation as the publisher", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph[0]?.["publisher"]).toStrictEqual(ORGANIZATION)
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

  it("describes the cover as an image of the cover size, resolved against the base url", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, description: "A summary", image: "/images/blog/a.webp" })["@graph"]
    expect(graph[0]?.["image"]).toStrictEqual({
      "@type": "ImageObject",
      height: BLOG_COVER.HEIGHT,
      url: "https://example.com/images/blog/a.webp",
      width: BLOG_COVER.WIDTH,
    })
    expect(graph[0]?.["description"]).toBe("A summary")
  })

  it("omits description, image and keywords when the post has none", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph[0]).not.toHaveProperty("description")
    expect(graph[0]).not.toHaveProperty("image")
    expect(graph[0]).not.toHaveProperty("keywords")
  })

  it("names the author as a person with the author page, image, role and profiles, and refers to that person from the post", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData(BASE_INPUT)["@graph"]
    expect(graph[1]).toStrictEqual(PERSON)
    expect(graph[0]?.["author"]).toStrictEqual({ "@id": PERSON["@id"] })
  })

  it("links the author page in the post's language", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, locale: "ja-JP", url: "/ja-JP/blog/a-post" })["@graph"]
    expect(graph[1]).toMatchObject({
      "@id": "https://example.com/ja-JP/authors/piotr-borowiecki#person",
      url: "https://example.com/ja-JP/authors/piotr-borowiecki",
    })
  })

  it("gives the language and the tags of the post", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, keywords: ["Testy", "Narzędzia"], locale: "pl-PL" })["@graph"]
    expect(graph[0]?.["inLanguage"]).toBe("pl-PL")
    expect(graph[0]?.["keywords"]).toStrictEqual(["Testy", "Narzędzia"])
  })

  it("leads the breadcrumb through the home page and the blog in the post's language", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, blogTitle: "ブログ", locale: "ja-JP", url: "/ja-JP/blog/a-post" })["@graph"]
    expect(graph[2]?.["itemListElement"]).toStrictEqual([
      { "@type": "ListItem", item: "https://example.com/ja-JP", name: APP_NAME, position: 1 },
      { "@type": "ListItem", item: "https://example.com/ja-JP/blog", name: "ブログ", position: 2 },
      { "@type": "ListItem", item: "https://example.com/ja-JP/blog/a-post", name: BASE_INPUT.title, position: 3 },
    ])
  })

  it("appends an FAQPage when the post declares faq entries", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, faq: [{ answer: "Because.", question: "Why?" }] })["@graph"]
    expect(graph.map((node) => node["@type"])).toStrictEqual(["BlogPosting", "Person", "BreadcrumbList", "FAQPage"])
    expect(graph[3]?.["mainEntity"]).toStrictEqual([
      { "@type": "Question", acceptedAnswer: { "@type": "Answer", text: "Because." }, name: "Why?" },
    ])
  })

  it("skips the FAQPage when the faq list is empty", () => {
    expect.hasAssertions()
    const graph = buildBlogPostStructuredData({ ...BASE_INPUT, faq: [] })["@graph"]
    expect(graph).toHaveLength(GRAPH_NODES_WITHOUT_FAQ)
  })
})

describe("blog structured data", () => {
  const POSTS = [
    { date: "2026-11-17", title: "Newest", url: "/de-DE/blog/newest" },
    { date: new Date("2026-08-15"), title: "Older", url: "/de-DE/blog/older" },
  ]

  it("describes the blog with every post and lists the posts of its first page in the page's language", () => {
    expect(
      buildBlogStructuredData({
        description: "Notizen",
        listed: POSTS.slice(0, 1),
        locale: "de-DE",
        offset: 0,
        pathname: ROUTES.BLOG,
        posts: POSTS,
        title: "Blog",
        total: POSTS.length,
      }),
    ).toStrictEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@id": `${APP_URL}/de-DE/blog#blog`,
          "@type": "Blog",
          blogPost: [
            { "@type": "BlogPosting", datePublished: "2026-11-17T00:00:00.000Z", headline: "Newest", url: `${APP_URL}/de-DE/blog/newest` },
            { "@type": "BlogPosting", datePublished: "2026-08-15T00:00:00.000Z", headline: "Older", url: `${APP_URL}/de-DE/blog/older` },
          ],
          description: "Notizen",
          inLanguage: "de-DE",
          mainEntityOfPage: { "@id": `${APP_URL}/de-DE/blog#posts` },
          name: `Blog – ${APP_NAME}`,
          publisher: ORGANIZATION,
          url: `${APP_URL}/de-DE/blog`,
        },
        {
          "@id": `${APP_URL}/de-DE/blog#posts`,
          "@type": "ItemList",
          itemListElement: [{ "@type": "ListItem", name: "Newest", position: 1, url: `${APP_URL}/de-DE/blog/newest` }],
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: 2,
        },
      ],
    })
  })

  it("escapes the blog's structured data", () => {
    const { __html: html } = buildBlogStructuredDataHtml({
      description: "</script>",
      listed: [],
      locale: "en-US",
      offset: 0,
      pathname: ROUTES.BLOG,
      posts: [],
      title: "Blog",
      total: 0,
    })
    expect(html).not.toContain("<")
    expect(JSON.parse(html)).toMatchObject({ "@graph": [{ blogPost: [], description: "</script>", url: `${APP_URL}${ROUTES.BLOG}` }, {}] })
  })

  it("describes a later archive page as part of the blog, with its posts numbered across the archive and its breadcrumbs", () => {
    const { __html: html } = buildBlogArchiveStructuredDataHtml({
      blogTitle: "Blog",
      description: "Notizen",
      listed: POSTS.slice(1),
      locale: "de-DE",
      offset: 12,
      pathname: "/blog/page/2",
      title: "Blog, Seite 2",
      total: 13,
    })

    expect(html).not.toContain("<")
    expect(JSON.parse(html)).toStrictEqual(
      buildBlogArchiveStructuredData({
        blogTitle: "Blog",
        description: "Notizen",
        listed: POSTS.slice(1),
        locale: "de-DE",
        offset: 12,
        pathname: "/blog/page/2",
        title: "Blog, Seite 2",
        total: 13,
      }),
    )
    expect(JSON.parse(html)).toStrictEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@id": `${APP_URL}/de-DE/blog/page/2`,
          "@type": "CollectionPage",
          description: "Notizen",
          inLanguage: "de-DE",
          isPartOf: { "@id": `${APP_URL}/de-DE/blog#blog`, "@type": "Blog", url: `${APP_URL}/de-DE/blog` },
          mainEntity: { "@id": `${APP_URL}/de-DE/blog/page/2#posts` },
          name: `Blog, Seite 2 – ${APP_NAME}`,
          url: `${APP_URL}/de-DE/blog/page/2`,
        },
        {
          "@id": `${APP_URL}/de-DE/blog/page/2#posts`,
          "@type": "ItemList",
          itemListElement: [{ "@type": "ListItem", name: "Older", position: 13, url: `${APP_URL}/de-DE/blog/older` }],
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: 13,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", item: `${APP_URL}/de-DE`, name: APP_NAME, position: 1 },
            { "@type": "ListItem", item: `${APP_URL}/de-DE/blog`, name: "Blog", position: 2 },
            { "@type": "ListItem", item: `${APP_URL}/de-DE/blog/page/2`, name: "Blog, Seite 2", position: 3 },
          ],
        },
      ],
    })
  })
})

describe("page sequences", () => {
  it("links the previous and next pages of a sequence in the page's language", () => {
    const { links } = buildPageHead({
      locale: "pl-PL",
      pathname: "/blog/page/2",
      sequence: { next: "/blog/page/3", previous: ROUTES.BLOG },
    })

    expect(links).toContainEqual({ href: `${APP_URL}/pl-PL/blog`, rel: "prev" })
    expect(links).toContainEqual({ href: `${APP_URL}/pl-PL/blog/page/3`, rel: "next" })
    expect(links).toContainEqual({ href: `${APP_URL}/pl-PL/blog/page/2`, rel: "canonical" })
  })

  it("links no neighbour a page does not have", () => {
    const { links } = buildPageHead({ pathname: ROUTES.BLOG })

    expect(links.filter(({ rel }) => rel === "prev" || rel === "next")).toStrictEqual([])
  })
})

it("describes the organisation with its logo and its profiles on other sites", () => {
  const { __html: html } = ORGANIZATION_STRUCTURED_DATA_HTML
  expect(JSON.parse(html)).toStrictEqual({ "@context": "https://schema.org", ...ORGANIZATION })
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

describe("article times", () => {
  it("names when a post was published and last modified", () => {
    const { meta } = buildPageHead({ dates: { date: "2026-08-15", updated: "2026-11-17" }, pathname: "/blog/a-post", type: "article" })

    expect(meta).toStrictEqual(
      expect.arrayContaining([
        { content: "2026-08-15T00:00:00.000Z", property: "article:published_time" },
        { content: "2026-11-17T00:00:00.000Z", property: "article:modified_time" },
      ]),
    )
  })

  it("dates the last modification at the publication when the post was never updated", () => {
    const { meta } = buildPageHead({ dates: { date: "2026-08-15" }, pathname: "/blog/a-post", type: "article" })

    expect(meta).toContainEqual({ content: "2026-08-15T00:00:00.000Z", property: "article:modified_time" })
  })

  it("leaves both out of a page without dates", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.DOCS, type: "article" })

    expect(meta).not.toContainEqual(expect.objectContaining({ property: "article:published_time" }))
    expect(meta).not.toContainEqual(expect.objectContaining({ property: "article:modified_time" }))
  })
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

  it.each([ROUTES.API, `${ROUTES.API}/search`, `/pl-PL${ROUTES.API}`])("gives %s, which is not prerendered, the site card", (pathname) => {
    const { meta } = buildPageHead({ locale: "pl-PL", pathname, title: "Panel" })

    expect(meta).toContainEqual({ content: `${APP_URL}${SOCIAL_IMAGE.SITE_PATH}`, property: "og:image" })
    expect(meta).toContainEqual({ content: APP_NAME, property: "og:image:alt" })
  })

  it("shares the image a page passes, with its own type and size, in place of a card", () => {
    const image = { alt: "The walkthrough", height: 900, path: "/media/covers/course/cover.webp", type: "image/webp", width: 1600 }
    const { meta } = buildPageHead({ image, pathname: ROUTES.COURSES, title: "The walkthrough" })

    expect(meta).toStrictEqual(
      expect.arrayContaining([
        { content: `${APP_URL}${image.path}`, property: "og:image" },
        { content: image.type, property: "og:image:type" },
        { content: "1600", property: "og:image:width" },
        { content: "900", property: "og:image:height" },
        { content: image.alt, property: "og:image:alt" },
        { content: `${APP_URL}${image.path}`, name: "twitter:image" },
        { content: image.alt, name: "twitter:image:alt" },
      ]),
    )
  })

  it("describes the card of a page without a title by the site name alone", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.DOCS })

    expect(meta).toContainEqual({ content: APP_NAME, property: "og:title" })
    expect(meta).toContainEqual({ content: APP_NAME, property: "og:image:alt" })
  })
})

describe("article author", () => {
  it("names the author and links the author page in the page's language", () => {
    const { meta } = buildPageHead({
      author: BLOG_AUTHOR.PIOTR_BOROWIECKI,
      locale: "pl-PL",
      pathname: "/blog/post",
      title: "Post",
      type: "article",
    })

    expect(meta).toStrictEqual(
      expect.arrayContaining([
        { content: AUTHOR.name, name: "author" },
        { content: `${APP_URL}/pl-PL/authors/piotr-borowiecki`, property: "article:author" },
      ]),
    )
  })

  it("names no author on a page that is not an article", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.HOME, title: "Home" })

    expect(meta).not.toContainEqual(expect.objectContaining({ name: "author" }))
  })
})

describe("author structured data", () => {
  const input = { ...BASE_INPUT, baseUrl: APP_URL, description: "A biography", locale: "de-DE" } as const

  it("describes the author page as a ProfilePage whose main entity is the author", () => {
    const graph = buildAuthorStructuredData(input)["@graph"]

    expect(graph).toStrictEqual([
      {
        "@id": `${APP_URL}/de-DE/authors/piotr-borowiecki`,
        "@type": "ProfilePage",
        description: "A biography",
        inLanguage: "de-DE",
        mainEntity: { "@id": `${APP_URL}/de-DE/authors/piotr-borowiecki#person` },
        name: `${AUTHOR.name} – ${APP_NAME}`,
        url: `${APP_URL}/de-DE/authors/piotr-borowiecki`,
      },
      {
        "@id": `${APP_URL}/de-DE/authors/piotr-borowiecki#person`,
        "@type": "Person",
        image: `${APP_URL}${AUTHOR.image}`,
        jobTitle: AUTHOR_ROLE,
        name: AUTHOR.name,
        sameAs: ["https://github.com/pjborowiecki", "https://www.linkedin.com/in/pjborowiecki/"],
        url: `${APP_URL}/de-DE/authors/piotr-borowiecki`,
      },
    ])
  })

  it("serialises the profile for a script element without a closing tag", () => {
    const { __html: html } = buildAuthorStructuredDataHtml({ ...input, description: "</script>" })

    expect(html).not.toContain("</script>")
    expect(JSON.parse(html)).toMatchObject({ "@context": "https://schema.org" })
  })
})

describe("robots directive", () => {
  it("leaves the robots directive of a page to the deployment", () => {
    expect(buildPageHead({ pathname: ROUTES.HOME }).meta).not.toContainEqual(expect.objectContaining({ name: "robots" }))
  })

  it("leaves it to the deployment on a route's page head too", () => {
    expect(pageHead(ROUTES.TERMS)({ loaderData: undefined }).meta).not.toContainEqual(expect.objectContaining({ name: "robots" }))
  })
})

it("names social images after the canonical path", () => {
  expect(socialImagePath(ROUTES.HOME)).toBe(`/images/og/index.${SOCIAL_IMAGE.FORMAT}`)
  expect(socialImagePath("/uk-UA/blog/post")).toBe(`/images/og/uk-UA/blog/post.${SOCIAL_IMAGE.FORMAT}`)
})
