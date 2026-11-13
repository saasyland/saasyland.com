import { type JSX, Suspense, lazy } from "react"

import { useQuery } from "@tanstack/react-query"

import type { Course } from "~/src/modules/course/course.types"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { useLessonProgress } from "~/src/hooks/use-lesson-progress"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const VideoPlayer = lazy(() =>
  import("~/src/presentation/components/custom/video-player").then((module) => ({ default: module.VideoPlayer })),
)

const PLAYER_SIZES = "(min-width: 80rem) 52rem, (min-width: 64rem) calc(100vw - 30rem), calc(100vw - 3rem)"
const MILLISECONDS_PER_SECOND = 1000

export const PlayerPending = (): JSX.Element => <Skeleton className="aspect-video w-full rounded-lg" />

interface LessonPlayerProps {
  readonly courseSlug: string
  readonly lesson: Course["pageLesson"]
  readonly signedIn: boolean
}

export const LessonPlayer = ({ courseSlug, lesson, signedIn }: LessonPlayerProps): JSX.Element => {
  const { data } = useQuery(lessonPlaybackQuery({ courseSlug, lessonSlug: lesson.slug }))
  const { complete, save } = useLessonProgress({ enabled: signedIn, lessonId: lesson.id })

  if (data === undefined) {
    return <PlayerPending />
  }

  return (
    <Suspense fallback={<PlayerPending />}>
      <VideoPlayer
        onEnded={complete}
        onProgress={save}
        playback={data}
        sizes={PLAYER_SIZES}
        startAt={lesson.positionMs / MILLISECONDS_PER_SECOND}
        title={lesson.title}
      />
    </Suspense>
  )
}
