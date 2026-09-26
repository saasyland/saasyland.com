import type { JSX, ReactNode } from "react"

import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { CliConfigurator } from "~/src/presentation/components/custom/landing-page/components/cli-configurator"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

const FRAME_DELAY_MS = 100

const REUSE_TAGS = { accent: (chunks: ReactNode) => <strong className="font-medium text-foreground">{chunks}</strong> }

export const CliSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.cli")

  return (
    <section className="relative border-t border-border" id={MARKETING_SECTION_IDS.CLI}>
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[18ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("lead")}</p>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={FRAME_DELAY_MS}>
          <CliConfigurator />
        </Reveal>

        <Reveal className="mt-14 md:mt-16" delay={FRAME_DELAY_MS} variant="quiet">
          <h3 className="max-w-[34ch] text-headline-support text-balance text-foreground">{t("reuse.title")}</h3>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t.rich("reuse.body", REUSE_TAGS)}</p>
        </Reveal>
      </div>
    </section>
  )
}
