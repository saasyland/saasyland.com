import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { Check, Lock, Play } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { formatClock } from "~/src/lib/duration"

const LESSON_NUMBER_BASE = 1
const LESSON_NUMBER_PAD = 2

type Lesson = Course["pageLesson"]

const LessonState = ({ lesson }: { readonly lesson: Lesson }): JSX.Element => {
  const t = useTranslations("pages.courses")

  if (lesson.completed) {
    return (
      <>
        <Check aria-hidden className="size-3.5 shrink-0 text-ring" strokeWidth={2.5} />
        <span className="sr-only">{t("lesson.completed")}</span>
      </>
    )
  }

  if (lesson.locked) {
    return (
      <>
        <Lock aria-hidden className="size-3 shrink-0 text-muted-foreground/60" strokeWidth={2.25} />
        <span className="sr-only">{t(`access.${lesson.access}`)}</span>
      </>
    )
  }

  return <Play aria-hidden className="size-3 shrink-0 fill-current text-ring" strokeWidth={0} />
}

interface CurriculumProps {
  readonly chapters: Course["page"]["chapters"]
  readonly courseSlug: string
}

export const Curriculum = ({ chapters, courseSlug }: CurriculumProps): JSX.Element => {
  const t = useTranslations("pages.courses")
  const numbers = new Map(chapters.flatMap(({ lessons }) => lessons).map((lesson, index) => [lesson.id, index + LESSON_NUMBER_BASE]))

  return (
    <ol className="flex flex-col gap-10">
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <h3 className="font-mono text-label text-muted-foreground uppercase">{chapter.title}</h3>
          <ol className="mt-3 border-t border-border">
            {chapter.lessons.map((lesson) => (
              <li className="border-b border-border" key={lesson.id}>
                <Link
                  activeOptions={{ exact: true }}
                  className="group flex items-baseline gap-4 rounded-sm py-3.5 transition-colors duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[status=active]:text-foreground"
                  params={{ course: courseSlug, lesson: lesson.slug }}
                  to="/courses/$course/$lesson"
                >
                  <span aria-hidden className="font-mono text-spec text-muted-foreground tabular-nums">
                    {String(numbers.get(lesson.id)).padStart(LESSON_NUMBER_PAD, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-body-sm text-pretty text-muted-foreground transition-colors group-hover:text-foreground group-data-[status=active]:font-medium group-data-[status=active]:text-foreground">
                    {lesson.title}
                    {lesson.access === LESSON_ACCESS.PREVIEW && (
                      <span className="ml-2 rounded-xs border border-ring/30 bg-ring/10 px-1.5 py-0.5 align-middle font-mono text-[10px] text-ring uppercase">
                        {t("access.preview")}
                      </span>
                    )}
                  </span>
                  {lesson.durationMs !== null && (
                    <span className="font-mono text-spec text-muted-foreground tabular-nums">{formatClock(lesson.durationMs)}</span>
                  )}
                  <LessonState lesson={lesson} />
                </Link>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  )
}
