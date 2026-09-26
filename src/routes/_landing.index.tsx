import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getPublishedBlogPosts } from "~/src/integrations/fumadocs/fumadocs.source"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { starCountQuery } from "~/src/lib/github"
import { pageHead } from "~/src/lib/seo"

import { CasesSection } from "~/src/presentation/components/custom/landing-page/sections/cases-section"
import { CliSection } from "~/src/presentation/components/custom/landing-page/sections/cli-section"
import { CompareSection } from "~/src/presentation/components/custom/landing-page/sections/compare-section"
import { FaqSection } from "~/src/presentation/components/custom/landing-page/sections/faq-section"
import { GateSection } from "~/src/presentation/components/custom/landing-page/sections/gate-section"
import { HeroSection } from "~/src/presentation/components/custom/landing-page/sections/hero-section"
import { LineSection } from "~/src/presentation/components/custom/landing-page/sections/line-section"
import { ManifestSection } from "~/src/presentation/components/custom/landing-page/sections/manifest-section"
import { ManifestoSection } from "~/src/presentation/components/custom/landing-page/sections/manifesto-section"
import { NotesSection } from "~/src/presentation/components/custom/landing-page/sections/notes-section"
import { PricingSection } from "~/src/presentation/components/custom/landing-page/sections/pricing-section"
import { ProofSection } from "~/src/presentation/components/custom/landing-page/sections/proof-section"
import { QualitySection } from "~/src/presentation/components/custom/landing-page/sections/quality-section"
import { RallySection } from "~/src/presentation/components/custom/landing-page/sections/rally-section"
import { RecordSection } from "~/src/presentation/components/custom/landing-page/sections/record-section"
import { StackSection } from "~/src/presentation/components/custom/landing-page/sections/stack-section"
import { StudioSection } from "~/src/presentation/components/custom/landing-page/sections/studio-section"
import { HomePending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

const NOTE_COUNT = 3

const getLatestBlogPosts = createServerFn({ method: "GET" })
  .validator(localeField)
  .handler(({ data: locale }) => {
    const posts = getPublishedBlogPosts(locale)
    return [...posts.filter((post) => post.featured), ...posts.filter((post) => !post.featured)].slice(0, NOTE_COUNT)
  })

const LandingPage = (): JSX.Element => (
  <MotionProvider>
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

const NAMESPACE = "pages.landing"

export const Route = createFileRoute("/_landing/")({
  component: LandingPage,
  head: pageHead(ROUTES.HOME),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata, posts] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      getLatestBlogPosts({ data: locale }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query(starCountQuery).catch(() => {}),
    ])
    return { locale, metadata, posts }
  },
  pendingComponent: HomePending,
  staticData: { namespaces: [NAMESPACE] },
})
