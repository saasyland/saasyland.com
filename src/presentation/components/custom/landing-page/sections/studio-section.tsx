import type { JSX } from "react"

import { Lock, Play } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"

import { ConceptLoop } from "~/src/presentation/components/custom/landing-page/components/concept-loop"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

const LESSONS = ["l1", "l2", "l3", "l4", "l5", "l6"] as const
const TRACKS = ["walkthrough", "build"] as const

const PREVIEW_TRACK = "walkthrough"

const LESSON_NUMBER_BASE = 1
const LESSON_NUMBER_PAD = 2

const SECOND_CARD_DELAY_MS = 100

const BUILDER_IMAGE_SIZES =
  "(min-width: 80rem) calc((80rem - 5rem - 2px) * 1.35 / 2.35 - 4.5rem - 3px), (min-width: 64rem) calc((100vw - 5rem - 2px) * 1.35 / 2.35 - 4.5rem - 3px), (min-width: 48rem) calc(100vw - 9.5rem - 4px), calc(100vw - 6.5rem - 4px)"

interface LessonRowProps {
  readonly index: number
  readonly lesson: (typeof LESSONS)[number]
  readonly track: (typeof TRACKS)[number]
}

const LessonRow = ({ index, lesson, track }: LessonRowProps): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")
  const isPreview = track === PREVIEW_TRACK && index === 0

  return (
    <li className="flex items-baseline gap-4 border-b border-border py-3.5 last:border-b-0">
      <span aria-hidden className="font-mono text-spec text-muted-foreground/60 tabular-nums">
        {String(index + LESSON_NUMBER_BASE).padStart(LESSON_NUMBER_PAD, "0")}
      </span>
      <span
        className={cn("min-w-0 flex-1 text-body-sm text-pretty", { "text-foreground": isPreview, "text-muted-foreground": !isPreview })}
      >
        {t(`tracks.${track}.lessons.${lesson}`)}
      </span>
      {isPreview && <Play aria-hidden className="size-3 shrink-0 translate-y-0.5 fill-current text-ring" strokeWidth={0} />}
      {!isPreview && (
        <Lock aria-hidden className="size-3 shrink-0 translate-y-0.5 text-muted-foreground/45" strokeWidth={2.25}>
          <title>{t("lockedLabel")}</title>
        </Lock>
      )}
    </li>
  )
}

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
          <article className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="p-7 md:p-9">
              <h3 className="text-headline-support text-balance text-foreground">{t("masterclass.title")}</h3>
              <p className="mt-3 max-w-[68ch] text-body text-pretty text-muted-foreground">{t("masterclass.body")}</p>
            </div>

            <div className="border-y border-border bg-background px-7 py-8 md:px-9 md:py-10">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
                <div className="flex aspect-video w-full shrink-0 items-center justify-center rounded-lg border border-border bg-card md:w-80">
                  <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-ring/40 bg-ring/10">
                    <Play className="size-4 translate-x-px fill-current text-ring" strokeWidth={0} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2.5">
                    <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
                    <span className="font-mono text-label text-ring uppercase">{t("masterclass.previewLabel")}</span>
                  </p>
                  <p className="mt-3 text-title text-balance text-foreground">{t("masterclass.previewTitle")}</p>
                  <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground">{t("masterclass.previewNote")}</p>
                </div>
              </div>
            </div>

            <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
              {TRACKS.map((track) => (
                <div className="p-7 md:p-9" key={track}>
                  <p className="font-mono text-label text-muted-foreground uppercase">{t(`masterclass.tracks.${track}.label`)}</p>
                  <p className="mt-2 max-w-[42ch] text-body-sm text-pretty text-muted-foreground/80">
                    {t(`masterclass.tracks.${track}.note`)}
                  </p>
                  <ul className="mt-5 border-t border-border">
                    {LESSONS.map((lesson, index) => (
                      <LessonRow index={index} key={lesson} lesson={lesson} track={track} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  )
}
