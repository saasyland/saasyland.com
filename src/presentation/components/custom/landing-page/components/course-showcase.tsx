import { type JSX, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Lock, Play } from "lucide-react"
import { useInView } from "motion/react"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"

import { LANDING_VIDEO_SIZES } from "~/src/data/landing-videos"

import { cn } from "~/src/lib/cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"
import { CourseFacts } from "~/src/presentation/components/custom/courses/course-facts"
import { LessonMeta } from "~/src/presentation/components/custom/courses/lesson-meta"

import courseTourPosterAvif800 from "~/src/presentation/assets/motion/course-tour-800.avif?url"
import courseTourPosterWebp800 from "~/src/presentation/assets/motion/course-tour-800.webp?url"
import courseTourPosterAvif from "~/src/presentation/assets/motion/course-tour.avif?url"
import courseTourVideoMp4 from "~/src/presentation/assets/motion/course-tour.mp4?url"
import courseTourVideoWebm from "~/src/presentation/assets/motion/course-tour.webm?url"
import courseTourPosterWebp from "~/src/presentation/assets/motion/course-tour.webp?url"
import { ROUTES } from "~/src/routes"

const TOUR = LANDING_VIDEO_SIZES["course-tour"]
const TOUR_POSTER_SMALL_WIDTH = 800

const TOUR_SIZES =
  "(min-width: 80rem) calc((80rem - 12.5rem - 2px) * 1.35 / 2.35), (min-width: 64rem) calc((100vw - 12.5rem - 2px) * 1.35 / 2.35), (min-width: 48rem) calc(100vw - 9.5rem - 2px), calc(100vw - 6.5rem - 2px)"

const NEAR_VIEWPORT = "100% 0px 100% 0px"

const LINK_CLASSNAME =
  "rounded-sm transition-colors duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const COURSE_GRID =
  "grid snap-x snap-mandatory auto-cols-[minmax(88%,1fr)] grid-flow-col gap-3 overflow-x-auto overflow-y-hidden [scrollbar-width:none] max-md:-mx-7 max-md:scroll-px-4 max-md:px-4 md:grid-flow-row md:grid-cols-2 md:gap-4 md:overflow-visible"

const COURSE_TILE =
  "group/tile flex min-w-0 snap-start flex-col rounded-lg border border-border bg-background p-4 md:p-6 md:first:col-span-2"

const COURSE_THUMBNAIL = "aspect-video w-24 shrink-0 overflow-hidden rounded-md border border-border md:w-28"

const THUMBNAIL_SIZES = "7rem"

const COURSE_LESSONS = "mt-4 border-t border-border pt-2 md:group-first/tile:columns-2 md:group-first/tile:gap-8"

const COURSE_LESSON = "grid break-inside-avoid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-3 rounded-md py-2 text-body-sm"

const COURSE_HEADER = "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4"

const COURSE_COVER = "row-start-2 lg:row-span-3 lg:row-start-1"

const COURSE_KICKER = "col-span-2 mb-3 font-mono text-label lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:self-end"

const COURSE_TITLE = "col-start-2 row-start-2 text-title lg:mt-1 lg:self-start lg:text-title-lg"

const COURSE_FACTS = "col-span-2 mt-3 lg:col-span-1 lg:col-start-2 lg:row-start-3 lg:mt-0"

const COMING_COLLAPSE = "@container @max-[19rem]:**:data-[slot=lesson-coming]:sr-only"

const COURSE_MORE = "mt-2 h-lh self-start text-body-sm font-medium"

const posterSet = (small: string, large: string): string => `${small} ${String(TOUR_POSTER_SMALL_WIDTH)}w, ${large} ${String(TOUR.width)}w`

const takeOver = (video: HTMLVideoElement): (() => void) => {
  video.focus({ preventScroll: true })

  return () => {
    video.pause()
  }
}

const CourseTour = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass.tour")
  const [isStarted, setIsStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-card">
      {isStarted && (
        <video
          ref={takeOver}
          aria-describedby="course-tour-body"
          aria-label={t("label")}
          autoPlay
          className="absolute inset-0 size-full"
          controls
          height={TOUR.height}
          muted
          onPlaying={() => {
            setIsPlaying(true)
          }}
          playsInline
          width={TOUR.width}
        >
          <source src={courseTourVideoWebm} type="video/webm" />
          <source src={courseTourVideoMp4} type="video/mp4" />
        </video>
      )}
      <picture className={cn("pointer-events-none absolute inset-0", { invisible: isPlaying })}>
        <source sizes={TOUR_SIZES} srcSet={posterSet(courseTourPosterAvif800, courseTourPosterAvif)} type="image/avif" />
        <img
          alt=""
          className="size-full"
          decoding="async"
          height={TOUR.height}
          loading="lazy"
          sizes={TOUR_SIZES}
          src={courseTourPosterWebp}
          srcSet={posterSet(courseTourPosterWebp800, courseTourPosterWebp)}
          width={TOUR.width}
        />
      </picture>
      {!isStarted && (
        <Button
          className="group absolute inset-0 flex cursor-pointer items-center justify-center data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-ring"
          onPress={() => {
            setIsStarted(true)
          }}
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-ring/50 bg-background/72 shadow-[0_8px_24px_-8px_oklch(0_0_0/0.6)] backdrop-blur-sm transition-[scale,background-color] duration-300 ease-exp group-hover:scale-106 group-hover:bg-background/86 motion-reduce:transition-none md:size-16">
            <Play aria-hidden className="size-4 translate-x-0.5 fill-current text-ring md:size-5" strokeWidth={0} />
          </span>
          <span className="sr-only">{t("play")}</span>
        </Button>
      )}
    </div>
  )
}

type ShowcaseLesson = Course["showcase"][number]["lessons"][number]

const LessonIcon = ({ lesson }: { readonly lesson: ShowcaseLesson }): JSX.Element => {
  if (lesson.locked) {
    return <Lock aria-hidden className="size-3 text-muted-foreground" strokeWidth={2.25} />
  }

  if (lesson.recording) {
    return <Play aria-hidden className="size-3 text-muted-foreground" strokeWidth={2} />
  }

  return <Play aria-hidden className="size-3 fill-current text-ring" strokeWidth={0} />
}

const LessonState = ({ lesson }: { readonly lesson: ShowcaseLesson }): JSX.Element => (
  <>
    <span className="flex h-lh items-center justify-center" data-slot="lesson-icon">
      <LessonIcon lesson={lesson} />
    </span>
    <span className="truncate font-medium text-foreground" data-slot="lesson-title">
      {lesson.title}
    </span>{" "}
    <LessonMeta className={cn(COMING_COLLAPSE, "col-start-2 flex-nowrap overflow-hidden")} lesson={lesson} />
  </>
)

const ShowcaseCourse = ({ course }: { readonly course: Course["showcase"][number] }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")
  const more = course.lessonCount - course.lessons.length

  return (
    <li className={COURSE_TILE}>
      <div className={COURSE_HEADER}>
        <div className={cn(COURSE_THUMBNAIL, COURSE_COVER)}>
          <CourseCover className="size-full" course={course} isDecorative sizes={THUMBNAIL_SIZES} />
        </div>
        <p className={cn(COURSE_KICKER, "truncate text-muted-foreground uppercase")}>
          {t(`kinds.${course.kind}`)} · {t(`levels.${course.level}`)}
        </p>
        <h4 className={COURSE_TITLE}>
          <Link
            className={cn(LINK_CLASSNAME, "line-clamp-2 text-balance text-foreground hover:text-ring lg:line-clamp-1")}
            params={{ course: course.slug }}
            to="/courses/$course"
          >
            {course.title}
          </Link>
        </h4>
        <CourseFacts
          className={cn(COURSE_FACTS, "flex-nowrap gap-x-4 overflow-hidden mask-r-from-85%")}
          course={{
            durationMs: course.durationMs,
            lessons: course.lessonCount,
            previews: course.previewCount,
            recorded: course.recordedCount,
          }}
        />
      </div>
      <ol className={COURSE_LESSONS}>
        {course.lessons.map((lesson) => (
          <li key={lesson.slug}>
            {lesson.recording && (
              <div className={COURSE_LESSON}>
                <LessonState lesson={lesson} />
              </div>
            )}
            {!lesson.recording && (
              <Link
                className={cn(LINK_CLASSNAME, COURSE_LESSON, "-mx-2 px-2 hover:bg-muted/40")}
                params={{ course: course.slug, lesson: lesson.slug }}
                to="/courses/$course/$lesson"
              >
                <LessonState lesson={lesson} />
              </Link>
            )}
          </li>
        ))}
      </ol>
      {more > 0 && (
        <Link
          className={cn(LINK_CLASSNAME, COURSE_MORE, "text-muted-foreground hover:text-foreground")}
          params={{ course: course.slug }}
          to="/courses/$course"
        >
          {t("more", { count: more })}
        </Link>
      )}
    </li>
  )
}

const ShowcaseCoursePending = (): JSX.Element => (
  <div className={COURSE_TILE}>
    <div className={COURSE_HEADER}>
      <Skeleton className={cn(COURSE_THUMBNAIL, COURSE_COVER)} />
      <Skeleton className={cn(COURSE_KICKER, "h-lh w-32 scale-y-70")} />
      <div className={cn(COURSE_TITLE, "flex flex-col")}>
        <Skeleton className="h-lh w-2/3 scale-y-70" />
        <Skeleton className="h-lh w-1/3 scale-y-70 lg:hidden" />
      </div>
      <Skeleton className={cn(COURSE_FACTS, "h-lh w-1/2 scale-y-70 text-spec")} />
    </div>
    <div className={COURSE_LESSONS}>
      {Array.from({ length: COURSE_SHOWCASE.LESSONS }, (_, lesson) => (
        <div className={COURSE_LESSON} key={lesson}>
          <Skeleton className="h-lh w-3 scale-y-30 justify-self-center" />
          <div className="flex min-w-0 flex-col">
            <Skeleton className="h-lh w-4/5 scale-y-70" />
            <Skeleton className="h-lh w-24 scale-y-70 text-spec" />
          </div>
        </div>
      ))}
    </div>
    <Skeleton className={cn(COURSE_MORE, "w-28 scale-y-70")} />
  </div>
)

const ShowcasePending = (): JSX.Element => (
  <div className={cn(COURSE_GRID, "max-md:*:not-first:hidden")}>
    {Array.from({ length: COURSE_SHOWCASE.COURSES }, (_, course) => (
      <ShowcaseCoursePending key={course} />
    ))}
  </div>
)

const ShowcaseMessage = ({ message }: { readonly message: "empty" | "error" }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  return <p className="col-start-1 row-start-1 flex items-center text-body text-pretty text-muted-foreground">{t(message)}</p>
}

const ShowcaseCourses = ({ courses }: { readonly courses: Course["showcase"] }): JSX.Element => {
  if (courses.length === 0) {
    return <ShowcaseMessage message="empty" />
  }

  return (
    <ul className={cn(COURSE_GRID, "col-start-1 row-start-1 self-start")}>
      {courses.map((course) => (
        <ShowcaseCourse course={course} key={course.id} />
      ))}
    </ul>
  )
}

export const CourseShowcase = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")
  const locale = getCurrentLocale()
  const article = useRef<HTMLElement>(null)
  const isNear = useInView(article, { margin: NEAR_VIEWPORT, once: true })

  const { data, isError } = useQuery({ ...courseShowcaseQuery({ locale }), enabled: isNear })

  return (
    <article
      ref={article}
      aria-busy={isNear && data === undefined && !isError}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="p-7 md:p-9">
        <h3 className="text-headline-support text-balance text-foreground">{t("title")}</h3>
        <p className="mt-3 max-w-[68ch] text-body text-pretty text-muted-foreground">{t("body")}</p>
      </div>

      <div className="grid gap-7 border-y border-border bg-background px-7 py-8 md:px-9 md:py-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
        <CourseTour />
        <div className="min-w-0">
          <p className="text-title text-balance text-foreground">{t("tour.title")}</p>
          <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground" id="course-tour-body">
            {t("tour.body")}
          </p>
        </div>
      </div>

      <div className="grid px-7 py-8 md:px-9 md:py-10">
        <div aria-hidden className={cn("col-start-1 row-start-1", { invisible: isError || data !== undefined })}>
          <ShowcasePending />
        </div>
        {isError && <ShowcaseMessage message="error" />}
        {data !== undefined && <ShowcaseCourses courses={data} />}
      </div>

      <div className="border-t border-border px-7 py-5 md:px-9">
        <Link
          className={cn(
            LINK_CLASSNAME,
            "group inline-flex items-center gap-2 text-body-sm font-medium text-foreground hover:text-muted-foreground",
          )}
          to={ROUTES.COURSES}
        >
          {t("browse")}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </article>
  )
}
