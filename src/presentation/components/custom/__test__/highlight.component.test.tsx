import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { MotionProvider } from "~/src/providers/motion-provider"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"

const glowOf = (item: Element): Element | null => item.querySelector(":scope > [aria-hidden]")

describe("group highlights", () => {
  it.each([
    { element: "div", item: "DIV" },
    { element: "dl", item: "DIV" },
    { element: "ul", item: "LI" },
  ] as const)("moves the highlight in a $element group without lifting the item it lights, and clears it", async ({ element, item }) => {
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
    expect(container.querySelector(`${element}.group`)).toHaveClass("isolate")
    expect(first.tagName).toBe(item)
    expect(glowOf(first)).toBeNull()
    fireEvent.mouseEnter(first)
    expect(glowOf(first)).toHaveClass("z-10")
    fireEvent.mouseEnter(second)
    expect(glowOf(second)).toHaveClass("z-10")
    expect([...second.classList].filter((name) => name.startsWith("z-"))).toStrictEqual([])
    fireEvent.mouseLeave(second)
    await waitFor(() => {
      expect(glowOf(second)).toBeNull()
    })
  })

  it("allows a standalone item without adding hover state", () => {
    render(
      <HighlightItem id="standalone" className="item">
        Standalone
      </HighlightItem>,
    )
    const item = screen.getByText("Standalone")
    fireEvent.mouseEnter(item)
    expect(item.closest(".item")?.querySelector(":scope > [aria-hidden]")).toBeNull()
  })
})
