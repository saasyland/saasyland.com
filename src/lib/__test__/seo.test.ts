import { describe, expect, it } from "vite-plus/test"

import { buildBlogPostStructuredData, buildBlogPostStructuredDataHtml, buildPageHead } from "~/src/lib/seo"

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
