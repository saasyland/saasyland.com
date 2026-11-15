import { render } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { Background, backgroundGridPatternClassName } from "~/src/presentation/components/custom/background"

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
