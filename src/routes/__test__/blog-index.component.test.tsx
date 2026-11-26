import { renderToString } from "react-dom/server"

import { RouterContextProvider } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { describe, expect, it, vi } from "vite-plus/test"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { GUIDE, createBlogRouter, renderBlog, routers, section, useBlogTestEnvironment } from "~/src/routes/__test__/fixtures/blog-router"

import { BLOG_ARCHIVE, BLOG_SORT, BLOG_TAG } from "~/src/data/blog"

import { PostArchive } from "~/src/presentation/components/custom/blog/post-archive"
import { PostFinderLayout } from "~/src/presentation/components/custom/blog/post-finder"

import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import plPagesBlogMessages from "~/messages/pl-PL/pages.blog.json"
import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { useContent: vi.fn(() => <p>Article content</p>) },
}))

useBlogTestEnvironment()

const indexPost = (slug: string, fields: Partial<BlogPostSummary> = {}): BlogPostSummary => ({
  date: "2026-09-01",
  image: undefined,
  readingTimeMinutes: 5,
  summary: `${slug} summary`,
  tags: [],
  title: slug,
  updated: undefined,
  url: `/blog/${slug}`,
  ...fields,
})

const ARCHIVE = [
  indexPost("better-auth-vs-clerk", {
    date: "2026-11-20",
    readingTimeMinutes: 13,
    summary: "Who owns the user table",
    tags: [BLOG_TAG.AUTH, BLOG_TAG.SAAS],
  }),
  indexPost("polar-vs-stripe", { date: "2026-11-17", readingTimeMinutes: 9, tags: [BLOG_TAG.PAYMENTS], updated: "2026-11-19" }),
  indexPost("release-notes", { date: "2026-08-15", readingTimeMinutes: 22, tags: [BLOG_TAG.RELEASE], updated: "2026-11-21" }),
]

const archiveSection = (): HTMLElement =>
  section(screen.getByRole("heading", { level: 2, name: pagesBlogMessages.archive.title }), "section")

const archiveRows = (): string[] =>
  within(archiveSection())
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent)

const { archive: archiveMessages, index: indexMessages } = pagesBlogMessages

describe("the blog index", () => {
  it("leads with the featured posts, then the latest and the most recently updated posts", async () => {
    const [lead, side, plain] = [
      indexPost("lead-post", { image: "/images/blog/lead.webp", tags: [BLOG_TAG.COMPARISON] }),
      indexPost("side-post", { image: "/images/blog/side.webp" }),
      indexPost("plain-post", { summary: undefined }),
    ]
    await renderBlog({
      index: { featured: [lead, side, plain], latest: [ARCHIVE[0] ?? lead], updated: [ARCHIVE[2] ?? lead] },
      locale: "en-US",
      path: "/blog",
      posts: ARCHIVE,
    })

    const featured = within(section(screen.getByRole("heading", { level: 2, name: indexMessages.featured }), "section"))
    expect(featured.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toStrictEqual([
      "lead-post",
      "side-post",
      "plain-post",
    ])
    expect(featured.getByRole("link", { name: "lead-post" })).toHaveAttribute("href", "/blog/lead-post")
    expect(featured.getByText(pagesBlogMessages.tags[BLOG_TAG.COMPARISON])).toBeVisible()
    expect(document.querySelector('img[src="/images/blog/lead.webp"]')).toHaveAttribute("fetchpriority", "high")
    expect(document.querySelector('img[src="/images/blog/lead.webp"]')).toHaveAttribute("loading", "eager")
    expect(document.querySelector('img[src="/images/blog/side.webp"]')).toHaveAttribute("loading", "lazy")
    expect(featured.queryByText("plain-post summary")).toBeNull()

    const latest = within(section(screen.getByRole("heading", { level: 2, name: indexMessages.latest }), "section"))
    expect(latest.getByRole("link", { name: "better-auth-vs-clerk" })).toHaveAttribute("href", "/blog/better-auth-vs-clerk")
    expect(latest.getByText("Nov 20, 2026")).toHaveAttribute("datetime", "2026-11-20T00:00:00.000Z")

    const updated = within(section(screen.getByRole("heading", { level: 2, name: indexMessages.updated }), "section"))
    expect(updated.getByRole("link", { name: "release-notes" })).toBeVisible()
    expect(updated.getByText("Nov 21, 2026").parentElement).toHaveTextContent(/^Updated Nov 21, 2026/u)
  })

  it("leaves out the lists it has nothing for", async () => {
    await renderBlog({
      index: { featured: [indexPost("only-feature")], latest: [ARCHIVE[0] ?? indexPost("x")] },
      locale: "en-US",
      path: "/blog",
      posts: ARCHIVE,
    })

    expect(screen.getByRole("heading", { level: 2, name: indexMessages.featured })).toBeVisible()
    expect(screen.getByRole("heading", { level: 2, name: indexMessages.latest })).toBeVisible()
    expect(screen.queryByRole("heading", { level: 2, name: indexMessages.updated })).toBeNull()
  })

  it("shows no featured or recent lists when nothing is featured or new", async () => {
    await renderBlog({ locale: "en-US", path: "/blog", posts: ARCHIVE })

    expect(screen.queryByRole("heading", { level: 2, name: indexMessages.featured })).toBeNull()
    expect(screen.queryByRole("heading", { level: 2, name: indexMessages.latest })).toBeNull()
    expect(archiveRows()).toStrictEqual(["better-auth-vs-clerk", "polar-vs-stripe", "release-notes"])
  })

  it("says so when nothing is published yet", async () => {
    await renderBlog({ locale: "en-US", path: "/blog", posts: [] })

    expect(screen.getByText(indexMessages.empty)).toBeVisible()
    expect(screen.queryByRole("heading", { level: 2, name: archiveMessages.title })).toBeNull()
  })
})

describe("searching, filtering and sorting the blog", () => {
  it("narrows the posts to every word of the query as the reader types, keeps the query in the address and clears it", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: "/blog", posts: ARCHIVE })
    const search = screen.getByRole("searchbox", { name: archiveMessages.search })

    expect(screen.getByText("3 posts")).toBeVisible()
    await user.type(search, "USER clerk")

    await waitFor(() => {
      expect(archiveRows()).toStrictEqual(["better-auth-vs-clerk"])
    })
    expect(screen.getByText("1 match")).toBeVisible()
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: "USER clerk" })
    })

    await user.click(screen.getByRole("button", { name: archiveMessages.clearSearch }))

    expect(search).toHaveValue("")
    await waitFor(() => {
      expect(archiveRows()).toHaveLength(ARCHIVE.length)
    })
    expect(router.state.location.searchStr).toBe("")
  })

  it("ignores a query of spaces", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: "/blog", posts: ARCHIVE })

    await user.type(screen.getByRole("searchbox", { name: archiveMessages.search }), "   ")

    expect(archiveRows()).toHaveLength(ARCHIVE.length)
    expect(router.state.location.searchStr).toBe("")
  })

  it("filters by topic, counting the posts of each, and returns to every topic", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: "/blog", posts: ARCHIVE })
    const topics = within(screen.getByRole("radiogroup", { name: archiveMessages.topics }))

    expect(topics.getAllByRole("radio").map((radio) => radio.textContent)).toStrictEqual([
      `${archiveMessages.allTopics}${String(ARCHIVE.length)}`,
      `${pagesBlogMessages.tags[BLOG_TAG.AUTH]}1`,
      `${pagesBlogMessages.tags[BLOG_TAG.PAYMENTS]}1`,
      `${pagesBlogMessages.tags[BLOG_TAG.RELEASE]}1`,
      `${pagesBlogMessages.tags[BLOG_TAG.SAAS]}1`,
    ])
    await user.click(topics.getByRole("radio", { name: `${pagesBlogMessages.tags[BLOG_TAG.PAYMENTS]}, 1 post` }))

    await waitFor(() => {
      expect(archiveRows()).toStrictEqual(["polar-vs-stripe"])
    })
    expect(router.state.location.search).toMatchObject({ tag: BLOG_TAG.PAYMENTS })

    await user.click(topics.getByRole("radio", { name: archiveMessages.allTopics }))

    await waitFor(() => {
      expect(archiveRows()).toHaveLength(ARCHIVE.length)
    })
    expect(router.state.location.searchStr).toBe("")
  })

  it("sorts by the latest change, showing that date, or by the shortest read, and keeps the default out of the address", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: "/blog", posts: ARCHIVE })
    const sorts = within(screen.getByRole("radiogroup", { name: archiveMessages.sort }))

    await user.click(sorts.getByRole("radio", { name: archiveMessages.sorts.updated }))

    await waitFor(() => {
      expect(archiveRows()).toStrictEqual(["release-notes", "better-auth-vs-clerk", "polar-vs-stripe"])
    })
    expect(router.state.location.search).toMatchObject({ sort: BLOG_SORT.UPDATED })
    expect(screen.getByText("Nov 21, 2026").parentElement).toHaveTextContent("Updated Nov 21, 2026")

    await user.click(sorts.getByRole("radio", { name: archiveMessages.sorts["reading-time"] }))

    await waitFor(() => {
      expect(archiveRows()).toStrictEqual(["polar-vs-stripe", "better-auth-vs-clerk", "release-notes"])
    })

    await user.click(sorts.getByRole("radio", { name: archiveMessages.sorts.newest }))

    await waitFor(() => {
      expect(archiveRows()).toStrictEqual(["better-auth-vs-clerk", "polar-vs-stripe", "release-notes"])
    })
    expect(router.state.location.searchStr).toBe("")
  })

  it("reads the search, topic and sort from the address", async () => {
    await renderBlog({ locale: "en-US", path: `/blog?q=release&sort=${BLOG_SORT.UPDATED}&tag=${BLOG_TAG.RELEASE}`, posts: ARCHIVE })

    expect(screen.getByRole("searchbox", { name: archiveMessages.search })).toHaveValue("release")
    expect(archiveRows()).toStrictEqual(["release-notes"])
    expect(screen.getByRole("radio", { name: archiveMessages.sorts.updated })).toBeChecked()
  })

  it("says so when nothing matches and offers every post again", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: `/blog?tag=${BLOG_TAG.AUTH}`, posts: ARCHIVE })

    await user.type(screen.getByRole("searchbox", { name: archiveMessages.search }), "stripe")

    expect(await screen.findByText(archiveMessages.empty)).toBeVisible()
    expect(within(archiveSection()).getByText("No matches")).toBeVisible()
    expect(within(screen.getByRole("navigation", { name: pagesBlogMessages.post.rail })).getByText("No matches")).toBeVisible()
    expect(archiveRows()).toStrictEqual([])

    await user.click(screen.getByRole("button", { name: archiveMessages.showAll }))

    await waitFor(() => {
      expect(archiveRows()).toHaveLength(ARCHIVE.length)
    })
    expect(screen.getByRole("searchbox", { name: archiveMessages.search })).toHaveValue("")
    expect(router.state.location.searchStr).toBe("")
  })
})

const polishRows = (): HTMLElement[] => {
  const archive = section(screen.getByRole("heading", { level: 2, name: plPagesBlogMessages.archive.title }), "section")

  return within(archive).getAllByRole("heading", { level: 3 })
}

describe("loading more posts", () => {
  const MANY = Array.from({ length: BLOG_ARCHIVE.PAGE_SIZE + 2 }, (_, index) =>
    indexPost(`post-${String(index + 1)}`, { date: new Date(Date.UTC(2026, 10, 30 - index)).toISOString() }),
  )

  it("shows the next page in place, keeping it in the address, through a link to the archive page that works without JavaScript", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "pl-PL", path: "/pl-PL/blog", posts: MANY })
    const more = screen.getByRole("link", { name: plPagesBlogMessages.archive.loadMore })

    expect(more).toHaveAttribute("href", "/pl-PL/blog/page/2")
    expect(screen.getByText(`Wyświetlono ${String(BLOG_ARCHIVE.PAGE_SIZE)} z ${String(MANY.length)}`)).toBeVisible()
    expect(polishRows()).toHaveLength(BLOG_ARCHIVE.PAGE_SIZE)

    await user.click(more)

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: plPagesBlogMessages.archive.loadMore })).toBeNull()
    })
    expect(polishRows()).toHaveLength(MANY.length)
    expect(router.state.location.pathname).toBe(ROUTES.BLOG.INDEX)
    expect(router.state.location.search).toMatchObject({ page: 2 })
  })

  it("leaves a click that opens elsewhere to the browser", async () => {
    const router = await renderBlog({ locale: "en-US", path: "/blog", posts: MANY })

    fireEvent.click(screen.getByRole("link", { name: archiveMessages.loadMore }), { metaKey: true })

    expect(router.state.location.searchStr).toBe("")
    expect(screen.getByRole("link", { name: archiveMessages.loadMore })).toBeVisible()
  })
})

describe("the server-rendered blog index", () => {
  it("renders every post in the default order and an empty finder whatever the address asks for, so the page hydrates onto its prerendered HTML", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/blog"))
    const router = createBlogRouter({
      archive: {},
      author: {},
      index: {},
      locale: "en-US",
      path: `/blog?q=release&sort=${BLOG_SORT.READING_TIME}&tag=${BLOG_TAG.RELEASE}`,
      post: GUIDE,
      posts: ARCHIVE,
      rail: [],
    })
    routers.push(router)
    await router.load()

    const html = renderToString(
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={getTestMessages("en-US")} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterContextProvider router={router}>
          <PostFinderLayout locale="en-US" posts={ARCHIVE}>
            <PostArchive />
          </PostFinderLayout>
        </RouterContextProvider>
      </IntlProvider>,
    )
    const rows = html.slice(html.indexOf('id="all-posts"'))

    expect(ARCHIVE.map(({ title }) => rows.indexOf(`>${title}</a>`))).toStrictEqual(
      ARCHIVE.map(({ title }) => rows.indexOf(`>${title}</a>`)).toSorted((first, second) => first - second),
    )
    expect(html).toContain('value=""')
    expect(html).toContain("3 posts")
    expect(html).not.toContain(archiveMessages.activeFilters)
    expect(html).toMatch(/aria-checked="true"[^>]*>All topics/u)
  })
})

describe("the archive pages", () => {
  it("lists one page of the archive, links its neighbours and describes itself to search engines", async () => {
    await renderBlog({ archive: { page: 2, pages: 3, total: 30 }, locale: "en-US", path: "/blog/page/2", posts: ARCHIVE })

    expect(screen.getByRole("heading", { level: 1, name: "All posts, page 2" })).toBeVisible()
    expect(screen.getByText("Page 2 of 3 of the archive, newest first: 30 posts in all.")).toBeVisible()
    expect(archiveRows()).toStrictEqual(ARCHIVE.map(({ title }) => title))
    const pages = within(screen.getByRole("navigation", { name: archiveMessages.pagination }))
    expect(pages.getByRole("link", { name: archiveMessages.newer })).toHaveAttribute("href", "/blog")
    expect(pages.getByRole("link", { name: archiveMessages.newer })).toHaveAttribute("rel", "prev")
    expect(pages.getByRole("link", { name: archiveMessages.older })).toHaveAttribute("href", "/blog/page/3")
    expect(pages.getByText("Page 2 of 3")).toBeVisible()
    const structuredData: unknown = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? "{}")
    expect(structuredData).toMatchObject({
      "@graph": [
        { "@type": "CollectionPage", url: `${APP_URL}/blog/page/2` },
        { "@type": "ItemList", itemListElement: [{ position: BLOG_ARCHIVE.PAGE_SIZE + 1 }, {}, {}] },
        { "@type": "BreadcrumbList" },
      ],
    })
  })

  it("ends at the last page of the archive", async () => {
    await renderBlog({ archive: { page: 3, pages: 3 }, locale: "en-US", path: "/blog/page/3", posts: ARCHIVE })

    const pages = within(screen.getByRole("navigation", { name: archiveMessages.pagination }))
    expect(pages.getByRole("link", { name: archiveMessages.newer })).toHaveAttribute("href", "/blog/page/2")
    expect(pages.queryByRole("link", { name: archiveMessages.older })).toBeNull()
  })
})
