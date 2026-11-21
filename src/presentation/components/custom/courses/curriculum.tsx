import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { Check, Lock, Play } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { isPlayable } from "~/src/modules/course/course.utils"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { cn } from "~/src/lib/cn"
import { wholeMinutes } from "~/src/lib/duration"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/presentation/components/shadcn/accordion"

import { LessonMeta } from "~/src/presentation/components/custom/courses/lesson-meta"

const NUMBER_BASE = 1
const NUMBER_PAD = 2

const COMPACT_COLUMNS = "grid-cols-[1rem_minmax(0,1fr)_auto]"

const FULL_COLUMNS = "grid-cols-[1rem_1.25rem_minmax(0,1fr)_auto]"

const LEAD_COLUMN = "col-[1/-3]"

const TITLE_COLUMN = "col-[-3/-2]"

const END_COLUMN = "col-[-2/-1]"

const FIRST_LINE = "flex h-lh items-center"

type Lesson = Course["pageLesson"]

type Chapter = Course["page"]["chapters"][number]

const padNumber = (value: number | undefined): string => String(value).padStart(NUMBER_PAD, "0")

const outline = (compact: boolean): string => cn("grid gap-x-3", { [COMPACT_COLUMNS]: compact, [FULL_COLUMNS]: !compact })

const LessonIcon = ({ lesson }: { readonly lesson: Lesson }): JSX.Element => {
  if (lesson.completed) {
    return <Check aria-hidden className="size-3.5 text-ring" strokeWidth={2.5} />
  }

  if (isPlayable(lesson)) {
    return <Play aria-hidden className="size-3 fill-current text-ring" strokeWidth={0} />
  }

  return <Play aria-hidden className="size-3 text-muted-foreground" data-slot="lesson-recording" strokeWidth={2} />
}

const LessonLock = ({ lesson }: { readonly lesson: Lesson }): JSX.Element => {
  const t = useTranslations("pages.courses")

  if (lesson.completed) {
    return <span className="sr-only">{t("lesson.completed")}</span>
  }

  if (!lesson.locked) {
    return <span aria-hidden className="w-3" />
  }

  return <Lock aria-hidden className="size-3 text-muted-foreground" strokeWidth={2.25} />
}

interface LessonListProps {
  readonly compact: boolean
  readonly courseSlug: string
  readonly lessons: readonly Lesson[]
  readonly numbers: ReadonlyMap<string, number>
}

const LessonList = ({ compact, courseSlug, lessons, numbers }: LessonListProps): JSX.Element => (
  <ol className="flex flex-col">
    {lessons.map((lesson) => (
      <li className="border-t border-border first:border-t-0" key={lesson.id}>
        <Link
          activeOptions={{ exact: true }}
          className={cn(
            outline(compact),
            "group items-start rounded-md px-3 text-body-sm no-underline transition-colors duration-200 ease-exp hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[status=active]:bg-ring/10",
            { "py-2.5": compact, "py-3.5": !compact },
          )}
          params={{ course: courseSlug, lesson: lesson.slug }}
          to="/courses/$course/$lesson"
        >
          <span className={cn(FIRST_LINE, "justify-center")} data-slot="lesson-icon">
            <LessonIcon lesson={lesson} />
          </span>
          {!compact && (
            <span aria-hidden className={FIRST_LINE} data-slot="lesson-number">
              <span className="font-mono text-spec text-muted-foreground tabular-nums">{padNumber(numbers.get(lesson.id))}</span>
            </span>
          )}
          <span
            className={cn(
              TITLE_COLUMN,
              "text-pretty text-foreground transition-colors group-data-[status=active]:font-medium group-data-[status=active]:text-ring",
              { "font-medium": !compact },
            )}
            data-slot="lesson-title"
          >
            {lesson.title}
          </span>
          <span className={cn(END_COLUMN, FIRST_LINE, "justify-end")} data-slot="lesson-lock">
            <LessonLock lesson={lesson} />
          </span>
          <LessonMeta className={cn(TITLE_COLUMN, "mt-1")} compact={compact} lesson={lesson} />
        </Link>
      </li>
    ))}
  </ol>
)

const ChapterSummary = ({ chapter }: { readonly chapter: Chapter }): JSX.Element => {
  const t = useTranslations("pages.courses")

  const recorded = chapter.lessons.filter((lesson) => !lesson.recording)
  const previews = chapter.lessons.filter((lesson) => lesson.access === LESSON_ACCESS.PREVIEW).length
  const durationMs = chapter.lessons.reduce((total, lesson) => total + (lesson.durationMs ?? 0), 0)
  const isPartlyRecorded = recorded.length > 0 && recorded.length < chapter.lessons.length

  return (
    <span className={cn(TITLE_COLUMN, "mt-1 flex flex-wrap gap-x-5 gap-y-1 text-spec font-normal whitespace-nowrap text-muted-foreground")}>
      {recorded.length === 0 && <span>{t("catalogue.recordingNow")}</span>}
      {!isPartlyRecorded && <span>{t("catalogue.lessons", { count: chapter.lessons.length })}</span>}
      {isPartlyRecorded && <span>{t("catalogue.recorded", { recorded: recorded.length, total: chapter.lessons.length })}</span>}
      {recorded.length > 0 && <span className="tabular-nums">{t("catalogue.minutes", { minutes: wholeMinutes(durationMs) })}</span>}
      {previews > 0 && <span className="dark:text-ring">{t("catalogue.previews", { count: previews })}</span>}
    </span>
  )
}

interface ChapterHeadingProps {
  readonly chapter: Chapter
  readonly compact: boolean
  readonly number: number
  readonly signedIn: boolean
}

const ChapterHeading = ({ chapter, compact, number, signedIn }: ChapterHeadingProps): JSX.Element => {
  const completed = chapter.lessons.filter((lesson) => lesson.completed).length

  return (
    <AccordionTrigger
      className={cn(
        "rounded-none border-0 bg-muted/60 px-3 text-left hover:bg-muted hover:no-underline focus-visible:ring-0 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-ring **:data-[slot=accordion-trigger-icon]:hidden",
        { "py-3.5": compact, "py-5": !compact },
      )}
    >
      <span className={cn(outline(compact), "min-w-0 flex-1 items-start", { "text-body-sm": compact, "text-title": !compact })}>
        <span aria-hidden className={cn(LEAD_COLUMN, FIRST_LINE)} data-slot="chapter-number">
          <span className="font-mono text-spec font-normal text-muted-foreground tabular-nums">{padNumber(number)}</span>
        </span>
        <span className={cn(TITLE_COLUMN, "text-pretty text-foreground")} data-slot="chapter-title">
          {chapter.title}
        </span>
        <span className={cn(END_COLUMN, FIRST_LINE, "justify-end gap-4")}>
          {signedIn && (
            <span className="font-mono text-spec font-normal text-muted-foreground tabular-nums">
              {completed}/{chapter.lessons.length}
            </span>
          )}
          <span aria-hidden className="relative size-3 shrink-0">
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-muted-foreground transition-colors duration-200 ease-exp group-aria-expanded/accordion-trigger:bg-foreground" />
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-muted-foreground transition-[opacity,transform] duration-300 ease-exp group-aria-expanded/accordion-trigger:scale-y-0 group-aria-expanded/accordion-trigger:opacity-0 motion-reduce:transition-none" />
          </span>
        </span>
        {!compact && <ChapterSummary chapter={chapter} />}
      </span>
    </AccordionTrigger>
  )
}

interface CurriculumProps {
  readonly chapters: Course["page"]["chapters"]
  readonly compact?: boolean
  readonly courseSlug: string
  readonly currentSlug?: string
  readonly signedIn: boolean
}

export const Curriculum = ({ chapters, compact = false, courseSlug, currentSlug, signedIn }: CurriculumProps): JSX.Element => {
  const lessons = chapters.flatMap((chapter) => chapter.lessons)
  const numbers = new Map(lessons.map((lesson, index) => [lesson.id, index + NUMBER_BASE]))
  const current = chapters.find((chapter) => chapter.lessons.some((lesson) => lesson.slug === currentSlug))
  const expanded = chapters
    .filter((chapter, index) => (current === undefined ? index === 0 : chapter === current))
    .map((chapter) => chapter.id)

  if (chapters.length <= 1) {
    return <LessonList compact={compact} courseSlug={courseSlug} lessons={lessons} numbers={numbers} />
  }

  return (
    <Accordion allowsMultipleExpanded className="border-y border-border" defaultExpandedKeys={expanded}>
      {chapters.map((chapter, index) => (
        <AccordionItem className="border-border" id={chapter.id} key={chapter.id}>
          <ChapterHeading chapter={chapter} compact={compact} number={index + NUMBER_BASE} signedIn={signedIn} />
          <AccordionContent className="pb-3 [&_a]:no-underline">
            {!compact && chapter.summary.length > 0 && (
              <div className={cn(outline(compact), "px-3 pt-4 pb-1")}>
                <p className={cn(TITLE_COLUMN, "max-w-[68ch] text-body-sm text-pretty text-muted-foreground")}>{chapter.summary}</p>
              </div>
            )}
            <LessonList compact={compact} courseSlug={courseSlug} lessons={chapter.lessons} numbers={numbers} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
