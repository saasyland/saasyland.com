import type { ReactElement } from "react"

import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_GENERATION, CLI_GENERATION_VALUES, CLI_INIT_COMMAND } from "~/src/data/cli"
import { FEATURE_STATUS } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { PostCta } from "~/src/presentation/components/custom/blog/post-cta"
import { CliSection } from "~/src/presentation/components/custom/landing-page/sections/cli-section"
import { FaqSection } from "~/src/presentation/components/custom/landing-page/sections/faq-section"
import { GateSection } from "~/src/presentation/components/custom/landing-page/sections/gate-section"
import { HeroSection } from "~/src/presentation/components/custom/landing-page/sections/hero-section"
import { LineSection } from "~/src/presentation/components/custom/landing-page/sections/line-section"
import { ManifestSection } from "~/src/presentation/components/custom/landing-page/sections/manifest-section"
import { PricingSection } from "~/src/presentation/components/custom/landing-page/sections/pricing-section"

import pricing from "~/messages/en-US/components.custom.pricing.json"
import blog from "~/messages/en-US/pages.blog.json"
import landing from "~/messages/en-US/pages.landing.json"

vi.mock(import("~/src/data/cli"), async (importOriginal) => {
  const actual = await importOriginal()
  const { FEATURE_STATUS: STATUS } = await import("~/src/data/navigation.constants")

  return {
    ...actual,
    CLI_GENERATION: STATUS.AVAILABLE,
    CLI_GENERATION_VALUES: { ...actual.CLI_GENERATION_VALUES, generation: STATUS.AVAILABLE },
  }
})

const MESSAGE_KEY = "message"

const plain = (message: string): string =>
  createTranslator({ locale: I18N.DEFAULT_LOCALE, messages: { [MESSAGE_KEY]: message } }).markup(MESSAGE_KEY, {
    ...REPOSITORY_FACTS,
    ...CLI_GENERATION_VALUES,
    accent: (chunks: string) => chunks,
    strong: (chunks: string) => chunks,
  })

const renderSection = (ui: ReactElement) =>
  renderWithRouter(
    <IntlProvider locale={I18N.DEFAULT_LOCALE} messages={getTestMessages(I18N.DEFAULT_LOCALE)} timeZone="UTC">
      <MotionProvider>{ui}</MotionProvider>
    </IntlProvider>,
  )

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("copy once project generation is available", () => {
  it("writes every generation sentence in its available variant, with the init command", async () => {
    const user = userEvent.setup({ delay: null })
    expect(CLI_GENERATION).toBe(FEATURE_STATUS.AVAILABLE)
    const { container } = renderSection(
      <>
        <HeroSection />
        <CliSection />
        <LineSection />
        <ManifestSection />
        <FaqSection />
        <GateSection />
        <PostCta />
      </>,
    )
    await user.click(screen.getByRole("button", { name: plain(landing.faq.items.q1.question) }))

    for (const message of [
      landing.hero.description,
      landing.cli.lead,
      landing.cli.generates,
      landing.cli.reuse.body,
      landing.line.stations.edge.body,
      landing.manifest.lead,
      landing.faq.items.q1.answer,
      landing.gate.assurance,
      blog.post.cta.body,
    ]) {
      expect(container.textContent).toContain(plain(message))
    }
    expect(container.textContent).toContain(CLI_INIT_COMMAND)
  })

  it("gives the Core card its available tagline", () => {
    renderSection(<PricingSection />)
    const card = screen.getByRole("heading", { name: pricing.tiers.core.name }).parentElement
    if (!card) {
      throw new Error("The Core card is missing")
    }

    expect(within(card).getByText(plain(pricing.tiers.core.tagline))).toBeVisible()
  })
})
