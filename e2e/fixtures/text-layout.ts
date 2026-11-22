import type { Locator } from "@playwright/test"

export interface TextLayoutProblems {
  readonly clipped: readonly string[]
  readonly overflow: readonly string[]
  readonly overlaps: readonly string[]
  readonly truncated: readonly string[]
}

export const textLayoutProblems = async (scope: Locator): Promise<TextLayoutProblems> =>
  scope.evaluate((root) => {
    const MIN_BOX_PX = 2
    const OVERLAP_SHARE = 0.4
    const TRUNCATED_BELOW_PX = 48
    const ICON_MAX_PX = 32
    const SAMPLE_LENGTH = 40
    const CLIPPING = new Set(["clip", "hidden"])
    const SCROLLING = new Set(["auto", "scroll"])
    const OVERLAY = new Set(["absolute", "fixed", "sticky"])

    interface Box {
      readonly element: Element
      readonly rect: DOMRect
      readonly text: string
    }

    interface Clip {
      readonly clipped: boolean
      readonly rect: DOMRect
    }

    const label = (element: Element, text: string): string =>
      `${element.tagName.toLowerCase()}${element.getAttribute("data-slot") === null ? "" : `[${element.getAttribute("data-slot") ?? ""}]`} "${text.trim().slice(0, SAMPLE_LENGTH)}"`

    const isHiddenByClip = (style: CSSStyleDeclaration): boolean => style.clipPath === "inset(50%)" || style.clip === "rect(0px, 0px, 0px, 0px)"

    const isShown = (element: Element): boolean => {
      if (!element.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) {
        return false
      }
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        if (node.classList.contains("sr-only") || isHiddenByClip(getComputedStyle(node))) {
          return false
        }
      }
      return element.getClientRects().length > 0
    }

    const isScroller = (style: CSSStyleDeclaration): boolean => SCROLLING.has(style.overflowX) && style.scrollbarWidth !== "none"

    const clipOf = (element: Element, line: DOMRect): Clip => {
      let { bottom, left, right, top } = line
      let clipped = false
      let reachable = false
      left = Math.max(left, 0)
      right = Math.min(right, document.documentElement.clientWidth)
      for (let node: Element | null = element; node !== null && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.overflowX !== "visible" || style.overflowY !== "visible") {
          const frame = node.getBoundingClientRect()
          const cuts = line.left < frame.left - 1 || line.right > frame.right + 1
          const intended = style.textOverflow === "ellipsis" || style.maskImage !== "none" || node.getAnimations({ subtree: true }).length > 0
          clipped ||= cuts && !reachable && !intended && (CLIPPING.has(style.overflowX) || !isScroller(style))
          reachable ||= isScroller(style) || (cuts && intended)
          left = Math.max(left, frame.left)
          right = Math.min(right, frame.right)
          top = Math.max(top, frame.top)
          bottom = Math.min(bottom, frame.bottom)
        }
      }
      return { clipped, rect: new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top)) }
    }

    const texts: Box[] = []
    const clipped: string[] = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node.textContent ?? ""
      const element = node.parentElement
      if (text.trim().length > 0 && element !== null && isShown(element)) {
        const range = document.createRange()
        range.selectNodeContents(node)
        for (const line of range.getClientRects()) {
          const clip = clipOf(element, line)
          if (clip.rect.width > MIN_BOX_PX && clip.rect.height > MIN_BOX_PX) {
            texts.push({ element, rect: clip.rect, text })
            if (clip.clipped) {
              clipped.push(label(element, text))
            }
          }
        }
      }
    }

    const isOverlayControl = (icon: Element): boolean => {
      const control = icon.closest("a, button")
      for (let node: Element | null = control; node !== null && node !== root; node = node.parentElement) {
        if (OVERLAY.has(getComputedStyle(node).position)) {
          return true
        }
      }
      return false
    }

    const icons: Box[] = [...root.querySelectorAll("svg")]
      .filter((icon) => isShown(icon) && icon.getBoundingClientRect().width <= ICON_MAX_PX && !isOverlayControl(icon))
      .map((icon) => ({ element: icon, rect: clipOf(icon, icon.getBoundingClientRect()).rect, text: icon.getAttribute("class") ?? "icon" }))
      .filter(({ rect }) => rect.width > MIN_BOX_PX && rect.height > MIN_BOX_PX)

    const collides = (first: Box, second: Box): boolean => {
      if (first.element === second.element || first.element.contains(second.element) || second.element.contains(first.element)) {
        return false
      }
      const height = Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top)
      const width = Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left)
      return width > MIN_BOX_PX && height > Math.min(first.rect.height, second.rect.height) * OVERLAP_SHARE
    }

    const boxes = [...texts, ...icons]
    const overlaps = texts.flatMap((first, index) =>
      boxes
        .slice(index + 1)
        .filter((second) => collides(first, second))
        .map((second) => `${label(first.element, first.text)} overlaps ${label(second.element, second.text)}`),
    )

    const truncated = [root, ...root.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element)
        return isShown(element) && style.textOverflow === "ellipsis" && element.scrollWidth > element.clientWidth + 1 && element.clientWidth < TRUNCATED_BELOW_PX
      })
      .map((element) => label(element, element.textContent ?? ""))

    const { clientWidth, scrollWidth } = document.documentElement
    const overflow = scrollWidth > clientWidth ? [`the page is ${String(scrollWidth - clientWidth)}px wider than the window`] : []

    return { clipped: [...new Set(clipped)], overflow, overlaps: [...new Set(overlaps)], truncated }
  })
