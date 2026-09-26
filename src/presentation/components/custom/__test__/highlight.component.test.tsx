import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { MotionProvider } from "~/src/providers/motion-provider"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"

describe("group highlights", () => {
  it.each(["div", "dl"] as const)("moves and clears the highlight in a %s group", (element) => {
    const { container } = render(
      <MotionProvider>
        <HighlightGroup className="group" element={element} name="specifications">
          <HighlightItem className="first" contentClassName="content" id="first">
            First
          </HighlightItem>
          <HighlightItem className="second" id="second">
            Second
          </HighlightItem>
        </HighlightGroup>
      </MotionProvider>,
    )
    const first = screen.getByText("First").closest(".first")
    const second = screen.getByText("Second").closest(".second")
    if (!first || !second) {
      throw new Error("Highlight items missing")
    }
    expect(container.querySelector(`${element}.group`)).toBeInTheDocument()
    expect(first).not.toHaveClass("z-10")
    fireEvent.mouseEnter(first)
    expect(first).toHaveClass("z-10")
    fireEvent.mouseEnter(second)
    expect(second).toHaveClass("z-10")
    expect(first).not.toHaveClass("z-10")
    fireEvent.mouseLeave(second)
    expect(second).not.toHaveClass("z-10")
  })

  it("allows a standalone item without adding hover state", () => {
    render(
      <HighlightItem id="standalone" className="item">
        Standalone
      </HighlightItem>,
    )
    const item = screen.getByText("Standalone")
    fireEvent.mouseEnter(item)
    expect(item.closest(".item")).not.toHaveClass("z-10")
  })
})
