import { getRequest } from "@tanstack/react-start/server"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

beforeEach(() => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/pl-PL/docs"))
})

const { a: Anchor, Card, li: ListItem, pre: Pre } = mdxComponents

describe("MDX components", () => {
  it.each([
    ["/docs/architecture", "/pl-PL/docs/architecture"],
    ["/blog/first-post#faq", "/pl-PL/blog/first-post#faq"],
    ["https://example.com", "https://example.com"],
    ["#shape", "#shape"],
  ])("links %s to %s in the current locale", (href, expected) => {
    render(<Anchor href={href}>Link</Anchor>)
    expect(screen.getByRole("link", { name: "Link" })).toHaveAttribute("href", expected)
  })

  it.each([
    ["/blog/first-post", "/pl-PL/blog/first-post"],
    ["https://example.com", "https://example.com"],
  ])("links a card to %s as %s in the current locale", (href, expected) => {
    render(<Card href={href} title="Related post" />)
    expect(screen.getByRole("link", { name: /Related post/u })).toHaveAttribute("href", expected)
  })

  it("renders fenced code through the code block component", () => {
    render(
      <Pre>
        <code>const ready = true</code>
      </Pre>,
    )
    expect(screen.getByText("const ready = true").closest("pre")).toBeInTheDocument()
  })

  it("keeps an untitled code block out of the landmarks and names a titled one by its caption", () => {
    render(
      <>
        <Pre>
          <code>bun install</code>
        </Pre>
        <Pre title="vite.config.ts">
          <code>export default config</code>
        </Pre>
      </>,
    )
    expect(screen.getAllByRole("region")).toStrictEqual([screen.getByRole("region", { name: "vite.config.ts" })])
    expect(screen.getByRole("region", { name: "vite.config.ts" })).toHaveTextContent("export default config")
  })

  it("names a task list checkbox by the text of its item", () => {
    render(
      <ul>
        <ListItem className="task-list-item">
          <input disabled type="checkbox" /> Tests cover UNAUTHORIZED
        </ListItem>
      </ul>,
    )
    expect(screen.getByRole("checkbox", { name: "Tests cover UNAUTHORIZED" })).toBeDisabled()
  })

  it("renders other list items as they are", () => {
    render(
      <ul>
        <ListItem>Plain item</ListItem>
      </ul>,
    )
    expect(screen.getByText("Plain item")).toBe(screen.getByRole("listitem"))
  })
})
