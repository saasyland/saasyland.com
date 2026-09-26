import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { Background, backgroundGridPatternClassName } from "~/src/presentation/components/custom/background"
import { Github, Google, Icons } from "~/src/presentation/components/custom/icons"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { APP_NAME } from "~/src/presentation/branding"

describe("background helper", () => {
  it("renders grid and signal by default", () => {
    expect.hasAssertions()
    const { container } = render(<Background className="test-grid" />)
    expect(container.querySelector(".test-grid")).toHaveClass(backgroundGridPatternClassName)
    expect(container.querySelector(".field-signal")).toBeInTheDocument()
  })

  it("can hide the signal", () => {
    expect.hasAssertions()
    const { container } = render(<Background glow={false} />)
    expect(container.querySelector(".field-signal")).not.toBeInTheDocument()
  })
})

describe("wordmark", () => {
  it("renders the mark beside the product name", () => {
    expect.hasAssertions()
    const { container } = render(<Wordmark className="test-wordmark" />)
    expect(container.querySelector(".test-wordmark")).toBeInTheDocument()
    expect(screen.getByText(APP_NAME)).toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})

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
})
