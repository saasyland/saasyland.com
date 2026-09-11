import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { type BlogPostSummary, blogPostsQuery } from "~/src/integrations/fumadocs/fumadocs.blog"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { BlogHeader } from "~/src/presentation/components/custom/blog/components/blog-header"
import { PostCta } from "~/src/presentation/components/custom/blog/components/post-cta"
import { PostLedger, PostRow } from "~/src/presentation/components/custom/blog/components/post-ledger"
import { PostShare } from "~/src/presentation/components/custom/blog/components/post-share"
import { PostToc, PostTocItem } from "~/src/presentation/components/custom/blog/components/post-toc"
import { NotesSection } from "~/src/presentation/components/custom/landing-page/sections/notes-section"

const messages = getTestMessages("en-US")
const post = (title: string, data: Partial<BlogPostSummary["data"]> = {}): BlogPostSummary => ({
  data: {
    authorImage: undefined,
    authorName: "Author",
    date: new Date("2026-01-01"),
    description: undefined,
    excerpt: undefined,
    featured: false,
    image: undefined,
    published: true,
    readingTimeMinutes: undefined,
    tags: undefined,
    title,
    updated: undefined,
    ...data,
  },
  path: `${title}.mdx`,
  url: `/blog/${title}`,
})

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("blog presentation", () => {
  it("keeps the blog navigation current and localizes the pricing call to action", () => {
    const polish = getTestMessages("pl-PL")
    renderWithRouter(
      <IntlProvider locale="pl-PL" messages={polish}>
        <BlogHeader />
        <PostCta />
      </IntlProvider>,
    )
    expect(screen.getByRole("link", { name: polish.pages.blog.nav.blog })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: polish.pages.blog.nav.docs })).toHaveAttribute("href", "/docs")
    expect(screen.getByRole("link", { name: polish.pages.blog.post.cta.primary })).toHaveAttribute("href", "/pl-PL#pricing")
    expect(screen.getByRole("link", { name: polish.pages.blog.nav.getStarted })).toHaveAttribute("href", "/#pricing")
  })

  it("encodes sharing targets and copies the canonical URL", async () => {
    const user = userEvent.setup()
    const url = "https://saasyland.com/blog/a?ref=share&lang=en"
    const title = "React & SaaS / launch"
    renderWithRouter(
      <IntlProvider locale="en-US" messages={messages}>
        <PostShare title={title} url={url} />
      </IntlProvider>,
    )
    const shareOnX = screen.getByRole("link", { name: messages.pages.blog.post.share.x })
    expect(new URL(shareOnX.getAttribute("href") ?? "").searchParams.get("text")).toBe(title)
    expect(new URL(shareOnX.getAttribute("href") ?? "").searchParams.get("url")).toBe(url)
    expect(shareOnX).toHaveAttribute("rel", "noopener noreferrer")
    const linkedIn = screen.getByRole("link", { name: messages.pages.blog.post.share.linkedin })
    expect(new URL(linkedIn.getAttribute("href") ?? "").searchParams.get("url")).toBe(url)
    await user.click(screen.getByRole("button", { name: messages.pages.blog.post.share.copy }))
    expect(await navigator.clipboard.readText()).toBe(url)
  })

  it("links table-of-contents entries and distinguishes nested headings", () => {
    renderWithRouter(
      <PostToc label="Contents">
        <PostTocItem depth={2} href="#start">
          Start
        </PostTocItem>
        <PostTocItem depth={3} href="#detail">
          Detail
        </PostTocItem>
      </PostToc>,
    )
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "#start")
    expect(screen.getByRole("link", { name: "Start" })).toHaveClass("pl-4")
    expect(screen.getByRole("link", { name: "Detail" })).toHaveClass("pl-7")
  })

  it("renders summaries, tags and nonzero reading times without empty placeholders", () => {
    renderWithRouter(
      <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
        <PostLedger>
          <PostRow post={post("Complete", { description: "Article summary", readingTimeMinutes: 5, tags: ["React", "SaaS"] })} />
          <PostRow post={post("Minimal", { readingTimeMinutes: 0, tags: [] })} />
          <PostRow post={post("No metadata")} />
        </PostLedger>
      </IntlProvider>,
    )
    expect(screen.getByText("Article summary")).toBeVisible()
    expect(screen.getByText("React · SaaS")).toBeVisible()
    expect(screen.getByText("5 min read")).toBeVisible()
    expect(screen.queryByText("0 min read")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Minimal" })).toHaveAttribute("href", "/blog/Minimal")
  })

  it("prioritizes featured notes, filters drafts, and fills the remaining slots with the newest posts", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(blogPostsQuery("en-US").queryKey, [
      post("Draft", { date: new Date("2026-09-10"), published: false }),
      post("Old", { date: new Date("2025-01-01") }),
      post("Newest", { date: new Date("2026-09-08"), description: "Newest summary", readingTimeMinutes: 7 }),
      post("Featured", { featured: true }),
      post("Second", { date: new Date("2026-09-07") }),
    ])
    renderWithRouter(
      <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
        <NotesSection />
      </IntlProvider>,
      { queryClient },
    )
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Featured", "Newest", "Second"])
    expect(screen.queryByRole("link", { name: "Draft" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Old" })).not.toBeInTheDocument()
    expect(screen.getByText("Newest summary")).toBeVisible()
    expect(screen.getByText(/7 min read/u)).toBeVisible()
    expect(screen.getByRole("link", { name: messages.pages.landing.notes.cta })).toHaveAttribute("href", "/blog")
    expect(within(screen.getByRole("heading", { name: "Featured" })).getByRole("link")).toHaveAttribute("href", "/blog/Featured")
    queryClient.clear()
  })
})
