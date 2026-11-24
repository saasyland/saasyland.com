import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]

export const COLOR_SCHEMES = ["light", "dark"] as const

const WAITING_FOR_VIEWPORT = "[data-reveal=hidden]"

const revealWholePage = async (page: Page): Promise<void> => {
  await page.evaluate(async (waiting) => {
    const nextFrame = async (): Promise<void> => {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    const visited = new Set<Element>()
    const nextWaiting = (): Element | undefined => [...document.querySelectorAll(waiting)].find((element) => !visited.has(element))
    await nextFrame()
    for (let element = nextWaiting(); element !== undefined; element = nextWaiting()) {
      visited.add(element)
      element.scrollIntoView({ behavior: "instant", block: "center" })
      await nextFrame()
    }
    window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight })
    await nextFrame()
  }, WAITING_FOR_VIEWPORT)
}

export const accessibilityViolations = async (page: Page): Promise<string[]> => {
  await revealWholePage(page)
  await page.evaluate(async () => {
    const timedAnimations = document
      .getAnimations()
      .filter((animation) => animation.timeline === document.timeline && animation.effect?.getComputedTiming().iterations !== Infinity)
    await Promise.allSettled(timedAnimations.map(async (animation) => animation.finished))
  })
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

  return violations.map(
    ({ help, id, impact, nodes }) => `${id} (${impact ?? "unknown"}): ${help} at ${nodes.map(({ target }) => target.join(" ")).join(", ")}`,
  )
}

