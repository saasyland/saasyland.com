import type { ReactElement } from "react"

import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

import { CONSULTING_HOURLY_RATE } from "~/src/data/marketing"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { CasesSection } from "~/src/presentation/components/custom/landing-page/sections/cases-section"
import { CliSection } from "~/src/presentation/components/custom/landing-page/sections/cli-section"
import { CompareSection } from "~/src/presentation/components/custom/landing-page/sections/compare-section"
import { FaqSection } from "~/src/presentation/components/custom/landing-page/sections/faq-section"
import { GateSection } from "~/src/presentation/components/custom/landing-page/sections/gate-section"
import { HeroSection } from "~/src/presentation/components/custom/landing-page/sections/hero-section"
import { LineSection } from "~/src/presentation/components/custom/landing-page/sections/line-section"
import { ManifestSection } from "~/src/presentation/components/custom/landing-page/sections/manifest-section"
import { ManifestoSection } from "~/src/presentation/components/custom/landing-page/sections/manifesto-section"
import { PricingSection } from "~/src/presentation/components/custom/landing-page/sections/pricing-section"
import { QualitySection } from "~/src/presentation/components/custom/landing-page/sections/quality-section"
import { RallySection } from "~/src/presentation/components/custom/landing-page/sections/rally-section"
import { RecordSection } from "~/src/presentation/components/custom/landing-page/sections/record-section"
import { StackSection } from "~/src/presentation/components/custom/landing-page/sections/stack-section"
import { StudioSection } from "~/src/presentation/components/custom/landing-page/sections/studio-section"

import pricing from "~/messages/en-US/components.custom.pricing.json"
import english from "~/messages/en-US/pages.landing.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const withFacts = (message: string): string => createTranslator({ locale: "en-US", messages: { message } })("message", REPOSITORY_FACTS)

const renderSection = (ui: ReactElement) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
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
  document.cookie = "regional_pricing=; max-age=0"
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("regional pricing", () => {
  it("shows the comparison and closing prices with the struck-through regular price", () => {
    const { container } = renderSection(
      <>
        <CompareSection />
        <GateSection />
      </>,
    )

    expect(
      screen.getByText("once, with no subscription or per-user fees", { exact: false }).querySelector("s.pv-regional"),
    ).toHaveTextContent("Regular price $249")
    expect(container.querySelector("#gate s.pv-regional")).toHaveTextContent("Regular price $249")
  })

  it("pairs every regional price with the struck-through regular price", () => {
    const { container } = renderSection(<PricingSection />)
    const regular = [...container.querySelectorAll("s.pv-regional")].map((element) => element.textContent)

    expect(regular).toEqual(["Regular price $249", "Regular price $399", "Regular price $899", "Regular price $249"])
    for (const price of ["$199.20", "$174.30", "$149.40", "$124.50", "$279.30", "$629.30"]) {
      expect(screen.getAllByText(price).length).toBeGreaterThan(0)
    }
    expect(container.querySelectorAll(".pv-regional.basis-full")).toHaveLength(3)
  })

  it("applies regional pricing by default and remembers when the buyer turns it off", async () => {
    const user = userEvent.setup({ delay: null })
    renderSection(<PricingSection />)
    const offer = screen.getByRole("checkbox", { name: /off with regional pricing/u })

    expect(offer).toBeChecked()
    await user.click(offer)
    expect(offer).not.toBeChecked()
    expect(document.cookie).toContain("regional_pricing=off")
    await user.click(offer)
    expect(document.cookie).not.toContain("regional_pricing=off")
  })
  it("starts unchecked for a buyer who already turned regional pricing off", () => {
    document.cookie = "regional_pricing=off"
    renderSection(<PricingSection />)

    expect(screen.getByRole("checkbox", { name: /off with regional pricing/u })).not.toBeChecked()
  })
})

describe("marketing content and purchase links", () => {
  it("offers a working install command for every package manager", async () => {
    const user = userEvent.setup({ delay: null })
    renderSection(<HeroSection />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("300+ hour head start")
    expect(screen.getByRole("link", { name: english.hero.ctaPrimary })).toHaveAttribute("href", "#pricing")
    expect(screen.getByRole("link", { name: english.hero.ctaSecondary })).toHaveAttribute("href", "#foundation")
    for (const [runner, command] of [
      ["bun", "bunx"],
      ["npm", "npx"],
      ["pnpm", "pnpm dlx"],
      ["yarn", "yarn dlx"],
    ] as const) {
      await user.click(screen.getByRole("radio", { name: runner }))
      expect(screen.getByRole("radio", { name: runner })).toBeChecked()
      expect(screen.getByText(`${command} saasyland@latest init my-app`)).toBeVisible()
    }
    await user.click(screen.getByRole("button", { name: english.hero.surface.copy }))
    expect(await navigator.clipboard.readText()).toBe("yarn dlx saasyland@latest init my-app")
  })

  it("sends each tier to sign-up with a return path that keeps the chosen tier, and marks only the featured tier", () => {
    renderSection(<PricingSection />)
    for (const [id, tier] of Object.entries(pricing.tiers)) {
      expect(screen.getByRole("heading", { name: tier.name })).toBeVisible()
      expect(screen.getByRole("link", { name: tier.cta })).toHaveAttribute(
        "href",
        `${ROUTES.SIGN_UP}?redirect=${encodeURIComponent(`${ROUTES.APP}?tier=${id}`)}`,
      )
      for (const feature of Object.values(tier.features)) {
        expect(screen.getAllByText(feature).length).toBeGreaterThan(0)
      }
    }
    expect(screen.getAllByText(pricing.mostPopular)).toHaveLength(1)
    expect(screen.getByRole("link", { name: english.pricing.consulting.cta })).toHaveAttribute(
      "href",
      "mailto:hello@saasyland.com?subject=Architecture%20call",
    )
    expect(screen.getByText(english.pricing.consulting.period).previousElementSibling).toHaveTextContent(
      new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(CONSULTING_HOURLY_RATE),
    )
  })

  it("exposes every FAQ answer through its question and keeps the contact link available", async () => {
    const user = userEvent.setup({ delay: null })
    renderSection(<FaqSection />)
    for (const item of Object.values(english.faq.items)) {
      const trigger = screen.getByRole("button", { name: item.question })
      if (trigger.getAttribute("aria-expanded") !== "true") {
        await user.click(trigger)
      }
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByText(withFacts(item.answer))).toBeVisible()
    }
    expect(screen.getByRole("link", { name: english.faq.contact })).toHaveAttribute("href", "mailto:hello@saasyland.com")
    expect(screen.getByText(english.faq.contactNote.replace("{email}", CONTACT_EMAIL))).toBeVisible()
  })

  it("links only live customer projects and presents the upcoming project without a dead link", () => {
    renderSection(<CasesSection />)
    expect(screen.getByRole("link", { name: english.cases.items.reactprojects.name })).toHaveAttribute("href", "https://reactprojects.com")
    expect(screen.getByRole("heading", { name: english.cases.items.marte.name })).toBeVisible()
    expect(screen.queryByRole("link", { name: english.cases.items.marte.name })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: english.cases.inviteCta })).toHaveAttribute(
      "href",
      "mailto:hello@saasyland.com?subject=Built%20on%20SaaSy%20Land",
    )
  })

  it("preserves the product manifest and evidence behind each claim", () => {
    renderSection(
      <>
        <ManifestSection />
        <RecordSection />
        <QualitySection />
      </>,
    )
    for (const item of Object.values(english.manifest.items)) {
      expect(screen.getByText(item.label, { selector: "dt" })).toBeVisible()
      expect(screen.getByText(withFacts(item.body))).toBeVisible()
    }
    for (const item of Object.values(english.record.items)) {
      expect(screen.getByText(withFacts(item.claim), { selector: "dt" })).toBeVisible()
      expect(screen.getByText(withFacts(item.evidence))).toBeVisible()
    }
    expect(screen.getByText("bun run test:coverage")).toBeInTheDocument()
    expect(
      screen.getByText(`Test Files ${String(REPOSITORY_FACTS.testFiles)} passed (${String(REPOSITORY_FACTS.testFiles)})`),
    ).toBeInTheDocument()
    expect(screen.getByText(/% Branch\s+100/u)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: english.quality.cta })).toHaveAttribute("href", "#pricing")
  })

  it("keeps comparison choices, dimensions, and pricing navigation together", () => {
    renderSection(<CompareSection />)
    for (const item of Object.values(english.compare.options)) {
      expect(screen.getByText(item.title)).toBeVisible()
    }
    for (const item of Object.values(english.compare.dimensions)) {
      expect(screen.getByText(item.label)).toBeVisible()
    }
    expect(screen.getByRole("link", { name: english.compare.cta })).toHaveAttribute("href", "#pricing")
  })

  it("pairs the page designer with the course showcase", () => {
    renderSection(<StudioSection />)
    expect(screen.getByRole("heading", { name: english.studio.builder.title })).toBeVisible()
    expect(screen.getByLabelText(english.studio.builder.imageAlt)).toHaveAttribute("preload", "none")
    expect(screen.getByRole("heading", { name: english.studio.masterclass.title })).toBeVisible()
    expect(screen.getByRole("link", { name: english.studio.masterclass.browse })).toHaveAttribute("href", "/courses")
  })

  it("highlights only the hovered foundation card and resets the highlight on exit", () => {
    const { container } = renderSection(<LineSection />)
    const title = screen.getByRole("heading", { name: english.line.stations.auth.title })
    const card = title.parentElement?.parentElement
    if (!card) {
      throw new Error("Foundation card is missing")
    }
    fireEvent.mouseEnter(card)
    expect(card).toHaveClass("group", "z-10")
    expect(screen.getByText(english.line.stations.auth.body)).toHaveClass("text-muted-foreground", "group-hover:text-foreground")
    const grid = container.querySelector(".grid.gap-px")
    if (!grid) {
      throw new Error("Foundation grid is missing")
    }
    fireEvent.mouseLeave(grid)
    expect(card).not.toHaveClass("z-10")
  })

  it("gives each closing call to action its intended destination", () => {
    const { container } = renderSection(
      <>
        <ManifestoSection />
        <RallySection />
        <GateSection />
        <StackSection />
      </>,
    )
    expect(screen.getByRole("link", { name: english.manifesto.p3 })).toHaveAttribute("href", "#pricing")
    expect(screen.getAllByRole("link", { name: english.rally.ctaPrimary }).some((link) => link.getAttribute("href") === "#cli")).toBe(true)
    expect(screen.getByRole("link", { name: english.gate.ctaSecondary })).toHaveAttribute("href", "/docs")
    expect(screen.getByText(english.gate.assurance)).toBeVisible()
    const stack = screen.getByRole("region", { name: english.stack.title })
    expect(within(stack).getAllByText("Cloudflare")).toHaveLength(2)
    expect(container.querySelector('linearGradient[id="accent-stroke-manifesto"]')).toBeInTheDocument()
  })
})

describe("CLI configuration", () => {
  it("reconciles incompatible API, runtime and database choices when deployment changes", async () => {
    const user = userEvent.setup({ delay: null })
    renderSection(<CliSection />)
    const { choices } = english.cli
    expect(screen.queryByRole("button", { name: choices.api.options.hono })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: choices.architecture.options.split }))
    expect(screen.getByRole("button", { name: choices.api.options.hono })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: choices.api.options.elysia })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: choices.deployment.options.self }))
    await user.click(screen.getByRole("button", { name: choices.api.options.elysia }))
    await user.click(screen.getByRole("button", { name: choices.runtime.options.bun }))
    await user.click(screen.getByRole("button", { name: choices.deployment.options.cloudflare }))
    expect(screen.getByRole("button", { name: choices.api.options.hono })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: choices.runtime.options.node })).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: choices.deployment.options.vercel }))
    expect(screen.getByRole("button", { name: choices.database.options.postgres })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: choices.provider.options.neon })).toHaveAttribute("aria-pressed", "true")
  })

  it("toggles extras and omits them from the command when their required module is disabled", async () => {
    const user = userEvent.setup({ delay: null })
    renderSection(<CliSection />)
    const { choices } = english.cli
    await user.click(screen.getByRole("button", { name: choices.extras.options.commerce }))
    expect(screen.getByText("--with commerce")).toBeVisible()
    await user.click(screen.getByRole("button", { name: choices.extras.options.commerce }))
    expect(screen.queryByText("--with commerce")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: choices.extras.options.courses }))
    const billing = screen.getByText(choices.billing.label, { selector: "dt" }).parentElement
    if (!billing) {
      throw new Error("Billing choice is missing")
    }
    await user.click(within(billing).getByRole("button", { name: choices.billing.options.none }))
    expect(screen.getByRole("button", { name: choices.extras.options.courses })).toBeDisabled()
    expect(screen.queryByText("--with courses")).not.toBeInTheDocument()
  })

  it("copies the selected runner and extra flags with matching development instructions", async () => {
    const user = userEvent.setup({ delay: null })
    renderSection(<CliSection />)
    const { choices } = english.cli
    await user.click(screen.getByRole("button", { name: choices.extras.options["page-builder"] }))
    await user.click(screen.getByRole("radio", { name: "pnpm" }))
    await user.click(screen.getByRole("button", { name: english.cli.copy }))
    const command = await navigator.clipboard.readText()
    expect(command).toContain("pnpm dlx saasyland@latest init my-app")
    expect(command).toContain("--with page-builder")
    expect(command).not.toContain("--with courses")
    expect(screen.getByText("pnpm dev")).toBeVisible()
  })
})
