import { type JSX, useId } from "react"

import { useTranslations } from "use-intl/react"

import { MotionProvider } from "~/src/providers/motion-provider"

import { CheckoutAgreement, CheckoutButton } from "~/src/presentation/components/custom/app/checkout"
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

export const LicenseOffer = (): JSX.Element => {
  const t = useTranslations("pages.license.buy")
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-title text-balance text-foreground" id={headingId}>
          {t("title")}
        </h2>
        <p className="max-w-[64ch] text-body-sm text-pretty text-muted-foreground">{t("description")}</p>
      </div>
      <MotionProvider>
        <PricingTiers Action={TierCheckoutButton} />
      </MotionProvider>
      <CheckoutAgreement />
      <CourseUnlocks />
    </section>
  )
}
