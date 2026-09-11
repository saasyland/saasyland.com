import type { JSX, ReactNode } from "react"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Accent } from "~/src/presentation/components/custom/landing-page/components/accent"
import { ConceptLoop } from "~/src/presentation/components/custom/landing-page/components/concept-loop"
import { InstallCommand } from "~/src/presentation/components/custom/landing-page/components/install-command"

import { ROUTES } from "~/src/routes"

const HERO_TAGS = {
  accent: (chunks: ReactNode) => <Accent id="hero">{chunks}</Accent>,
  strong: (chunks: ReactNode) => <strong className="font-medium text-foreground">{chunks}</strong>,
}

const HERO_IMAGE_SIZES =
  "(min-width: 80rem) calc(80rem - 5rem - 2px), (min-width: 48rem) calc(100vw - 5rem - 2px), (min-width: 40rem) calc((100vw - 3rem - 2px) * 1.35), calc((100vw - 3rem - 2px) * 1.9)"

export const HeroSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.hero")

  return (
    <section className="relative overflow-hidden" id="floor">
      <div aria-hidden className="field-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="field-signal pointer-events-none absolute inset-0" />

      <div className="relative mx-auto w-full max-w-7xl px-6 pt-32 pb-16 md:px-10 md:pt-40 md:pb-20">
        <h1 className="max-w-[11.6em] text-display-hero text-foreground sm:motion-safe:animate-rise">{t.rich("title", HERO_TAGS)}</h1>

        <p className="mt-6 max-w-2xl text-lead text-pretty text-muted-foreground sm:[--rise-delay:100ms] sm:motion-safe:animate-rise">
          {t.rich("description", HERO_TAGS)}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-4 sm:[--rise-delay:200ms] sm:motion-safe:animate-rise">
          <a
            className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-body-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 ease-exp hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"
            href={ROUTES.HOME_PRICING_SECTION}
          >
            {t("ctaPrimary")}
          </a>
          <a
            className="group inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-card/60 px-5 text-body-sm font-medium text-foreground transition-[background-color,border-color,transform] duration-200 ease-exp hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"
            href={ROUTES.HOME_FOUNDATION_SECTION}
          >
            {t("ctaSecondary")}
            <ArrowRight
              aria-hidden
              className="size-3.5 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </a>
        </div>

        <div className="mt-16 overflow-hidden rounded-xl border border-border bg-card sm:[--rise-delay:300ms] sm:[--rise-distance:1rem] sm:[--rise-duration:1000ms] sm:motion-safe:animate-rise md:mt-20">
          <InstallCommand copiedLabel={t("surface.copied")} copyLabel={t("surface.copy")} runnerLabel={t("surface.runner")} />
          <ConceptLoop
            className="w-[190%] max-w-none border-t border-border sm:w-[135%] md:w-full"
            label={t("surface.imageAlt")}
            name="app-tour"
            preloadMedia="(min-width: 48rem)"
            sizes={HERO_IMAGE_SIZES}
          />
        </div>
      </div>
    </section>
  )
}
