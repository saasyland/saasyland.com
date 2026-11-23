import { type JSX, useId } from "react"

import { useRouterState } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { MotionProvider } from "~/src/providers/motion-provider"

import { LICENSE_OFFER_ID, licenseSearchSchema } from "~/src/data/license"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/src/presentation/components/shadcn/collapsible"

import { CheckoutButton, CheckoutNotice } from "~/src/presentation/components/custom/app/checkout"
import { CourseUnlocks } from "~/src/presentation/components/custom/app/course-unlocks"
import { PricingTiers, type TierAction } from "~/src/presentation/components/custom/pricing"

const TierCheckoutButton: TierAction = ({ featured, tier }) => {
  const t = useTranslations("components.custom.pricing")

  return (
    <CheckoutButton featured={featured} tier={tier}>
      {t(`tiers.${tier}.cta`)}
    </CheckoutButton>
  )
}

const Tiers = (): JSX.Element => (
  <MotionProvider>
    <PricingTiers Action={TierCheckoutButton} />
  </MotionProvider>
)

const ComparedTiers = (): JSX.Element => {
  const t = useTranslations("pages.license.buy")

  return (
    <Collapsible className="group flex flex-col gap-4">
      <CollapsibleTrigger className="flex w-fit cursor-pointer items-center gap-2 rounded-md text-body-sm font-medium text-foreground underline-offset-4 outline-none hover:underline data-focus-visible:outline-2 data-focus-visible:outline-offset-4 data-focus-visible:outline-ring data-focus-visible:outline-solid">
        {t("compare")}
        <ChevronDown
          aria-hidden
          className="size-4 text-muted-foreground transition-transform duration-200 ease-exp group-data-expanded:rotate-180 motion-reduce:transition-none"
          strokeWidth={2}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Tiers />
      </CollapsibleContent>
    </Collapsible>
  )
}

export const LicenseOffer = (): JSX.Element => {
  const t = useTranslations("pages.license.buy")
  const headingId = useId()
  const chosenTier = useRouterState({ select: ({ location }) => licenseSearchSchema.parse(location.search).tier })

  return (
    <section aria-labelledby={headingId} className="flex scroll-mt-6 flex-col gap-6" id={LICENSE_OFFER_ID}>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-title text-balance text-foreground" id={headingId}>
          {t("title")}
        </h2>
        <p className="max-w-[64ch] text-body-sm text-pretty text-muted-foreground">{t("description")}</p>
      </div>
      {chosenTier === undefined && <Tiers />}
      {chosenTier === undefined && <CheckoutNotice />}
      {chosenTier !== undefined && <ComparedTiers />}
      <CourseUnlocks />
    </section>
  )
}
