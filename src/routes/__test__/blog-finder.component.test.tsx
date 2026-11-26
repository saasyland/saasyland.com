import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fill } from "~/src/platform/testing/lib/fill"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { renderBlog, section, useBlogTestEnvironment } from "~/src/routes/__test__/fixtures/blog-router"

import { BLOG_ARCHIVE, BLOG_FINDER_TOPICS, BLOG_SORT, BLOG_TAG, BLOG_TAGS } from "~/src/data/blog"

import pagesBlogMessages from "~/messages/en-US/pages.blog.json"
import { ROUTES } from "~/src/routes"

vi.mock("~/src/presentation/components/custom/blog-content", () => ({
  blogContent: { useContent: vi.fn(() => <p>Article content</p>) },
}))

useBlogTestEnvironment()

const HEADER_HEIGHT = "64px"

beforeEach(() => {
  vi.stubGlobal("CSS", { escape: (value: string) => value, supports: () => true })
  Element.prototype.scrollIntoView = vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>()
  document.documentElement.style.scrollPaddingTop = HEADER_HEIGHT
})

const { archive, tags } = pagesBlogMessages

const summary = (slug: string, fields: Partial<BlogPostSummary>): BlogPostSummary => ({
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

const POSTS = [
  summary("better-auth", { date: "2026-11-20", readingTimeMinutes: 13, tags: [BLOG_TAG.AUTH, BLOG_TAG.SAAS], title: "Better Auth guide" }),
  summary("polar", {
    date: "2026-11-17",
    readingTimeMinutes: 9,
    tags: [BLOG_TAG.PAYMENTS],
    title: "Polar payments",
    updated: "2026-11-21",
  }),
  summary("release", { date: "2026-08-15", readingTimeMinutes: 22, tags: [BLOG_TAG.RELEASE], title: "Release notes" }),
]

const TOPIC_COUNT = 7

const MANY_TOPICS = Array.from({ length: TOPIC_COUNT }, (_, index) =>
  summary(`topic-${String(index)}`, { tags: BLOG_TAGS.slice(0, TOPIC_COUNT - index) }),
)

const finder = () => within(screen.getByRole("complementary", { name: archive.finder }))

const postIndex = () => within(screen.getByRole("navigation", { name: pagesBlogMessages.post.rail }))

const indexTitles = (): string[] =>
  postIndex()
    .queryAllByRole("link")
    .map((link) => link.textContent)

const archiveSection = (): HTMLElement => section(screen.getByRole("heading", { level: 2, name: archive.title }), "section")

const placeArchive = (top: number) => {
  const element = archiveSection()
  const scrollIntoView = vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>()
  element.scrollIntoView = scrollIntoView
  element.getBoundingClientRect = () => new DOMRect(0, top, 0, 0)

  return scrollIntoView
}

describe("the post finder beside the blog", () => {
  it("indexes every post and narrows the index with the search, counting the matches", async () => {
    const user = userEvent.setup({ delay: null })
    await renderBlog({ locale: "en-US", path: ROUTES.BLOG.INDEX, posts: POSTS })

    expect(indexTitles()).toStrictEqual(["Better Auth guide", "Polar payments", "Release notes"])
    expect(postIndex().getByRole("link", { name: "Polar payments" })).toHaveAttribute("href", "/blog/polar")
    expect(postIndex().getByText(String(POSTS.length))).toBeVisible()

    await fill(user, finder().getByRole("searchbox", { name: archive.search }), "polar")

    await waitFor(() => {
      expect(indexTitles()).toStrictEqual(["Polar payments"])
    })
    expect(postIndex().getByText("1 of 3")).toBeVisible()
  })

  it("orders the index like the archive", async () => {
    const user = userEvent.setup({ delay: null })
    await renderBlog({ locale: "en-US", path: ROUTES.BLOG.INDEX, posts: POSTS })

    await user.click(finder().getByRole("radio", { name: archive.sorts["reading-time"] }))

    await waitFor(() => {
      expect(indexTitles()).toStrictEqual(["Polar payments", "Better Auth guide", "Release notes"])
    })
  })

  it("shows the largest topics first and keeps the chosen one in view in their place", async () => {
    const chosen = BLOG_TAG.PAYMENTS
    await renderBlog({ locale: "en-US", path: `${ROUTES.BLOG.INDEX}?tag=${chosen}`, posts: MANY_TOPICS })
    const topics = within(finder().getByRole("radiogroup", { name: archive.topics })).getAllByRole("radio")

    expect(topics.map((radio) => radio.textContent)).toStrictEqual([
      `${archive.allTopics}${String(TOPIC_COUNT)}`,
      ...BLOG_TAGS.slice(0, BLOG_FINDER_TOPICS - 1).map((tag, index) => `${tags[tag]}${String(TOPIC_COUNT - index)}`),
      `${tags[chosen]}1`,
    ])
    expect(finder().getByRole("radio", { name: `${tags[chosen]}, 1 post` })).toBeChecked()
  })

  it("opens every topic in a popover that closes on the topic the reader picks", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: ROUTES.BLOG.INDEX, posts: MANY_TOPICS })

    expect(within(finder().getByRole("radiogroup", { name: archive.topics })).getAllByRole("radio")).toHaveLength(BLOG_FINDER_TOPICS + 1)

    await user.click(finder().getByRole("button", { name: `Show all ${String(TOPIC_COUNT)} topics` }))

    const popover = within(await screen.findByRole("dialog", { name: archive.topics }))
    expect(popover.getAllByRole("radio")).toHaveLength(TOPIC_COUNT + 1)

    await user.click(popover.getByRole("radio", { name: `${tags[BLOG_TAG.PAYMENTS]}, 1 post` }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    expect(router.state.location.search).toEqual({ tag: BLOG_TAG.PAYMENTS })
    expect(finder().getByRole("radio", { name: `${tags[BLOG_TAG.PAYMENTS]}, 1 post` })).toBeChecked()
  })

  it("lists the active topic and sort as filters that each remove themselves", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({
      locale: "en-US",
      path: `${ROUTES.BLOG.INDEX}?q=guide&sort=${BLOG_SORT.UPDATED}&tag=${BLOG_TAG.AUTH}`,
      posts: POSTS,
    })
    const active = () => within(finder().getByRole("group", { name: archive.activeFilters }))

    await user.click(active().getByRole("button", { name: `Remove ${tags[BLOG_TAG.AUTH]}` }))

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: "guide", sort: BLOG_SORT.UPDATED })
    })

    await user.click(active().getByRole("button", { name: `Remove ${archive.sorts.updated}` }))

    await waitFor(() => {
      expect(router.state.location.searchStr).toBe("?q=guide")
    })
    expect(finder().queryByRole("group", { name: archive.activeFilters })).toBeNull()
  })

  it("clears the search, the topic and the sort at once", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({
      locale: "en-US",
      path: `${ROUTES.BLOG.INDEX}?q=guide&sort=${BLOG_SORT.UPDATED}&tag=${BLOG_TAG.AUTH}`,
      posts: POSTS,
    })

    await user.click(within(finder().getByRole("group", { name: archive.activeFilters })).getByRole("button", { name: archive.clearAll }))

    await waitFor(() => {
      expect(router.state.location.searchStr).toBe("")
    })
    expect(finder().getByRole("searchbox", { name: archive.search })).toHaveValue("")
    expect(indexTitles()).toHaveLength(POSTS.length)
  })
})

describe("bringing the reader to the results", () => {
  it.each([
    { position: "below the reading zone", top: 2000 },
    { position: "scrolled past", top: -40 },
  ])("scrolls the archive into view when it is $position", async ({ top }) => {
    const user = userEvent.setup({ delay: null })
    await renderBlog({ locale: "en-US", path: ROUTES.BLOG.INDEX, posts: POSTS })
    const scrollIntoView = placeArchive(top)

    await user.click(finder().getByRole("radio", { name: `${tags[BLOG_TAG.PAYMENTS]}, 1 post` }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" })
  })

  it("leaves the page where it is while the archive is in view", async () => {
    const user = userEvent.setup({ delay: null })
    await renderBlog({ locale: "en-US", path: ROUTES.BLOG.INDEX, posts: POSTS })
    const scrollIntoView = placeArchive(120)

    await user.click(finder().getByRole("radio", { name: `${tags[BLOG_TAG.PAYMENTS]}, 1 post` }))

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("filters without scrolling when the page has no archive to show", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: ROUTES.BLOG.INDEX, posts: POSTS })
    archiveSection().removeAttribute("id")

    await user.click(finder().getByRole("radio", { name: `${tags[BLOG_TAG.PAYMENTS]}, 1 post` }))

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ tag: BLOG_TAG.PAYMENTS })
    })
  })
})

describe("the filters sheet on small screens", () => {
  it("names the active filters on its button, changes the topic and the sort as they are picked and shows the matches", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: `${ROUTES.BLOG.INDEX}?tag=${BLOG_TAG.AUTH}`, posts: POSTS })

    await user.click(finder().getByRole("button", { name: /^Filters.*1 active$/u }))

    const sheet = within(await screen.findByRole("dialog", { name: archive.filters }))
    expect(sheet.getByRole("radiogroup", { name: archive.sort })).toBeVisible()
    expect(sheet.queryByRole("button", { name: /topics$/u })).toBeNull()

    await user.click(sheet.getByRole("radio", { name: `${tags[BLOG_TAG.PAYMENTS]}, 1 post` }))
    await user.click(sheet.getByRole("radio", { name: archive.sorts.updated }))

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ sort: BLOG_SORT.UPDATED, tag: BLOG_TAG.PAYMENTS })
    })

    await user.click(sheet.getByRole("button", { name: "Show 1 post" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    expect(finder().getByRole("button", { name: /^Filters.*2 active$/u })).toBeVisible()
  })

  it("clears every filter from the sheet and has nothing to clear afterwards", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: `${ROUTES.BLOG.INDEX}?q=polar&tag=${BLOG_TAG.PAYMENTS}`, posts: POSTS })

    await user.click(finder().getByRole("button", { name: /^Filters/u }))
    const sheet = within(await screen.findByRole("dialog", { name: archive.filters }))
    await user.click(sheet.getByRole("button", { name: archive.clearAll }))

    await waitFor(() => {
      expect(router.state.location.searchStr).toBe("")
    })
    expect(sheet.getByRole("button", { name: archive.clearAll })).toBeDisabled()
    expect(sheet.getByRole("button", { name: `Show ${String(POSTS.length)} posts` })).toBeVisible()
  })
})

describe("the post finder beside an archive page", () => {
  it("narrows its index as the reader types and opens the blog's archive with the search on Enter", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: `${ROUTES.BLOG.INDEX}/page/2`, posts: POSTS })
    const search = finder().getByRole("searchbox", { name: archive.search })

    await user.type(search, "polar")

    expect(indexTitles()).toStrictEqual(["Polar payments"])
    expect(router.state.location.pathname).toBe(`${ROUTES.BLOG.INDEX}/page/2`)

    await user.type(search, "{Enter}")

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.BLOG.INDEX)
    })
    expect(router.state.location.search).toEqual({ q: "polar" })
    expect(router.state.location.hash).toBe(BLOG_ARCHIVE.SECTION_ID)
  })

  it("opens the blog's archive on the topic the reader picks", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: `${ROUTES.BLOG.INDEX}/page/2`, posts: POSTS })

    await user.click(finder().getByRole("radio", { name: `${tags[BLOG_TAG.RELEASE]}, 1 post` }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.BLOG.INDEX)
    })
    expect(router.state.location.search).toEqual({ tag: BLOG_TAG.RELEASE })
  })

  it("opens the blog's archive from the sheet", async () => {
    const user = userEvent.setup({ delay: null })
    const router = await renderBlog({ locale: "en-US", path: `${ROUTES.BLOG.INDEX}/page/2`, posts: POSTS })

    await user.click(finder().getByRole("button", { name: archive.filters }))
    await user.click(within(await screen.findByRole("dialog", { name: archive.filters })).getByRole("button", { name: "Show 3 posts" }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTES.BLOG.INDEX)
    })
    expect(router.state.location.hash).toBe(BLOG_ARCHIVE.SECTION_ID)
  })
})
