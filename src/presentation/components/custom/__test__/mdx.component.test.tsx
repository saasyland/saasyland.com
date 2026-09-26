import { getRequest } from "@tanstack/react-start/server"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

beforeEach(() => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/pl-PL/docs"))
})

const { a: Anchor, pre: Pre } = mdxComponents

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

  it("renders fenced code through the code block component", () => {
    render(
      <Pre>
        <code>const ready = true</code>
      </Pre>,
    )
    expect(screen.getByText("const ready = true").closest("pre")).toBeInTheDocument()
  })
})
