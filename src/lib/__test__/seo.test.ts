import { describe, expect, it } from "vite-plus/test"

import {
  ORGANIZATION_LOGO,
  ORGANIZATION_STRUCTURED_DATA_HTML,
  ROBOTS,
  SOCIAL_IMAGE,
  buildPageHead,
  pageHead,
  socialImagePath,
} from "~/src/lib/seo"

import { APP_GITHUB_OWNER_URL, APP_INSTAGRAM_URL, APP_NAME, APP_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const ORGANIZATION = {
  "@type": "Organization",
  email: CONTACT_EMAIL,
  logo: { "@type": "ImageObject", height: ORGANIZATION_LOGO.SIZE, url: `${APP_URL}/images/logo.png`, width: ORGANIZATION_LOGO.SIZE },
  name: APP_NAME,
  sameAs: [APP_GITHUB_OWNER_URL, APP_INSTAGRAM_URL],
  url: APP_URL,
}

describe("page sequences", () => {
  it("links the previous and next pages of a sequence in the page's language", () => {
    const { links } = buildPageHead({
      locale: "pl-PL",
      pathname: "/blog/page/2",
      sequence: { next: "/blog/page/3", previous: ROUTES.BLOG.INDEX },
    })

    expect(links).toContainEqual({ href: `${APP_URL}/pl-PL/blog`, rel: "prev" })
    expect(links).toContainEqual({ href: `${APP_URL}/pl-PL/blog/page/3`, rel: "next" })
    expect(links).toContainEqual({ href: `${APP_URL}/pl-PL/blog/page/2`, rel: "canonical" })
  })

  it("links no neighbour a page does not have", () => {
    const { links } = buildPageHead({ pathname: ROUTES.BLOG.INDEX })

    expect(links.filter(({ rel }) => rel === "prev" || rel === "next")).toStrictEqual([])
  })
})

it("describes the organisation with its logo and its profiles on other sites", () => {
  const { __html: html } = ORGANIZATION_STRUCTURED_DATA_HTML
  expect(JSON.parse(html)).toStrictEqual({ "@context": "https://schema.org", ...ORGANIZATION })
})

it("leaves og:locale:alternate to the root document, because route heads keep only one tag per property", () => {
  const { meta } = buildPageHead({ locale: "pl-PL", pathname: ROUTES.BLOG.INDEX })
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
    const { meta } = buildPageHead({ pathname: ROUTES.DOCS.INDEX, type: "article" })

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

  it.each([ROUTES.API.INDEX, `${ROUTES.API.INDEX}/search`, `/pl-PL${ROUTES.API.INDEX}`, `${ROUTES.COURSES}/the-walkthrough`])(
    "gives %s, which is not prerendered, the site card",
    (pathname) => {
      const { meta } = buildPageHead({ locale: "pl-PL", pathname, title: "Panel" })

      expect(meta).toContainEqual({ content: `${APP_URL}${SOCIAL_IMAGE.SITE_PATH}`, property: "og:image" })
      expect(meta).toContainEqual({ content: APP_NAME, property: "og:image:alt" })
    },
  )

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

  it("keeps a page that asks for it out of search results and leaves the directive to the root otherwise", () => {
    expect(buildPageHead({ pathname: ROUTES.COURSES, robots: ROBOTS.NOINDEX }).meta).toContainEqual({
      content: ROBOTS.NOINDEX,
      name: "robots",
    })
    expect(buildPageHead({ pathname: ROUTES.COURSES }).meta).not.toContainEqual(expect.objectContaining({ name: "robots" }))
  })

  it("describes the card of a page without a title by the site name alone", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.DOCS.INDEX })

    expect(meta).toContainEqual({ content: APP_NAME, property: "og:title" })
    expect(meta).toContainEqual({ content: APP_NAME, property: "og:image:alt" })
  })
})

describe("article author", () => {
  it("names the author and links the author page in the page's language", () => {
    const { meta } = buildPageHead({
      author: { name: "Ada Lovelace", pathname: "/authors/ada-lovelace" },
      locale: "pl-PL",
      pathname: "/blog/post",
      title: "Post",
      type: "article",
    })

    expect(meta).toStrictEqual(
      expect.arrayContaining([
        { content: "Ada Lovelace", name: "author" },
        { content: `${APP_URL}/pl-PL/authors/ada-lovelace`, property: "article:author" },
      ]),
    )
  })

  it("names no author on a page that is not an article", () => {
    const { meta } = buildPageHead({ pathname: ROUTES.HOME, title: "Home" })

    expect(meta).not.toContainEqual(expect.objectContaining({ name: "author" }))
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
