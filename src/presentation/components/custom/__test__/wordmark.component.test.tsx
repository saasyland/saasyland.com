import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { APP_NAME } from "~/src/presentation/branding"

describe("wordmark", () => {
  it("renders the mark beside the product name", () => {
    expect.hasAssertions()
    const { container } = render(<Wordmark className="test-wordmark" />)
    expect(container.querySelector(".test-wordmark")).toBeInTheDocument()
    expect(screen.getByText(APP_NAME)).toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
