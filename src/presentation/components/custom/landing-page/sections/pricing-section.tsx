import type { JSX, ReactNode } from "react"

import { Link, useRouter } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

import { CORE_PRICE_IN_HOURS, TIER_SUPPORT_VALUES } from "~/src/data/license"
import { CONSULTING_HOURLY_RATE, ILLUSTRATIVE_HOURLY_RATE } from "~/src/data/marketing"
import { MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"
import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"
import { PRICE_TAGS, PricingTiers, type TierAction, TierStructuredData } from "~/src/presentation/components/custom/pricing"

import { APP_GITHUB_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const GRID_DELAY_MS = 100

const CONSULTING_HREF = `mailto:${CONTACT_EMAIL}?subject=Architecture%20call`

const FREE_PRICE = 0

const SECONDARY_ACTION_CLASSES =
  "inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-body-sm font-semibold whitespace-nowrap text-foreground transition-[background-color,border-color,transform] duration-200 ease-exp hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"

const TierSignUpLink: TierAction = ({ featured, tier }) => {
  const t = useTranslations("components.custom.pricing")
  const router = useRouter()

  const { publicHref: redirect } = router.buildLocation({ search: { tier }, to: ROUTES.APP.INDEX })

  return (
    <Link
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-body-sm font-semibold transition-[background-color,border-color,transform] duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px",
        {
          "bg-primary text-primary-foreground hover:bg-primary/88": featured,
          "border border-border text-foreground hover:bg-muted": !featured,
        },
      )}
      search={{ redirect }}
      to={ROUTES.AUTH.SIGN_UP}
    >
      {t(`tiers.${tier}.cta`)}
    </Link>
  )
}

interface OtherOptionProps {
  readonly action: ReactNode
  readonly body: ReactNode
  readonly figure: string
  readonly label: string
  readonly period: string
  readonly title: string
}

const OtherOption = ({ action, body, figure, label, period, title }: OtherOptionProps): JSX.Element => (
  <li className="flex flex-col rounded-lg border border-dashed border-border p-6 md:p-7">
    <p className="text-label text-muted-foreground uppercase">{label}</p>
    <h4 className="mt-3 text-title text-balance text-foreground">{title}</h4>
    <p className="mt-2 text-body-sm text-pretty text-muted-foreground">{body}</p>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pt-6">
      <p className="flex items-baseline gap-x-2">
        <span className="text-headline-support text-foreground tabular-nums">{figure}</span>{" "}
        <span className="text-spec text-muted-foreground">{period}</span>
      </p>
      {action}
    </div>
  </li>
)

const OtherOptions = (): JSX.Element => {
  const t = useTranslations("pages.landing.pricing")
  const format = useFormatter()

  return (
    <div>
      <h3 className="text-label text-muted-foreground uppercase">{t("otherOptions")}</h3>
      <ul className="mt-5 grid gap-5 md:grid-cols-2">
        <OtherOption
          action={
            <a className={SECONDARY_ACTION_CLASSES} href={APP_GITHUB_URL} rel="noopener noreferrer" target="_blank">
              {t("repository-facts.free.cta")}
            </a>
          }
          body={t("repository-facts.free.body", REPOSITORY_FACTS)}
          figure={format.number(FREE_PRICE, CURRENCY_FORMAT)}
          label={t("repository-facts.free.label")}
          period={t("repository-facts.free.period")}
          title={t("repository-facts.free.title")}
        />
        <OtherOption
          action={
            <a className={SECONDARY_ACTION_CLASSES} href={CONSULTING_HREF}>
              {t("license.consulting.cta")}
            </a>
          }
          body={t("license.consulting.body", TIER_SUPPORT_VALUES)}
          figure={format.number(CONSULTING_HOURLY_RATE, CURRENCY_FORMAT)}
          label={t("license.consulting.label")}
          period={t("license.consulting.period")}
          title={t("license.consulting.title")}
        />
      </ul>
    </div>
  )
}

export const PricingSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.pricing")
  const format = useFormatter()

  return (
    <section className="relative border-t border-border" id={MARKETING_SECTION_IDS.PRICING}>
      <TierStructuredData />
      <div className="mx-auto w-full max-w-site px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <div className="grid gap-x-16 gap-y-5 md:grid-cols-[1.1fr_1fr] md:items-end">
            <h2 className="max-w-[12ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
            <div>
              <p className="text-lead text-pretty text-muted-foreground">{t("description")}</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={GRID_DELAY_MS}>
          <PricingTiers Action={TierSignUpLink} />

          <p className="mt-8 flex max-w-3xl items-start gap-3">
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
            <span className="text-body-sm text-pretty text-muted-foreground">{t("repository-facts.assurance", REPOSITORY_FACTS)}</span>
          </p>
        </Reveal>

        <Reveal className="mt-12 md:mt-14" delay={GRID_DELAY_MS} variant="quiet">
          <OtherOptions />
        </Reveal>

        <Reveal className="mt-20 border-t border-border pt-14 md:mt-28 md:pt-16" delay={GRID_DELAY_MS}>
          <div className="grid gap-x-16 gap-y-6 md:grid-cols-[1fr_1fr] md:items-start">
            <p className="text-display-blast text-balance text-foreground">{t("ledger.lead")}</p>
            <p className="text-body text-pretty text-muted-foreground">
              {t.rich("ledger.body", {
                ...PRICE_TAGS,
                ...REPOSITORY_FACTS,
                coreHours: CORE_PRICE_IN_HOURS,
                hourlyRate: format.number(ILLUSTRATIVE_HOURLY_RATE, CURRENCY_FORMAT),
              })}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
