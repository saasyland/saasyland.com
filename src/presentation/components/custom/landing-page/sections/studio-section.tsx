import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { ConceptLoop } from "~/src/presentation/components/custom/landing-page/components/concept-loop"
import { CourseShowcase } from "~/src/presentation/components/custom/landing-page/components/course-showcase"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

const SECOND_CARD_DELAY_MS = 100

const BUILDER_IMAGE_SIZES =
  "(min-width: 80rem) calc((80rem - 5rem - 2px) * 1.35 / 2.35 - 4.5rem - 3px), (min-width: 64rem) calc((100vw - 5rem - 2px) * 1.35 / 2.35 - 4.5rem - 3px), (min-width: 48rem) calc(100vw - 9.5rem - 4px), calc(100vw - 6.5rem - 4px)"

export const StudioSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio")

  return (
    <section className="relative border-t border-border" id={MARKETING_SECTION_IDS.TOOLKIT}>
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[18ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("description")}</p>
        </Reveal>

        <Reveal className="mt-14 md:mt-20">
          <article className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[1.35fr_1fr] lg:divide-x lg:divide-border">
            <div className="flex items-center border-b border-border p-7 md:p-9 lg:border-b-0">
              <ConceptLoop
                className="overflow-hidden rounded-lg border border-border"
                label={t("builder.imageAlt")}
                name="page-designer"
                sizes={BUILDER_IMAGE_SIZES}
              />
            </div>
            <div className="flex flex-col justify-center p-7 md:p-9">
              <h3 className="text-headline-support text-balance text-foreground">{t("builder.title")}</h3>
              <p className="mt-3 max-w-[52ch] text-body text-pretty text-muted-foreground">{t("builder.body")}</p>
              <p className="mt-7 flex items-center gap-2.5">
                <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
                <span className="font-mono text-spec text-foreground">{t("builder.spec")}</span>
              </p>
            </div>
          </article>
        </Reveal>

        <Reveal className="mt-6" delay={SECOND_CARD_DELAY_MS}>
          <CourseShowcase />
        </Reveal>
      </div>
    </section>
  )
}
