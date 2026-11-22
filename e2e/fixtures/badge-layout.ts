import type { Locator } from "@playwright/test"

export interface BadgeLayout {
  readonly badges: number
  readonly inkOffset: number
  readonly metaDrift: number
  readonly metaRows: number
  readonly titleGaps: readonly number[]
}

export const BADGE_INK_TOLERANCE_PX = 0.5

export const META_ROW_TOLERANCE_PX = 1

export const TITLE_GAP_TOLERANCE_PX = 0.5

export const badgeLayout = async (scope: Locator): Promise<BadgeLayout> =>
  scope.evaluate((root) => {
    const context = document.createElement("canvas").getContext("2d")
    if (context === null) {
      throw new Error("no canvas context to measure type with")
    }

    const isShown = (element: Element): boolean => {
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        if (getComputedStyle(node).clipPath === "inset(50%)") {
          return false
        }
      }
      return element.getClientRects().length > 0
    }

    const capCentre = (element: Element): number => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement
        if (parent !== null && isShown(parent) && (node.textContent ?? "").trim().length > 0) {
          const probe = document.createElement("span")
          probe.style.display = "inline-block"
          parent.prepend(probe)
          const baseline = probe.getBoundingClientRect().bottom
          probe.remove()
          const style = getComputedStyle(parent)
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
          return baseline - context.measureText("H").actualBoundingBoxAscent / 2
        }
      }
      return Number.NaN
    }

    const centre = (element: Element): number => element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2

    const sharesLine = (first: Element, second: Element): boolean =>
      first.getBoundingClientRect().top < second.getBoundingClientRect().bottom && second.getBoundingClientRect().top < first.getBoundingClientRect().bottom

    const badges = [...root.querySelectorAll("[data-slot=badge]")].filter((badge) => isShown(badge))
    const rows = [...root.querySelectorAll("[data-slot=lesson-meta]")].filter((row) => isShown(row))

    const rowDrift = (row: Element): number => {
      const badge = row.querySelector("[data-slot=badge]")
      if (badge === null || !isShown(badge)) {
        return 0
      }
      const line = capCentre(badge)
      const items = [...row.querySelectorAll(":scope > :not([data-slot=badge]), :scope > * > :not(svg)")].filter(
        (item) => isShown(item) && item.childElementCount === 0 && sharesLine(item, badge),
      )
      const icons = [...row.querySelectorAll("svg")].filter((icon) => isShown(icon) && sharesLine(icon, badge))
      return Math.max(0, ...items.map((item) => Math.abs(capCentre(item) - line)), ...icons.map((icon) => Math.abs(centre(icon) - line)))
    }

    const titleGap = (row: Element): number[] => {
      const title = row.parentElement?.querySelector("[data-slot=lesson-title]")
      if (title === null || title === undefined) {
        return []
      }
      return [row.getBoundingClientRect().top - title.getBoundingClientRect().bottom]
    }

    return {
      badges: badges.length,
      inkOffset: Math.max(0, ...badges.map((badge) => Math.abs(capCentre(badge) - centre(badge)))),
      metaDrift: Math.max(0, ...rows.map((row) => rowDrift(row))),
      metaRows: rows.length,
      titleGaps: rows.flatMap((row) => titleGap(row)),
    }
  })
