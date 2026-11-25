import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { createFormatter } from "use-intl"

import { MotionProvider } from "~/src/providers/motion-provider"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/license"

import { starCountQuery } from "~/src/lib/github"
import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"
import { ORGANIZATION_STRUCTURED_DATA_HTML, pageHead } from "~/src/lib/seo"

import { HomePending } from "~/src/presentation/components/custom/core-pending"
import { CasesSection } from "~/src/presentation/components/custom/landing-page/sections/cases-section"
import { CliSection } from "~/src/presentation/components/custom/landing-page/sections/cli-section"
import { CompareSection } from "~/src/presentation/components/custom/landing-page/sections/compare-section"
import { FaqSection } from "~/src/presentation/components/custom/landing-page/sections/faq-section"
import { GateSection } from "~/src/presentation/components/custom/landing-page/sections/gate-section"
import { HeroSection } from "~/src/presentation/components/custom/landing-page/sections/hero-section"
import { LineSection } from "~/src/presentation/components/custom/landing-page/sections/line-section"
import { ManifestSection } from "~/src/presentation/components/custom/landing-page/sections/manifest-section"
import { ManifestoSection } from "~/src/presentation/components/custom/landing-page/sections/manifesto-section"
import { NotesSection, loadLandingNotes } from "~/src/presentation/components/custom/landing-page/sections/notes-section"
import { PricingSection } from "~/src/presentation/components/custom/landing-page/sections/pricing-section"
import { ProofSection } from "~/src/presentation/components/custom/landing-page/sections/proof-section"
import { QualitySection } from "~/src/presentation/components/custom/landing-page/sections/quality-section"
import { RallySection } from "~/src/presentation/components/custom/landing-page/sections/rally-section"
import { RecordSection } from "~/src/presentation/components/custom/landing-page/sections/record-section"
import { StackSection } from "~/src/presentation/components/custom/landing-page/sections/stack-section"
import { StudioSection } from "~/src/presentation/components/custom/landing-page/sections/studio-section"

import * as ROUTES from "~/src/routes"

const LandingPage = (): JSX.Element => (
  <MotionProvider>
    <script dangerouslySetInnerHTML={ORGANIZATION_STRUCTURED_DATA_HTML} type="application/ld+json" />
    <HeroSection />
    <ProofSection />
    <StackSection />
    <ManifestoSection />
    <CliSection />
    <LineSection />
    <QualitySection />
    <RallySection />
    <ManifestSection />
    <StudioSection />
    <RecordSection />
    <CasesSection />
    <CompareSection />
    <PricingSection />
    <FaqSection />
    <NotesSection />
    <GateSection />
  </MotionProvider>
)

const LANDING_NAMESPACE = "pages.landing"
const NAMESPACES = [LANDING_NAMESPACE, "pages.landing.notes", "stack"] as const

export const Route = createFileRoute("/_site/_marketing/")({
  component: LandingPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const values = {
      coverageThreshold: REPOSITORY_FACTS.coverageThreshold,
      languages: REPOSITORY_FACTS.languages,
      price: createFormatter({ locale }).number(TIER_PRICES[LICENSE_TIER.CORE], CURRENCY_FORMAT),
    }
    const notes = loadLandingNotes()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: LANDING_NAMESPACE, values }),
      notes,
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
      context.queryClient.query(starCountQuery).catch(() => {}),
    ])
    return { locale, metadata, notes: await notes }
  },
  head: pageHead(ROUTES.HOME),
  pendingComponent: HomePending,
  staticData: { namespaces: NAMESPACES, underHeader: true },
})
