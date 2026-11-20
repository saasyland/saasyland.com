import { type JSX, useMemo } from "react"

import { useContainer, useCreateTextTrack } from "@videojs/react"
import { usePlayer } from "@videojs/react/video"
import { Play } from "lucide-react"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import type { Lesson } from "~/src/modules/lesson/lesson.types"

import { cn } from "~/src/lib/cn"
import { MILLISECONDS_PER_SECOND, formatClock } from "~/src/lib/duration"

type KeyMoment = Lesson["detail"]["keyMoments"][number]

const MOMENT_CLASSNAME = "flex w-full items-baseline gap-4 rounded-md px-3 py-2.5 text-left text-body-sm"

const MomentTime = ({ seconds }: { readonly seconds: number }): JSX.Element => (
  <span className="w-12 shrink-0 font-mono text-spec text-ring tabular-nums">{formatClock(seconds * MILLISECONDS_PER_SECOND)}</span>
)

const SeekableMoments = ({ moments }: { readonly moments: readonly KeyMoment[] }): JSX.Element => {
  const player = usePlayer()
  const container = useContainer()
  const cues = useMemo(() => moments.map(({ label, seconds }) => ({ startTime: seconds, text: label })), [moments])

  useCreateTextTrack({ cues, kind: "chapters" })

  const seek = (seconds: number): void => {
    container?.scrollIntoView({ block: "nearest" })
    void player.seek(seconds).then(() => player.play())
  }

  return (
    <ol className="mt-4 flex flex-col">
      {moments.map((moment) => (
        <li key={moment.seconds}>
          <Button
            className={cn(
              "group transition-colors duration-200 ease-exp hover:bg-card data-focus-visible:outline-2 data-focus-visible:outline-ring",
              MOMENT_CLASSNAME,
            )}
            onPress={() => {
              seek(moment.seconds)
            }}
          >
            <MomentTime seconds={moment.seconds} /> <span className="min-w-0 flex-1 text-pretty text-foreground">{moment.label}</span>
            <Play
              aria-hidden
              className="size-3 shrink-0 self-center fill-current text-muted-foreground group-hover:text-ring"
              strokeWidth={0}
            />
          </Button>
        </li>
      ))}
    </ol>
  )
}

interface KeyMomentsProps {
  readonly moments: readonly KeyMoment[]
  readonly playable: boolean
}

export const KeyMoments = ({ moments, playable }: KeyMomentsProps): JSX.Element | undefined => {
  const t = useTranslations("pages.courses.lesson")

  if (moments.length === 0) {
    return undefined
  }

  return (
    <section aria-labelledby="lesson-key-moments" className="mt-10">
      <h2 className="text-title text-foreground" id="lesson-key-moments">
        {t("keyMoments")}
      </h2>
      {playable && <SeekableMoments moments={moments} />}
      {!playable && (
        <ol className="mt-4 flex flex-col">
          {moments.map((moment) => (
            <li className={MOMENT_CLASSNAME} key={moment.seconds}>
              <MomentTime seconds={moment.seconds} />{" "}
              <span className="min-w-0 flex-1 text-pretty text-muted-foreground">{moment.label}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
