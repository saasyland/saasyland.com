import { type JSX, useEffect, useRef } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useActiveTextCues, useCreateTextTrack, useTextCues } from "@videojs/react"
import { usePlayer } from "@videojs/react/video"
import { Button } from "react-aria-components"
import { useLocale, useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"
import type { Video } from "~/src/modules/video/video.types"

import { cn } from "~/src/lib/cn"
import { MILLISECONDS_PER_SECOND, formatClock } from "~/src/lib/duration"

const TRANSCRIPT_TRACK = { kind: "metadata", label: "transcript" } as const

const FOLLOW_OFFSET_RATIO = 3

type Caption = Video["playback"]["captions"][number]

const TranscriptCues = ({ caption }: { readonly caption: Caption }): JSX.Element | undefined => {
  const t = useTranslations("pages.courses.lesson")
  const player = usePlayer()
  const list = useRef<HTMLOListElement>(null)

  useCreateTextTrack({ ...TRANSCRIPT_TRACK, language: caption.locale, src: caption.src })
  const cues = useTextCues(TRANSCRIPT_TRACK)
  const [active] = useActiveTextCues(TRANSCRIPT_TRACK)

  useEffect(() => {
    const item = list.current?.querySelector<HTMLElement>("[aria-current=true]")
    if (list.current && item) {
      list.current.scrollTop = item.offsetTop - list.current.clientHeight / FOLLOW_OFFSET_RATIO
    }
  }, [active?.id])

  if (cues.length === 0) {
    return undefined
  }

  return (
    <section aria-labelledby="lesson-transcript" className="mt-10">
      <h2 className="text-title text-foreground" id="lesson-transcript">
        {t("transcript")}
      </h2>
      <ol
        ref={list}
        className="relative mt-4 max-h-96 overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-2"
        lang={caption.locale}
      >
        {cues.map((cue) => (
          <li key={cue.id}>
            <Button
              aria-current={cue.id === active?.id}
              className={cn(
                "flex w-full items-baseline gap-4 rounded-md px-3 py-2 text-left text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:bg-muted hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-ring",
                { "bg-ring/10 text-foreground": cue.id === active?.id },
              )}
              onPress={() => {
                void player.seek(cue.startTime)
              }}
            >
              <span className="w-12 shrink-0 text-spec tabular-nums">{formatClock(cue.startTime * MILLISECONDS_PER_SECOND)}</span>{" "}
              <span className="min-w-0 flex-1 text-pretty">{cue.text}</span>
            </Button>
          </li>
        ))}
      </ol>
    </section>
  )
}

interface LessonTranscriptProps {
  readonly courseSlug: string
  readonly lessonSlug: string
}

export const LessonTranscript = ({ courseSlug, lessonSlug }: LessonTranscriptProps): JSX.Element | undefined => {
  const locale = useLocale()

  const { data } = useSuspenseQuery(lessonPlaybackQuery({ courseSlug, lessonSlug }))

  const { captions } = data
  const caption =
    captions.find((entry) => entry.locale === locale) ?? captions.find((entry) => entry.locale === I18N.DEFAULT_LOCALE) ?? captions[0]

  if (caption === undefined) {
    return undefined
  }

  return <TranscriptCues caption={caption} key={caption.src} />
}
