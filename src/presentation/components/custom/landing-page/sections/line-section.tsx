import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"
import { ConceptLoop } from "~/src/presentation/components/custom/landing-page/components/concept-loop"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

const STATIONS = [
  { id: "auth", loop: "cost-curve", offsetSeconds: 0 },
  { id: "tests", loop: "merge-gate", offsetSeconds: 2 },
  { id: "i18n", loop: "locale-format", offsetSeconds: 4 },
  { id: "edge", loop: "scaffold-cli", offsetSeconds: 6 },
] as const

const GRID_DELAY_MS = 100

const STATION_IMAGE_SIZES =
  "(min-width: 80rem) calc((80rem - 5rem - 3px) / 2 - 5rem), (min-width: 64rem) calc((100vw - 5rem - 3px) / 2 - 5rem), (min-width: 48rem) calc(100vw - 10rem - 2px), calc(100vw - 6.5rem - 2px)"

export const LineSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.line")

  return (
    <section className="relative border-t border-border" id={MARKETING_SECTION_IDS.FOUNDATION}>
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[16ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("description")}</p>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={GRID_DELAY_MS}>
          <HighlightGroup
            className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-2"
            name="line-station-highlight"
          >
            {STATIONS.map(({ id, loop, offsetSeconds }) => (
              <HighlightItem className="group bg-background" contentClassName="flex h-full flex-col p-7 md:p-10" id={id} key={id}>
                <h3 className="text-headline-support text-balance text-foreground">{t(`stations.${id}.title`)}</h3>
                <p className="mt-4 max-w-[44ch] text-body text-pretty text-muted-foreground transition-colors duration-400 ease-exp group-hover:text-foreground">
                  {t(`stations.${id}.body`)}
                </p>
                <p className="mt-auto flex items-center gap-2.5 pt-8">
                  <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
                  <span className="font-mono text-spec text-foreground">{t(`stations.${id}.spec`)}</span>
                </p>
                <ConceptLoop className="mt-7 max-sm:hidden md:mt-9" name={loop} offsetSeconds={offsetSeconds} sizes={STATION_IMAGE_SIZES} />
              </HighlightItem>
            ))}
          </HighlightGroup>
        </Reveal>
      </div>
    </section>
  )
}
