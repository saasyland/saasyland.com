import { render } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { Bluesky, Github, Google, HackerNews, Icons, LinkedIn, Reddit, XLogo } from "~/src/presentation/components/custom/icons"

describe("icons helper", () => {
  it("renders github and google icons", () => {
    expect.hasAssertions()
    render(
      <div>
        <Github className="github-icon" />
        <Google className="google-icon" />
      </div>,
    )
    expect(document.querySelector(".github-icon")).toBeInTheDocument()
    expect(document.querySelector(".google-icon")).toBeInTheDocument()
    expect(Icons.Github).toBe(Github)
  })

  it.each([
    { Mark: Bluesky, name: "Bluesky" },
    { Mark: HackerNews, name: "Hacker News" },
    { Mark: LinkedIn, name: "LinkedIn" },
    { Mark: Reddit, name: "Reddit" },
    { Mark: XLogo, name: "X" },
  ])("renders the $name mark hidden from assistive technology in the current colour", ({ Mark }) => {
    const { container } = render(<Mark className="share-mark" />)
    const mark = container.querySelector("svg")

    expect(mark).toHaveClass("share-mark")
    expect(mark).toHaveAttribute("aria-hidden", "true")
    expect(mark).toHaveAttribute("fill", "currentColor")
  })
})
