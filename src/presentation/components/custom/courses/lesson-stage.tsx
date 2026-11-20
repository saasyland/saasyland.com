import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { isPlayable } from "~/src/modules/course/course.utils"

import { RecordingNow } from "~/src/presentation/components/custom/courses/course-card"
import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"
import { LessonPlayer } from "~/src/presentation/components/custom/courses/lesson-player"
import { LockedLesson } from "~/src/presentation/components/custom/courses/locked-lesson"

const BACKDROP_SIZES = "(min-width: 64rem) 30vw, 60vw"

interface LessonStageProps {
  readonly course: Course["page"]["course"]
  readonly lesson: Course["pageLesson"]
  readonly number: number
  readonly viewer: Course["page"]["viewer"]
}

export const LessonStage = ({ course, lesson, number, viewer }: LessonStageProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  if (isPlayable(lesson)) {
    return <LessonPlayer courseSlug={course.slug} lesson={lesson} signedIn={viewer.signedIn} />
  }

  return (
    <div className="relative isolate flex min-h-72 w-full items-center justify-center overflow-clip rounded-lg border border-border bg-background py-10 sm:aspect-video sm:min-h-auto">
      <CourseCover
        className="absolute inset-0 -z-20 size-full scale-110 opacity-40 blur-md"
        course={course}
        isDecorative
        sizes={BACKDROP_SIZES}
      />
      <span aria-hidden className="absolute inset-0 -z-10 bg-radial from-background/50 to-background/95 to-75%" />
      {lesson.recording && (
        <div className="flex flex-col items-center px-6 text-center">
          <p className="font-mono text-spec text-muted-foreground">{t("number", { number })}</p>
          <RecordingNow className="mt-4 text-title" />
          <p className="mt-3 max-w-[40ch] text-body text-balance text-muted-foreground">{t("noVideo")}</p>
        </div>
      )}
      {!lesson.recording && <LockedLesson access={lesson.access} mustConfirmEmail={viewer.mustConfirmEmail} signedIn={viewer.signedIn} />}
    </div>
  )
}
