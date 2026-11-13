import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]

export const COLOR_SCHEMES = ["light", "dark"] as const

const revealWholePage = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const nextFrame = async (): Promise<void> => {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    for (let top = 0; top < document.documentElement.scrollHeight; top += window.innerHeight / 2) {
      window.scrollTo({ behavior: "instant", top })
      await nextFrame()
    }
    window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight })
    await nextFrame()
  })
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

