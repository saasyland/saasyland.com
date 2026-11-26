import { type JSX, Suspense } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"

import type { Course } from "~/src/modules/course/course.types"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { useLessonProgress } from "~/src/hooks/use-lesson-progress"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

import { PlayerPending } from "~/src/presentation/components/custom/courses/player-pending"
import { VideoPlayer } from "~/src/presentation/components/custom/video-player"

const PLAYER_SIZES = "(min-width: 80rem) 52rem, (min-width: 64rem) calc(100vw - 30rem), calc(100vw - 3rem)"

interface LessonPlayerProps {
  readonly courseSlug: string
  readonly lesson: Course["pageLesson"]
  readonly signedIn: boolean
}

const PlaybackPlayer = ({ courseSlug, lesson, signedIn }: LessonPlayerProps): JSX.Element => {
  const { data } = useSuspenseQuery(lessonPlaybackQuery({ courseSlug, lessonSlug: lesson.slug }))

  const { complete, pause, save } = useLessonProgress({ enabled: signedIn, lessonId: lesson.id })

  return (
    <VideoPlayer
      onEnded={complete}
      onPause={pause}
      onProgress={save}
      playback={data}
      sizes={PLAYER_SIZES}
      startAt={lesson.positionMs / MILLISECONDS_PER_SECOND}
    />
  )
}

export const LessonPlayer = (props: LessonPlayerProps): JSX.Element => (
  <Suspense fallback={<PlayerPending />}>
    <PlaybackPlayer {...props} />
  </Suspense>
)
