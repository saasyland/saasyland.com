import type { JSX, ReactNode } from "react"

import { useQuery } from "@tanstack/react-query"
import { VideoPlayer as Player } from "@videojs/react/video"

import type { Course } from "~/src/modules/course/course.types"
import { isPlayable } from "~/src/modules/course/course.utils"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

interface LessonMediaProps {
  readonly children: ReactNode
  readonly courseSlug: string
  readonly lesson: Course["pageLesson"]
}

export const LessonMedia = ({ children, courseSlug, lesson }: LessonMediaProps): JSX.Element => {
  const { data } = useQuery({ ...lessonPlaybackQuery({ courseSlug, lessonSlug: lesson.slug }), enabled: isPlayable(lesson) })

  return (
    <Player poster={data?.poster} title={lesson.title}>
      {children}
    </Player>
  )
}
